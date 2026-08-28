"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import {
  accounts,
  categories,
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
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(
      paymentMethods,
      eq(transactions.customPaymentMethodId, paymentMethods.id),
    )
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
  table: typeof accounts | typeof categories,
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

export async function saveIncome(input: IncomeFormInput) {
  const userId = await requireUserId();
  const parsed = incomeFormSchema.parse(input);

  await assertOwned(userId, accounts, parsed.accountId, "Conta");
  await assertOwned(userId, categories, parsed.categoryId, "Categoria");
  const method = await resolvePaymentMethod(userId, parsed.paymentMethodId);

  const values = {
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

export async function saveExpense(input: ExpenseFormInput) {
  const userId = await requireUserId();
  const parsed = expenseFormSchema.parse(input);

  await assertOwned(userId, accounts, parsed.accountId, "Conta");
  await assertOwned(userId, categories, parsed.categoryId, "Categoria");
  const method = await resolvePaymentMethod(userId, parsed.paymentMethodId);

  const values = {
    userId,
    accountId: parsed.accountId,
    categoryId: parsed.categoryId,
    type: "expense" as const,
    direction: "outflow" as const,
    paymentMethod: method.kind,
    customPaymentMethodId: method.id,
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
    })
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  if (!existing) {
    throw new Error("Lançamento não encontrado.");
  }

  if (existing.type === "transfer" && existing.transferGroupId) {
    await removeTransfer(userId, existing.transferGroupId);
  } else {
    await db
      .delete(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  }

  revalidatePath("/lancamentos");
  revalidatePath("/");
}
