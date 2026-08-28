"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { accounts, creditCardStatements, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth/guards";
import { parseBrlToCents } from "@/lib/finance/money";
import {
  closeStatement as closeStatementLogic,
  computeEffectiveStatus,
  computeStatementOwedCents,
  payStatement as payStatementLogic,
} from "@/lib/finance/statements";

export async function listStatementsForCard(creditCardId: string) {
  const userId = await requireUserId();

  const rows = await db
    .select()
    .from(creditCardStatements)
    .where(
      and(
        eq(creditCardStatements.creditCardId, creditCardId),
        eq(creditCardStatements.userId, userId),
      ),
    )
    .orderBy(desc(creditCardStatements.referenceMonth));

  return Promise.all(
    rows.map(async (statement) => ({
      ...statement,
      effectiveStatus: computeEffectiveStatus(statement),
      // Para fatura aberta, `totalCents` fica em 0 até o fechamento — o
      // "quanto devo" precisa ser calculado em tempo real a partir das
      // compras já lançadas no ciclo.
      owedCents: await computeStatementOwedCents(statement),
    })),
  );
}

export async function listStatementTransactions(statementId: string) {
  const userId = await requireUserId();

  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      amountCents: transactions.amountCents,
      occurredAt: transactions.occurredAt,
      description: transactions.description,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.statementId, statementId),
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
      ),
    )
    .orderBy(desc(transactions.occurredAt));
}

export async function closeStatementAction(statementId: string) {
  const userId = await requireUserId();
  await closeStatementLogic(userId, statementId);
  revalidatePath("/cartoes");
}

export async function payStatementAction(input: {
  statementId: string;
  amount: string;
  payingAccountId: string;
}) {
  const userId = await requireUserId();

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, input.payingAccountId), eq(accounts.userId, userId)));
  if (!account) {
    throw new Error("Conta inválida.");
  }

  await payStatementLogic(
    userId,
    input.statementId,
    parseBrlToCents(input.amount),
    input.payingAccountId,
  );

  revalidatePath("/cartoes");
  revalidatePath("/lancamentos");
  revalidatePath("/");
}
