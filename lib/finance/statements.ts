import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { creditCards, creditCardStatements, transactions } from "@/db/schema";
import { resolveCycleForDate } from "@/lib/finance/statement-cycle";
import { localDateStringToUtcDate } from "@/lib/finance/dates";

export class StatementIntegrityError extends Error {}

/** `db` normal ou o `tx` de dentro de um `db.transaction(...)` — ambos suportam `.select()`. */
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

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

/**
 * Soma só as compras (nunca pagamentos) vinculadas a uma fatura — usado
 * tanto para fechar a fatura quanto para saber "quanto já devo" numa fatura
 * ainda aberta (onde `totalCents` fica em 0 até o fechamento).
 */
async function sumStatementPurchases(
  tx: DbOrTx,
  statementId: string,
): Promise<number> {
  const [{ total }] = await tx
    .select({
      total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .where(
      and(eq(transactions.statementId, statementId), eq(transactions.type, "expense")),
    );
  return total;
}

/**
 * Quanto uma fatura deve no momento: para uma fatura fechada/vencida/paga,
 * `totalCents` já é o valor final; para uma aberta, precisa somar as
 * compras do ciclo em tempo real (nunca fica "congelado" até o fechamento).
 */
export async function computeStatementOwedCents(statement: {
  id: string;
  status: string;
  totalCents: number;
}): Promise<number> {
  if (statement.status === "open") {
    return sumStatementPurchases(db, statement.id);
  }
  return statement.totalCents;
}

/** Fechamento é sempre uma ação explícita do usuário — nunca automático. */
export async function closeStatement(userId: string, statementId: string) {
  const statement = await assertOwnedStatement(userId, statementId);
  if (statement.status !== "open") {
    throw new StatementIntegrityError("Esta fatura já está fechada.");
  }

  const total = await sumStatementPurchases(db, statementId);
  // Se pagamentos adiantados (feitos com a fatura ainda aberta) já cobrem o
  // total apurado no fechamento, a fatura fecha direto como paga — nunca
  // fica "fechada" com saldo zerado esperando uma ação a mais do usuário.
  const isFullyPaid = statement.paidCents >= total;

  await db
    .update(creditCardStatements)
    .set({
      status: isFullyPaid ? "paid" : "closed",
      closedAt: new Date(),
      totalCents: total,
      paidAt: isFullyPaid ? (statement.paidAt ?? new Date()) : statement.paidAt,
    })
    .where(eq(creditCardStatements.id, statementId));
}

/**
 * Registra um pagamento (total ou parcial) de fatura — sempre uma
 * transferência (`type: 'transfer'`), nunca uma nova despesa. É assim,
 * estruturalmente, que "pagar fatura ≠ nova despesa" é garantido.
 *
 * Pode ser feito com a fatura ainda aberta (adiantamento) — nesse caso o
 * "quanto devo" é calculado em tempo real a partir das compras já lançadas
 * no ciclo, e a fatura continua aberta mesmo se o adiantamento cobrir tudo,
 * porque novas compras ainda podem entrar até o fechamento.
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
    if (statement.status === "paid") {
      throw new StatementIntegrityError("Esta fatura já está paga.");
    }

    const owedCents =
      statement.status === "open"
        ? await sumStatementPurchases(tx, statementId)
        : statement.totalCents;

    const remaining = owedCents - statement.paidCents;
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
    // Uma fatura aberta nunca vira "paga" sozinha — novas compras ainda
    // podem chegar até o fechamento explícito. Só fecha/finaliza como paga
    // quando já estava fechada/vencida e o pagamento cobre o total.
    const isFullyPaid = statement.status !== "open" && newPaidCents >= owedCents;

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

  const openStatements = statements.filter((s) => s.status === "open");
  const openStatementIds = openStatements.map((s) => s.id);
  // Adiantamentos pagos numa fatura ainda aberta já reduzem o quanto está
  // "em uso" do limite — nunca contados como se fossem gasto novo.
  const openPaidCents = openStatements.reduce((sum, s) => sum + s.paidCents, 0);

  let openSpend = 0;
  if (openStatementIds.length > 0) {
    const [row] = await db
      .select({
        total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.statementId, openStatementIds),
          eq(transactions.type, "expense"),
        ),
      );
    openSpend = (row?.total ?? 0) - openPaidCents;
  }

  return card.limitCents - closedDebt - openSpend;
}
