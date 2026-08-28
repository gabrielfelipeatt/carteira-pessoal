"use server";

import { requireUserId } from "@/lib/auth/guards";
import { listAccounts } from "@/lib/actions/accounts";
import { listTransactions } from "@/lib/actions/transactions";
import { db } from "@/lib/db/client";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { monthRange, previousYearMonth, currentYearMonth } from "@/lib/finance/dates";
import { sumIncomeAndExpense, sumExpenseByCategory } from "@/lib/finance/aggregation";

export async function getDashboardMonth(yearMonth: string = currentYearMonth()) {
  const userId = await requireUserId();

  const { from, to } = monthRange(yearMonth);
  const previous = previousYearMonth(yearMonth);
  const previousRange = monthRange(previous);

  const [accounts, current, previousTotals, spendRows, allCategories, recentTransactions] =
    await Promise.all([
      listAccounts(),
      sumIncomeAndExpense(userId, from, to),
      sumIncomeAndExpense(userId, previousRange.from, previousRange.to),
      sumExpenseByCategory(userId, from, to),
      db.select().from(categories).where(eq(categories.userId, userId)),
      listTransactions(),
    ]);

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));
  const spendByCategory = spendRows
    .map((row) => ({
      categoryId: row.categoryId,
      categoryName: categoryById.get(row.categoryId)?.name ?? "Sem categoria",
      color: categoryById.get(row.categoryId)?.color ?? "#4A5568",
      totalCents: row.totalCents,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  const consolidatedBalanceCents = accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + a.currentBalanceCents, 0);

  return {
    yearMonth,
    consolidatedBalanceCents,
    accounts,
    incomeCents: current.incomeCents,
    expenseCents: current.expenseCents,
    resultCents: current.incomeCents - current.expenseCents,
    previousMonth: {
      yearMonth: previous,
      incomeCents: previousTotals.incomeCents,
      expenseCents: previousTotals.expenseCents,
      resultCents: previousTotals.incomeCents - previousTotals.expenseCents,
    },
    spendByCategory,
    recentTransactions: recentTransactions.slice(0, 5),
  };
}
