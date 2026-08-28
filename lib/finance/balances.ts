import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { transactions } from "@/db/schema";

/**
 * Saldo atual de uma conta é sempre derivado (nunca um contador guardado que
 * pode divergir): saldo inicial + soma assinada de todas as transações que
 * têm essa conta como `accountId` — receitas, despesas, as duas pontas de
 * transferência e ajustes já chegam com `direction` correta, então basta
 * somar.
 */
export async function computeAccountBalanceDeltaCents(
  accountId: string,
): Promise<number> {
  const [row] = await db
    .select({
      delta: sql<number>`coalesce(sum(case when ${transactions.direction} = 'inflow' then ${transactions.amountCents} else -${transactions.amountCents} end), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));

  return row?.delta ?? 0;
}

export async function computeAccountBalanceDeltasByUser(
  userId: string,
): Promise<Record<string, number>> {
  const rows = await db
    .select({
      accountId: transactions.accountId,
      delta: sql<number>`coalesce(sum(case when ${transactions.direction} = 'inflow' then ${transactions.amountCents} else -${transactions.amountCents} end), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .groupBy(transactions.accountId);

  return Object.fromEntries(rows.map((row) => [row.accountId, row.delta]));
}
