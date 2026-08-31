"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import {
  accounts,
  categories,
  creditCardStatements,
  creditCards,
  fixedExpenseSkips,
  fixedExpenses,
  goals,
  paymentMethods,
  transactions,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth/guards";
import {
  adjustmentFormSchema,
  expenseFormSchema,
  incomeFormSchema,
  transferFormSchema,
  type AdjustmentFormInput,
  type ExpenseFormInput,
  type IncomeFormInput,
  type TransferFormInput,
} from "@/lib/validation/transactions";
import { parseBrlToCents } from "@/lib/finance/money";
import { localDateStringToUtcDate } from "@/lib/finance/dates";
import { createTransfer, removeTransfer, updateTransfer } from "@/lib/finance/transfers";
import { resolveStatementForPurchase } from "@/lib/finance/statements";
import { resolveInstallmentDates, splitIntoInstallments } from "@/lib/finance/installments";

export async function listTransactions() {
  const userId = await requireUserId();

  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      direction: transactions.direction,
      amountCents: transactions.amountCents,
      occurredAt: transactions.occurredAt,
      description: transactions.description,
      notes: transactions.notes,
      transferGroupId: transactions.transferGroupId,
      accountId: transactions.accountId,
      accountName: accounts.name,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      paymentMethodId: transactions.customPaymentMethodId,
      paymentMethodName: paymentMethods.name,
      creditCardId: transactions.creditCardId,
      creditCardNickname: creditCards.nickname,
      statementId: transactions.statementId,
      installmentNumber: transactions.installmentNumber,
      installmentTotal: transactions.installmentTotal,
      goalId: transactions.goalId,
      goalName: goals.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(
      paymentMethods,
      eq(transactions.customPaymentMethodId, paymentMethods.id),
    )
    .leftJoin(creditCards, eq(transactions.creditCardId, creditCards.id))
    .leftJoin(goals, eq(transactions.goalId, goals.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.occurredAt))
    .limit(50);
}

async function resolvePaymentMethod(userId: string, paymentMethodId: string) {
  const [method] = await db
    .select({ id: paymentMethods.id, kind: paymentMethods.kind })
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.id, paymentMethodId),
        eq(paymentMethods.userId, userId),
      ),
    );
  if (!method) {
    throw new Error("Forma de pagamento inválida.");
  }
  return method;
}

async function assertOwned(
  userId: string,
  table: typeof accounts | typeof categories | typeof fixedExpenses,
  id: string,
  label: string,
) {
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.userId, userId)));
  if (!row) {
    throw new Error(`${label} inválida.`);
  }
}

/**
 * Uma compra vinculada a uma fatura já fechada é imutável — o usuário
 * precisa editar/remover pelo fluxo de fatura, não pelo lançamento solto.
 */
async function assertTransactionNotOnClosedStatement(
  userId: string,
  transactionId: string,
) {
  const [existing] = await db
    .select({ statementId: transactions.statementId })
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  if (!existing?.statementId) return;

  const [statement] = await db
    .select({ status: creditCardStatements.status })
    .from(creditCardStatements)
    .where(eq(creditCardStatements.id, existing.statementId));

  if (statement && statement.status !== "open") {
    throw new Error(
      "Esta compra pertence a uma fatura já fechada e não pode ser editada ou removida.",
    );
  }
}

async function resolveCreditCardExpenseAccount(
  userId: string,
  creditCardId: string,
  occurredAt: Date,
) {
  const [card] = await db
    .select({ controlAccountId: creditCards.controlAccountId })
    .from(creditCards)
    .where(and(eq(creditCards.id, creditCardId), eq(creditCards.userId, userId)));
  if (!card?.controlAccountId) {
    throw new Error("Cartão inválido.");
  }
  const statementId = await resolveStatementForPurchase(userId, creditCardId, occurredAt);
  return { accountId: card.controlAccountId, statementId };
}

