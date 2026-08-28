"use server";

import { and, between, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, categories, paymentMethods, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth/guards";
import { reportFiltersSchema, type ReportFilters } from "@/lib/validation/reports";
import { localDateStringToUtcDate } from "@/lib/finance/dates";

function buildConditions(userId: string, filters: ReportFilters): SQL[] {
  const from = localDateStringToUtcDate(filters.from);
  const to = new Date(
    localDateStringToUtcDate(filters.to).getTime() + 24 * 60 * 60 * 1000 - 1,
  );

  const conditions = [
    eq(transactions.userId, userId),
    between(transactions.occurredAt, from, to),
  ];
  if (filters.accountId) conditions.push(eq(transactions.accountId, filters.accountId));
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.paymentMethodId) {
    conditions.push(eq(transactions.customPaymentMethodId, filters.paymentMethodId));
  }
  return conditions;
}

export async function queryReportTable(input: ReportFilters) {
  const userId = await requireUserId();
  const filters = reportFiltersSchema.parse(input);
  const conditions = buildConditions(userId, filters);

  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      direction: transactions.direction,
      amountCents: transactions.amountCents,
      occurredAt: transactions.occurredAt,
      description: transactions.description,
      accountName: accounts.name,
      categoryName: categories.name,
      paymentMethodName: paymentMethods.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(paymentMethods, eq(transactions.customPaymentMethodId, paymentMethods.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredAt))
    .limit(500);
}

export async function queryReportSpendByCategory(input: ReportFilters) {
  const userId = await requireUserId();
  const filters = reportFiltersSchema.parse(input);
  const conditions = buildConditions(userId, filters);
  conditions.push(eq(transactions.type, "expense"));

  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      totalCents: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(transactions.categoryId);

  const categoryIds = rows.map((r) => r.categoryId).filter((id): id is string => !!id);
  const categoryRows = categoryIds.length
    ? await db.select().from(categories).where(eq(categories.userId, userId))
    : [];
  const categoryById = new Map(categoryRows.map((c) => [c.id, c]));

  return rows
    .filter((r) => r.categoryId)
    .map((r) => ({
      categoryId: r.categoryId as string,
      categoryName: categoryById.get(r.categoryId as string)?.name ?? "Sem categoria",
      color: categoryById.get(r.categoryId as string)?.color ?? "#4A5568",
      totalCents: r.totalCents,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export async function queryReportIncomeExpenseByMonth(input: ReportFilters) {
  const userId = await requireUserId();
  const filters = reportFiltersSchema.parse(input);
  const conditions = buildConditions(userId, filters);

  const rows = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${transactions.occurredAt} / 1000, 'unixepoch')`,
      incomeCents: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountCents} else 0 end), 0)`,
      expenseCents: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountCents} else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(sql`strftime('%Y-%m', ${transactions.occurredAt} / 1000, 'unixepoch')`)
    .orderBy(sql`strftime('%Y-%m', ${transactions.occurredAt} / 1000, 'unixepoch')`);

  return rows;
}

/** Evolução do saldo consolidado (contas reais) ao fim de cada mês do período. */
export async function queryReportBalanceEvolution(input: ReportFilters) {
  const userId = await requireUserId();
  const filters = reportFiltersSchema.parse(input);

  const realAccounts = await db
    .select({ id: accounts.id, initialBalanceCents: accounts.initialBalanceCents })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isControlAccount, false)));

  const initialSum = realAccounts.reduce((sum, a) => sum + a.initialBalanceCents, 0);
  const accountIds = new Set(realAccounts.map((a) => a.id));

  const to = new Date(
    localDateStringToUtcDate(filters.to).getTime() + 24 * 60 * 60 * 1000 - 1,
  );

  const rows = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${transactions.occurredAt} / 1000, 'unixepoch')`,
      accountId: transactions.accountId,
      deltaCents: sql<number>`coalesce(sum(case when ${transactions.direction} = 'inflow' then ${transactions.amountCents} else -${transactions.amountCents} end), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), sql`${transactions.occurredAt} <= ${to.getTime()}`))
    .groupBy(sql`strftime('%Y-%m', ${transactions.occurredAt} / 1000, 'unixepoch')`, transactions.accountId)
    .orderBy(sql`strftime('%Y-%m', ${transactions.occurredAt} / 1000, 'unixepoch')`);

  const deltaByMonth = new Map<string, number>();
  for (const row of rows) {
    if (!accountIds.has(row.accountId)) continue;
    deltaByMonth.set(row.month, (deltaByMonth.get(row.month) ?? 0) + row.deltaCents);
  }

  const months = Array.from(deltaByMonth.keys()).sort();
  let running = initialSum;
  const points: { month: string; balanceCents: number }[] = [];
  for (const month of months) {
    running += deltaByMonth.get(month) ?? 0;
    if (month >= filters.from.slice(0, 7) && month <= filters.to.slice(0, 7)) {
      points.push({ month, balanceCents: running });
    }
  }
  return points;
}
