import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { creditCards, creditCardStatements, transactions } from "@/db/schema";
import { resolveCycleForDate } from "@/lib/finance/statement-cycle";
import { localDateStringToUtcDate } from "@/lib/finance/dates";

export class StatementIntegrityError extends Error {}

/**
 * `resolveCycleForDate` é puro e trabalha em termos de dia-de-calendário via
 * UTC (para ser testável sem depender de fuso horário). Antes de persistir,
 * reinterpretamos esse dia como meia-noite no fuso do usuário — a mesma
 * convenção usada por `localDateStringToUtcDate` para `occurredAt` — senão a
 * data exibida fica um dia adiantada/atrasada dependendo do fuso.
 */
function toStorageDate(pureCalendarDate: Date): Date {
  const isoDate = [
    pureCalendarDate.getUTCFullYear(),
    String(pureCalendarDate.getUTCMonth() + 1).padStart(2, "0"),
    String(pureCalendarDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
  return localDateStringToUtcDate(isoDate);
}

/** Status "overdue" é sempre derivado na leitura — nunca armazenado como tal. */
export function computeEffectiveStatus(statement: {
  status: string;
  dueDate: Date;
}): "open" | "closed" | "overdue" | "paid" {
  if (statement.status === "closed" && new Date() > statement.dueDate) {
    return "overdue";
  }
  return statement.status as "open" | "closed" | "paid";
}

async function loadOwnedCard(userId: string, creditCardId: string) {
  const [card] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, creditCardId), eq(creditCards.userId, userId)));
  if (!card) {
    throw new StatementIntegrityError("Cartão não encontrado.");
  }
  return card;
}

/**
 * Resolve (ou cria) a fatura à qual uma compra pertence. Rejeita a compra se
 * a fatura já estiver fechada ou paga — nunca reabre uma fatura fechada
 * silenciosamente.
 */
export async function resolveStatementForPurchase(
  userId: string,
  creditCardId: string,
  occurredAt: Date,
) {
  const card = await loadOwnedCard(userId, creditCardId);
  const cycle = resolveCycleForDate(occurredAt, card.closingDay, card.dueDay);

  const [existing] = await db
    .select()
    .from(creditCardStatements)
    .where(
      and(
        eq(creditCardStatements.creditCardId, creditCardId),
        eq(creditCardStatements.referenceMonth, cycle.referenceMonth),
      ),
    );

  if (existing) {
    if (existing.status !== "open") {
      throw new StatementIntegrityError(
        "A fatura desse período já está fechada. Escolha uma data no ciclo aberto ou registre um ajuste manual.",
      );
    }
    return existing.id;
  }

  try {
    const [created] = await db
      .insert(creditCardStatements)
      .values({
        userId,
        creditCardId,
        referenceMonth: cycle.referenceMonth,
        periodStart: toStorageDate(cycle.periodStart),
        periodEnd: toStorageDate(cycle.periodEnd),
        dueDate: toStorageDate(cycle.dueDate),
        status: "open",
        totalCents: 0,
        paidCents: 0,
      })
      .returning({ id: creditCardStatements.id });
    return created.id;
  } catch {
    // Corrida: outra chamada criou a fatura entre o select e o insert —
    // o índice único (creditCardId, referenceMonth) barrou a duplicata.
    const [raced] = await db
      .select({ id: creditCardStatements.id })
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.creditCardId, creditCardId),
          eq(creditCardStatements.referenceMonth, cycle.referenceMonth),
        ),
      );
    if (!raced) throw new StatementIntegrityError("Não foi possível resolver a fatura.");
    return raced.id;
  }
}

async function assertOwnedStatement(userId: string, statementId: string) {
  const [statement] = await db
    .select()
    .from(creditCardStatements)
    .where(
      and(
        eq(creditCardStatements.id, statementId),
        eq(creditCardStatements.userId, userId),
      ),
    );
  if (!statement) {
    throw new StatementIntegrityError("Fatura não encontrada.");
  }
  return statement;
}