export async function saveIncome(input: IncomeFormInput) {
  const userId = await requireUserId();
  const parsed = incomeFormSchema.parse(input);

  await assertOwned(userId, accounts, parsed.accountId, "Conta");
  await assertOwned(userId, categories, parsed.categoryId, "Categoria");
  const method = await resolvePaymentMethod(userId, parsed.paymentMethodId);

  const baseValues = {
    userId,
    accountId: parsed.accountId,
    categoryId: parsed.categoryId,
    type: "income" as const,
    direction: "inflow" as const,
    paymentMethod: method.kind,
    customPaymentMethodId: method.id,
    amountCents: parseBrlToCents(parsed.amount),
    occurredAt: localDateStringToUtcDate(parsed.date),
    description: parsed.description,
    notes: parsed.notes || null,
  };

  if (parsed.id) {
    // Nunca toca fixedExpenseId/competencia numa edição — a proveniência de
    // um lançamento gerado por receita fixa sobrevive a edições normais.
    await db
      .update(transactions)
      .set(baseValues)
      .where(and(eq(transactions.id, parsed.id), eq(transactions.userId, userId)));
  } else if (parsed.fixedExpenseId && parsed.competencia) {
    await assertFixedExpenseOccurrencePending(
      userId,
      parsed.fixedExpenseId,
      parsed.competencia,
    );
    await db.insert(transactions).values({
      ...baseValues,
      fixedExpenseId: parsed.fixedExpenseId,
      competencia: parsed.competencia,
    });
  } else {
    await db.insert(transactions).values(baseValues);
  }

  revalidatePath("/lancamentos");
  revalidatePath("/despesas-fixas");
  revalidatePath("/");
}

export async function saveExpense(input: ExpenseFormInput) {
  const userId = await requireUserId();
  const parsed = expenseFormSchema.parse(input);

  await assertOwned(userId, categories, parsed.categoryId, "Categoria");
  const method = await resolvePaymentMethod(userId, parsed.paymentMethodId);
  const occurredAt = localDateStringToUtcDate(parsed.date);

  if (parsed.id) {
    await assertTransactionNotOnClosedStatement(userId, parsed.id);
  }

  // Parcelamento é só pra compra nova — nunca uma edição retroativa vira
  // várias linhas. Gera N transações independentes (uma por fatura
  // futura) em vez de uma só com o valor total.
  if (!parsed.id && parsed.installmentCount && parsed.installmentCount > 1) {
    if (!parsed.isCredit || !parsed.creditCardId) {
      throw new Error("Parcelamento só é possível numa compra no cartão de crédito.");
    }
    await saveInstallmentPurchase(userId, parsed, method, parsed.creditCardId);
    revalidatePath("/lancamentos");
    revalidatePath("/cartoes");
    revalidatePath("/");
    return;
  }

  let accountId: string;
  let statementId: string | null;
  let creditCardId: string | null;

  if (parsed.isCredit && parsed.creditCardId) {
    const resolved = await resolveCreditCardExpenseAccount(
      userId,
      parsed.creditCardId,
      occurredAt,
    );
    accountId = resolved.accountId;
    statementId = resolved.statementId;
    creditCardId = parsed.creditCardId;
  } else {
    if (!parsed.accountId) throw new Error("Selecione uma conta.");
    await assertOwned(userId, accounts, parsed.accountId, "Conta");
    accountId = parsed.accountId;
    statementId = null;
    creditCardId = null;
  }

  const baseValues = {
    userId,
    accountId,
    categoryId: parsed.categoryId,
    creditCardId,
    statementId,
    type: "expense" as const,
    direction: "outflow" as const,
    paymentMethod: method.kind,
    customPaymentMethodId: method.id,
    amountCents: parseBrlToCents(parsed.amount),
    occurredAt,
    description: parsed.description,
    notes: parsed.notes || null,
  };

  if (parsed.id) {
    // Nunca toca fixedExpenseId/competencia numa edição — a proveniência de
    // um lançamento gerado por despesa fixa sobrevive a edições normais.
    await db
      .update(transactions)
      .set(baseValues)
      .where(and(eq(transactions.id, parsed.id), eq(transactions.userId, userId)));
  } else if (parsed.fixedExpenseId && parsed.competencia) {
    await assertFixedExpenseOccurrencePending(
      userId,
      parsed.fixedExpenseId,
      parsed.competencia,
    );
    await db.insert(transactions).values({
      ...baseValues,
      fixedExpenseId: parsed.fixedExpenseId,
      competencia: parsed.competencia,
    });
  } else {
    await db.insert(transactions).values(baseValues);
  }

  revalidatePath("/lancamentos");
  revalidatePath("/cartoes");
  revalidatePath("/despesas-fixas");
  revalidatePath("/");
}

/**
 * Gera as N parcelas de uma compra parcelada no cartão — uma transação
 * independente por parcela, cada uma na fatura do seu próprio ciclo
 * futuro (`resolveCreditCardExpenseAccount` já cria a fatura sob demanda,
 * exatamente como faz para uma compra normal). Deliberadamente **não**
 * envolve tudo num único `db.transaction(...)`: `resolveCreditCardExpenseAccount`/
 * `resolveStatementForPurchase` operam sobre o `db` do módulo, não um
 * `tx` passado por parâmetro — misturar as duas coisas dentro de uma
 * transação arriscaria comportamento inconsistente no driver do libSQL.
 * Isso replica exatamente o mesmo padrão (não-transacional) já usado
 * para uma compra única no crédito logo acima.
 */
