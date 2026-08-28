"use server";

import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import {
  accounts,
  categories,
  creditCards,
  fixedExpenseSkips,
  fixedExpenses,
  paymentMethods,
  transactions,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth/guards";
import {
  fixedExpenseFormSchema,
  type FixedExpenseFormInput,
} from "@/lib/validation/fixed-expenses";
import { parseBrlToCents } from "@/lib/finance/money";
import { currentYearMonth } from "@/lib/finance/dates";
import {
  computePendingCompetencias,
  resolveOccurrenceDateString,
} from "@/lib/finance/fixed-expenses";

export async function listFixedExpenses() {
  const userId = await requireUserId();

  const [rows, allCategories] = await Promise.all([
    db
      .select()
      .from(fixedExpenses)
      .where(eq(fixedExpenses.userId, userId))
      .orderBy(desc(fixedExpenses.isActive), fixedExpenses.description),
    db.select().from(categories).where(eq(categories.userId, userId)),
  ]);

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));

  return rows.map((row) => ({
    ...row,
    categoryName: categoryById.get(row.categoryId)?.name ?? "Categoria removida",
  }));
}

export async function saveFixedExpense(input: FixedExpenseFormInput) {
  const userId = await requireUserId();
  const parsed = fixedExpenseFormSchema.parse(input);

  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, parsed.categoryId), eq(categories.userId, userId)));
  if (!category) {
    throw new Error("Categoria inválida.");
  }

  const [method] = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(
      and(eq(paymentMethods.id, parsed.paymentMethodId), eq(paymentMethods.userId, userId)),
    );
  if (!method) {
    throw new Error("Forma de pagamento inválida.");
  }

  let creditCardId: string | null = null;
  let accountId: string | null = null;

  if (parsed.isCredit) {
    if (!parsed.creditCardId) throw new Error("Selecione um cartão.");
    const [card] = await db
      .select({ id: creditCards.id })
      .from(creditCards)
      .where(and(eq(creditCards.id, parsed.creditCardId), eq(creditCards.userId, userId)));
    if (!card) throw new Error("Cartão inválido.");
    creditCardId = parsed.creditCardId;
  } else {
    if (!parsed.accountId) throw new Error("Selecione uma conta.");
    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, parsed.accountId), eq(accounts.userId, userId)));
    if (!account) throw new Error("Conta inválida.");
    accountId = parsed.accountId;
  }

  const values = {
    userId,
    description: parsed.description,
    categoryId: parsed.categoryId,
    amountCents: parseBrlToCents(parsed.amount),
    dayOfMonth: parsed.dayOfMonth,
    paymentMethodId: parsed.paymentMethodId,
    creditCardId,
    accountId,
    startMonth: parsed.startMonth,
    endMonth: parsed.endMonth || null,
    isActive: parsed.isActive,
    notes: parsed.notes || null,
  };

  if (parsed.id) {
    const [existing] = await db
      .select({ id: fixedExpenses.id })
      .from(fixedExpenses)
      .where(and(eq(fixedExpenses.id, parsed.id), eq(fixedExpenses.userId, userId)));
    if (!existing) {
      throw new Error("Despesa fixa não encontrada.");
    }
    await db
      .update(fixedExpenses)
      .set(values)
      .where(and(eq(fixedExpenses.id, parsed.id), eq(fixedExpenses.userId, userId)));
  } else {
    await db.insert(fixedExpenses).values(values);
  }

  revalidatePath("/despesas-fixas");
  revalidatePath("/lancamentos");
}

export async function removeFixedExpense(fixedExpenseId: string) {
  const userId = await requireUserId();

  const [existing] = await db
    .select({ id: fixedExpenses.id })
    .from(fixedExpenses)
    .where(and(eq(fixedExpenses.id, fixedExpenseId), eq(fixedExpenses.userId, userId)));
  if (!existing) {
    throw new Error("Despesa fixa não encontrada.");
  }

  const [linkedTransaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.fixedExpenseId, fixedExpenseId))
    .limit(1);
  if (linkedTransaction) {
    throw new Error(
      "Esta despesa fixa já tem lançamentos gerados e não pode ser removida. Você pode desativá-la em vez disso.",
    );
  }

  await db
    .delete(fixedExpenses)
    .where(and(eq(fixedExpenses.id, fixedExpenseId), eq(fixedExpenses.userId, userId)));

  revalidatePath("/despesas-fixas");
  revalidatePath("/lancamentos");
}

