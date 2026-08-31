"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { creditCardStatements, creditCards } from "@/db/schema";
import { requireUserId } from "@/lib/auth/guards";
import { computeEffectiveStatus, computeStatementOwedCents } from "@/lib/finance/statements";
import { listPendingFixedExpenseOccurrences } from "@/lib/actions/fixed-expenses";
import { sortReminders, type Reminder } from "@/lib/finance/reminders";

const DUE_SOON_THRESHOLD_DAYS = 5;

/**
 * Combina faturas a vencer/vencidas de todos os cartões com as ocorrências
 * de lançamento fixo pendentes — mesmos dados já existentes, sem tabela
 * nova. Nunca inclui fatura já paga (nada a avisar).
 */
export async function listReminders(): Promise<Reminder[]> {
  const userId = await requireUserId();

  const [statementRows, pendingOccurrences] = await Promise.all([
    db
      .select({
        id: creditCardStatements.id,
        status: creditCardStatements.status,
        dueDate: creditCardStatements.dueDate,
        totalCents: creditCardStatements.totalCents,
        cardId: creditCardStatements.creditCardId,
        cardNickname: creditCards.nickname,
      })
      .from(creditCardStatements)
      .innerJoin(creditCards, eq(creditCardStatements.creditCardId, creditCards.id))
      .where(
        and(eq(creditCardStatements.userId, userId), ne(creditCardStatements.status, "paid")),
      ),
    listPendingFixedExpenseOccurrences(),
  ]);

  const now = Date.now();
  const statementReminders = (
    await Promise.all(
      statementRows.map(async (row): Promise<Reminder | null> => {
        const dueInDays = Math.ceil((row.dueDate.getTime() - now) / (24 * 60 * 60 * 1000));
        if (dueInDays > DUE_SOON_THRESHOLD_DAYS) return null;

        const owedCents = await computeStatementOwedCents(row);
        if (owedCents <= 0) return null;

        return {
          kind: "statement",
          cardId: row.cardId,
          cardNickname: row.cardNickname,
          statementId: row.id,
          dueDate: row.dueDate,
          dueInDays,
          owedCents,
          effectiveStatus: computeEffectiveStatus(row) as "open" | "closed" | "overdue",
        };
      }),
    )
  ).filter((r): r is Reminder => r !== null);

  const occurrenceReminders: Reminder[] = pendingOccurrences.map((o) => ({
    kind: "fixed-occurrence",
    type: o.type,
    fixedExpenseId: o.fixedExpenseId,
    description: o.description,
    competencia: o.competencia,
    suggestedAmountCents: o.suggestedAmountCents,
  }));

  return sortReminders([...statementReminders, ...occurrenceReminders]);
}
