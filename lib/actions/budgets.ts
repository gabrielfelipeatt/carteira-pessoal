"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { budgets, categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth/guards";
import { budgetFormSchema, type BudgetFormInput } from "@/lib/validation/budgets";
import { parseBrlToCents } from "@/lib/finance/money";
import { monthRange } from "@/lib/finance/dates";
import { sumExpenseForCategories } from "@/lib/finance/aggregation";
import { resolveBudgetCategoryIds } from "@/lib/finance/budget-rollup";

export type BudgetStatus = "normal" | "atencao" | "acima";

function statusFor(consumedCents: number, limitCents: number): BudgetStatus {
  if (limitCents <= 0) return "normal";
  const ratio = consumedCents / limitCents;
  if (ratio > 1) return "acima";
  if (ratio >= 0.8) return "atencao";
  return "normal";
}

export async function listBudgets(yearMonth: string) {
  const userId = await requireUserId();
  const [year, month] = yearMonth.split("-").map(Number);

  const [rows, allCategories] = await Promise.all([
    db
      .select()
      .from(budgets)
      .where(
        and(eq(budgets.userId, userId), eq(budgets.year, year), eq(budgets.month, month)),
      ),
    db.select().from(categories).where(eq(categories.userId, userId)),
  ]);

  const { from, to } = monthRange(yearMonth);
  const categoryById = new Map(allCategories.map((c) => [c.id, c]));

  return Promise.all(
    rows.map(async (budget) => {
      const categoryIds = resolveBudgetCategoryIds(budget.categoryId, allCategories);
      const consumedCents = await sumExpenseForCategories(userId, categoryIds, from, to);
      return {
        ...budget,
        categoryName: categoryById.get(budget.categoryId)?.name ?? "Categoria removida",
        consumedCents,
        remainingCents: budget.limitCents - consumedCents,
        percentage: budget.limitCents > 0 ? consumedCents / budget.limitCents : 0,
        status: statusFor(consumedCents, budget.limitCents),
      };
    }),
  );
}

export async function saveBudget(input: BudgetFormInput) {
  const userId = await requireUserId();
  const parsed = budgetFormSchema.parse(input);

  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, parsed.categoryId), eq(categories.userId, userId)));
  if (!category) {
    throw new Error("Categoria inválida.");
  }

  const values = {
    userId,
    categoryId: parsed.categoryId,
    year: parsed.year,
    month: parsed.month,
    limitCents: parseBrlToCents(parsed.limit),
  };

  if (parsed.id) {
    const [existing] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(and(eq(budgets.id, parsed.id), eq(budgets.userId, userId)));
    if (!existing) {
      throw new Error("Orçamento não encontrado.");
    }
    await db
      .update(budgets)
      .set(values)
      .where(and(eq(budgets.id, parsed.id), eq(budgets.userId, userId)));
  } else {
    const [existingForMonth] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.categoryId, parsed.categoryId),
          eq(budgets.year, parsed.year),
          eq(budgets.month, parsed.month),
        ),
      );
    if (existingForMonth) {
      throw new Error("Já existe um orçamento para esta categoria neste mês.");
    }
    await db.insert(budgets).values(values);
  }

  revalidatePath("/orcamentos");
}

export async function removeBudget(budgetId: string) {
  const userId = await requireUserId();
  await db
    .delete(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)));
  revalidatePath("/orcamentos");
}