export async function listPendingFixedExpenseOccurrences() {
  const userId = await requireUserId();
  const uptoMonth = currentYearMonth();

  const [templates, allCategories] = await Promise.all([
    db
      .select()
      .from(fixedExpenses)
      .where(and(eq(fixedExpenses.userId, userId), eq(fixedExpenses.isActive, true))),
    db.select().from(categories).where(eq(categories.userId, userId)),
  ]);

  if (templates.length === 0) {
    return [];
  }

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));
  const templateIds = templates.map((t) => t.id);

  const [generatedRows, skippedRows] = await Promise.all([
    db
      .select({
        fixedExpenseId: transactions.fixedExpenseId,
        competencia: transactions.competencia,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.fixedExpenseId, templateIds),
          isNotNull(transactions.competencia),
        ),
      ),
    db
      .select({
        fixedExpenseId: fixedExpenseSkips.fixedExpenseId,
        competencia: fixedExpenseSkips.competencia,
      })
      .from(fixedExpenseSkips)
      .where(inArray(fixedExpenseSkips.fixedExpenseId, templateIds)),
  ]);

  const generatedByTemplate = new Map<string, Set<string>>();
  for (const row of generatedRows) {
    if (!row.fixedExpenseId || !row.competencia) continue;
    const set = generatedByTemplate.get(row.fixedExpenseId) ?? new Set<string>();
    set.add(row.competencia);
    generatedByTemplate.set(row.fixedExpenseId, set);
  }

  const skippedByTemplate = new Map<string, Set<string>>();
  for (const row of skippedRows) {
    const set = skippedByTemplate.get(row.fixedExpenseId) ?? new Set<string>();
    set.add(row.competencia);
    skippedByTemplate.set(row.fixedExpenseId, set);
  }

  const occurrences = templates.flatMap((template) => {
    const pending = computePendingCompetencias(
      template.startMonth,
      template.endMonth,
      uptoMonth,
      generatedByTemplate.get(template.id) ?? new Set(),
      skippedByTemplate.get(template.id) ?? new Set(),
    );

    return pending.map((competencia) => ({
      fixedExpenseId: template.id,
      description: template.description,
      categoryId: template.categoryId,
      categoryName: categoryById.get(template.categoryId)?.name ?? "Categoria removida",
      suggestedAmountCents: template.amountCents,
      paymentMethodId: template.paymentMethodId,
      creditCardId: template.creditCardId,
      accountId: template.accountId,
      competencia,
      occurrenceDateString: resolveOccurrenceDateString(competencia, template.dayOfMonth),
    }));
  });

  return occurrences.sort((a, b) =>
    a.competencia === b.competencia
      ? a.description.localeCompare(b.description, "pt-BR")
      : a.competencia.localeCompare(b.competencia),
  );
}

export async function skipFixedExpenseOccurrence(
  fixedExpenseId: string,
  competencia: string,
) {
  const userId = await requireUserId();

  const [existing] = await db
    .select({ id: fixedExpenses.id })
    .from(fixedExpenses)
    .where(and(eq(fixedExpenses.id, fixedExpenseId), eq(fixedExpenses.userId, userId)));
  if (!existing) {
    throw new Error("Despesa fixa não encontrada.");
  }

  const [alreadyGenerated] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.fixedExpenseId, fixedExpenseId),
        eq(transactions.competencia, competencia),
      ),
    );
  if (alreadyGenerated) {
    throw new Error("Esta competência já foi lançada.");
  }

  const [alreadySkipped] = await db
    .select({ id: fixedExpenseSkips.id })
    .from(fixedExpenseSkips)
    .where(
      and(
        eq(fixedExpenseSkips.fixedExpenseId, fixedExpenseId),
        eq(fixedExpenseSkips.competencia, competencia),
      ),
    );
  if (alreadySkipped) {
    throw new Error("Esta competência já foi dispensada.");
  }

  await db.insert(fixedExpenseSkips).values({ userId, fixedExpenseId, competencia });

  revalidatePath("/despesas-fixas");
  revalidatePath("/lancamentos");
}
