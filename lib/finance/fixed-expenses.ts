/**
 * Cálculo puro (sem I/O) de ocorrências de despesa fixa recorrente —
 * separado para ser testável em isolamento. Não existe cron/job em
 * background: "pendente" é sempre calculado em tempo de leitura, igual ao
 * status "vencida" de uma fatura (`computeEffectiveStatus`).
 */

import { nextYearMonth } from "@/lib/finance/dates";

function daysInMonth(year: number, month: number): number {
  // month é 1-indexado aqui (1 = janeiro).
  return new Date(year, month, 0).getDate();
}

/** Resolve "YYYY-MM" + dia para "YYYY-MM-DD", clampando meses mais curtos. */
export function resolveOccurrenceDateString(
  yearMonth: string,
  day: number,
): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const clampedDay = Math.min(day, daysInMonth(year, month));
  return `${yearMonth}-${String(clampedDay).padStart(2, "0")}`;
}

/**
 * Sequência inclusiva de competências "YYYY-MM" entre `startMonth` e
 * `min(endMonth ?? uptoMonth, uptoMonth)`. Comparação de string funciona
 * porque toda competência é sempre zero-padded ("2026-09" > "2026-08").
 */
export function listCompetenciasInRange(
  startMonth: string,
  endMonth: string | null,
  uptoMonth: string,
): string[] {
  const cap = endMonth && endMonth < uptoMonth ? endMonth : uptoMonth;
  if (startMonth > cap) {
    return [];
  }

  const months: string[] = [];
  let cursor = startMonth;
  while (cursor <= cap) {
    months.push(cursor);
    cursor = nextYearMonth(cursor);
  }
  return months;
}

/** Competências ainda não geradas nem dispensadas, dentro da vigência. */
export function computePendingCompetencias(
  startMonth: string,
  endMonth: string | null,
  uptoMonth: string,
  generated: Set<string>,
  skipped: Set<string>,
): string[] {
  return listCompetenciasInRange(startMonth, endMonth, uptoMonth).filter(
    (competencia) => !generated.has(competencia) && !skipped.has(competencia),
  );
}
