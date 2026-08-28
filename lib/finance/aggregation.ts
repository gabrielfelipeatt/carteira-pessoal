import { and, between, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { transactions } from "@/db/schema";

/**
 * Única implementação da regra "sem dupla contagem": transferências entre
 * contas próprias (inclui pagamento de fatura, que é sempre `type:'transfer'`)
 * e ajustes de saldo nunca contam como entrada/saída real — só receitas e
 * despesas são "atividade econômica". Reaproveitada por dashboard,
 * relatórios e orçamentos para não haver três implementações divergentes
 * da mesma regra.
 */

export async function sumIncomeAndExpense(
  userId: string,
  from: Date,
  to: Date,
) {
  const [row] = await db
    .select({
      incomeCents: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountCents} else 0 end), 0)`,
      expenseCents: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountCents} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        between(transactions.occurredAt, from, to),
      ),
    );

  return {
    incomeCents: row?.incomeCents ?? 0,
    expenseCents: row?.expenseCents ?? 0,
  };
}

export async function sumExpenseByCategory(userId: string, from: Date, to: Date) {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      totalCents: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        between(transactions.occurredAt, from, to),
      ),
    )
    .groupBy(transactions.categoryId);

  return rows.filter((row): row is { categoryId: string; totalCents: number } =>
    row.categoryId !== null,
  );
}

/** Soma de despesas de um conjunto de categorias num período — usado pelo rollup de orçamento. */
export async function sumExpenseForCategories(
  userId: string,
  categoryIds: string[],
  from: Date,
  to: Date,
) {
  if (categoryIds.length === 0) return 0;

  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      totalCents: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        between(transactions.occurredAt, from, to),
      ),
    )
    .groupBy(transactions.categoryId);

  const idSet = new Set(categoryIds);
  return rows
    .filter((row) => row.categoryId && idSet.has(row.categoryId))
    .reduce((sum, row) => sum + row.totalCents, 0);
}
