/**
 * Cálculo puro do ciclo de fatura (sem I/O) — separado para ser testável em
 * isolamento. `closingDay`/`dueDay` são inteiros 1-31, "clampados" para o
 * último dia do mês quando o mês é mais curto (ex: fechamento dia 31 em
 * fevereiro vira dia 28/29).
 */

function daysInMonth(year: number, month: number): number {
  // month é 0-indexed (0 = janeiro), igual ao Date nativo.
  return new Date(year, month + 1, 0).getDate();
}

function clampedDate(year: number, month: number, day: number): Date {
  const clampedDay = Math.min(day, daysInMonth(year, month));
  return new Date(Date.UTC(year, month, clampedDay));
}

export type StatementCycle = {
  referenceMonth: string; // "YYYY-MM"
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
};

/**
 * Dado o dia de fechamento do cartão e a data de uma compra (em UTC),
 * resolve a qual ciclo de fatura ela pertence.
 */
export function resolveCycleForDate(
  occurredAt: Date,
  closingDay: number,
  dueDay: number,
): StatementCycle {
  const year = occurredAt.getUTCFullYear();
  const month = occurredAt.getUTCMonth(); // 0-indexed
  const day = occurredAt.getUTCDate();

  const closingThisMonth = clampedDate(year, month, closingDay);

  // Se a compra é depois do fechamento deste mês, ela pertence ao ciclo que
  // fecha no mês seguinte.
  const closingMonthOffset = day > closingThisMonth.getUTCDate() ? 1 : 0;
  const closingYear = year + Math.floor((month + closingMonthOffset) / 12);
  const closingMonthIndex = (month + closingMonthOffset) % 12;
  const periodEnd = clampedDate(closingYear, closingMonthIndex, closingDay);

  // Início do período = dia seguinte ao fechamento do ciclo anterior.
  const prevClosingYear = closingYear + Math.floor((closingMonthIndex - 1) / 12);
  const prevClosingMonthIndex = ((closingMonthIndex - 1) % 12 + 12) % 12;
  const prevClosing = clampedDate(prevClosingYear, prevClosingMonthIndex, closingDay);
  const periodStart = new Date(prevClosing.getTime() + 24 * 60 * 60 * 1000);

  // Vencimento: no mesmo mês do fechamento se dueDay > closingDay (caso mais
  // comum), senão no mês seguinte ao fechamento.
  const dueMonthOffset = dueDay > closingDay ? 0 : 1;
  const dueYear = closingYear + Math.floor((closingMonthIndex + dueMonthOffset) / 12);
  const dueMonthIndex = (closingMonthIndex + dueMonthOffset) % 12;
  const dueDate = clampedDate(dueYear, dueMonthIndex, dueDay);

  const referenceMonth = `${closingYear}-${String(closingMonthIndex + 1).padStart(2, "0")}`;

  return { referenceMonth, periodStart, periodEnd, dueDate };
}