async function saveInstallmentPurchase(
  userId: string,
  parsed: ExpenseFormInput,
  method: Awaited<ReturnType<typeof resolvePaymentMethod>>,
  creditCardId: string,
) {
  const count = parsed.installmentCount;
  if (!count) return;

  const totalCents = parseBrlToCents(parsed.amount);
  const amounts = splitIntoInstallments(totalCents, count);
  const dates = resolveInstallmentDates(parsed.date, count);
  const installmentGroupId = crypto.randomUUID();

  for (let i = 0; i < count; i++) {
    const occurredAt = localDateStringToUtcDate(dates[i]);
    const resolved = await resolveCreditCardExpenseAccount(userId, creditCardId, occurredAt);

    await db.insert(transactions).values({
      userId,
      accountId: resolved.accountId,
      categoryId: parsed.categoryId,
      creditCardId,
      statementId: resolved.statementId,
      type: "expense",
      direction: "outflow",
      paymentMethod: method.kind,
      customPaymentMethodId: method.id,
      amountCents: amounts[i],
      occurredAt,
      description: `${parsed.description} (${i + 1}/${count})`,
      notes: parsed.notes || null,
      installmentGroupId,
      installmentNumber: i + 1,
      installmentTotal: count,
    });
  }
}

/**
 * Confirma que a competência de um lançamento fixo (receita ou despesa)
 * ainda está pendente (modelo do usuário, não gerada, não dispensada) —
 * defesa contra duplo-clique/corrida na confirmação de uma ocorrência.
 */
async function assertFixedExpenseOccurrencePending(
  userId: string,
  fixedExpenseId: string,
  competencia: string,
) {
  await assertOwned(userId, fixedExpenses, fixedExpenseId, "Despesa fixa");

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
}

export async function saveAdjustment(input: AdjustmentFormInput) {
  const userId = await requireUserId();
  const parsed = adjustmentFormSchema.parse(input);

  await assertOwned(userId, accounts, parsed.accountId, "Conta");

  const values = {
    userId,
    accountId: parsed.accountId,
    categoryId: null,
    type: "adjustment" as const,
    direction: parsed.direction,
    paymentMethod: null,
    customPaymentMethodId: null,
    amountCents: parseBrlToCents(parsed.amount),
    occurredAt: localDateStringToUtcDate(parsed.date),
    description: parsed.description,
    notes: parsed.notes || null,
  };

  if (parsed.id) {
    await db
      .update(transactions)
      .set(values)
      .where(and(eq(transactions.id, parsed.id), eq(transactions.userId, userId)));
  } else {
    await db.insert(transactions).values(values);
  }

  revalidatePath("/lancamentos");
  revalidatePath("/");
}

export async function saveTransfer(input: TransferFormInput) {
  const userId = await requireUserId();
  const parsed = transferFormSchema.parse(input);
  const method = await resolvePaymentMethod(userId, parsed.paymentMethodId);

  const shared = {
    userId,
    originAccountId: parsed.originAccountId,
    destinationAccountId: parsed.destinationAccountId,
    amountCents: parseBrlToCents(parsed.amount),
    occurredAt: localDateStringToUtcDate(parsed.date),
    description: parsed.description,
    notes: parsed.notes || null,
    paymentMethod: method.kind,
    customPaymentMethodId: method.id,
  };

  if (parsed.id) {
    await updateTransfer(parsed.id, shared);
  } else {
    await createTransfer(shared);
  }

  revalidatePath("/lancamentos");
  revalidatePath("/");
}

export async function removeTransaction(transactionId: string) {
  const userId = await requireUserId();

  const [existing] = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      transferGroupId: transactions.transferGroupId,
      statementId: transactions.statementId,
    })
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  if (!existing) {
    throw new Error("Lançamento não encontrado.");
  }

  if (existing.statementId && !existing.transferGroupId) {
    // Compra no crédito (bloqueada se a fatura já fechou) ou pagamento de
    // fatura (nunca removido por aqui — gerencie pela tela do cartão).
    if (existing.type === "transfer") {
      throw new Error(
        "Pagamentos de fatura não podem ser removidos pelos lançamentos — gerencie pela tela do cartão.",
      );
    }
    await assertTransactionNotOnClosedStatement(userId, transactionId);
  }

  if (existing.type === "transfer" && existing.transferGroupId) {
    await removeTransfer(userId, existing.transferGroupId);
  } else {
    await db
      .delete(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  }

  revalidatePath("/lancamentos");
  revalidatePath("/cartoes");
  revalidatePath("/");
}