/** Fechamento é sempre uma ação explícita do usuário — nunca automático. */
export async function closeStatement(userId: string, statementId: string) {
  const statement = await assertOwnedStatement(userId, statementId);
  if (statement.status !== "open") {
    throw new StatementIntegrityError("Esta fatura já está fechada.");
  }

  const [{ total }] = await db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.statementId, statementId));

  await db
    .update(creditCardStatements)
    .set({ status: "closed", closedAt: new Date(), totalCents: total })
    .where(eq(creditCardStatements.id, statementId));
}

/**
 * Registra um pagamento (total ou parcial) de fatura — sempre uma
 * transferência (`type: 'transfer'`), nunca uma nova despesa. É assim,
 * estruturalmente, que "pagar fatura ≠ nova despesa" é garantido.
 */
export async function payStatement(
  userId: string,
  statementId: string,
  amountCents: number,
  payingAccountId: string,
) {
  if (amountCents <= 0) {
    throw new StatementIntegrityError("O valor do pagamento deve ser positivo.");
  }

  await db.transaction(async (tx) => {
    const [statement] = await tx
      .select()
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.id, statementId),
          eq(creditCardStatements.userId, userId),
        ),
      );
    if (!statement) {
      throw new StatementIntegrityError("Fatura não encontrada.");
    }
    if (statement.status === "open") {
      throw new StatementIntegrityError(
        "Feche a fatura antes de registrar um pagamento.",
      );
    }
    if (statement.status === "paid") {
      throw new StatementIntegrityError("Esta fatura já está paga.");
    }

    const remaining = statement.totalCents - statement.paidCents;
    if (amountCents > remaining) {
      throw new StatementIntegrityError(
        "O valor do pagamento não pode ser maior que o saldo restante da fatura.",
      );
    }

    const [account] = await tx
      .select({ id: creditCards.id })
      .from(creditCards)
      .where(
        and(eq(creditCards.id, statement.creditCardId), eq(creditCards.userId, userId)),
      );
    if (!account) {
      throw new StatementIntegrityError("Cartão não encontrado.");
    }

    await tx.insert(transactions).values({
      userId,
      accountId: payingAccountId,
      categoryId: null,
      creditCardId: statement.creditCardId,
      statementId: statement.id,
      type: "transfer",
      direction: "outflow",
      amountCents,
      occurredAt: new Date(),
      description: `Pagamento de fatura — ${statement.referenceMonth}`,
      notes: null,
    });

    const newPaidCents = statement.paidCents + amountCents;
    const isFullyPaid = newPaidCents >= statement.totalCents;

    await tx
      .update(creditCardStatements)
      .set({
        paidCents: newPaidCents,
        status: isFullyPaid ? "paid" : statement.status,
        paidAt: isFullyPaid ? new Date() : statement.paidAt,
      })
      .where(eq(creditCardStatements.id, statementId));
  });
}

/**
 * Limite disponível é sempre derivado: limite total menos o saldo em aberto
 * de todas as faturas já fechadas (fechadas, vencidas ou pagas parcialmente)
 * menos os gastos já lançados no ciclo corrente (ainda aberto).
 */
export async function computeAvailableCreditCents(
  userId: string,
  creditCardId: string,
) {
  const card = await loadOwnedCard(userId, creditCardId);

  const statements = await db
    .select({
      id: creditCardStatements.id,
      status: creditCardStatements.status,
      totalCents: creditCardStatements.totalCents,
      paidCents: creditCardStatements.paidCents,
    })
    .from(creditCardStatements)
    .where(eq(creditCardStatements.creditCardId, creditCardId));

  const closedDebt = statements
    .filter((s) => s.status === "closed" || s.status === "paid")
    .reduce((sum, s) => sum + (s.totalCents - s.paidCents), 0);

  const openStatementIds = statements
    .filter((s) => s.status === "open")
    .map((s) => s.id);

  let openSpend = 0;
  if (openStatementIds.length > 0) {
    const [row] = await db
      .select({
        total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
      })
      .from(transactions)
      .where(inArray(transactions.statementId, openStatementIds));
    openSpend = row?.total ?? 0;
  }

  return card.limitCents - closedDebt - openSpend;
}
