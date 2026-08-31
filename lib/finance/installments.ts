/**
 * Cálculo puro (sem I/O) de parcelamento de compra no cartão — separado
 * para ser testável em isolamento.
 */

import { nextYearMonth } from "@/lib/finance/dates";
import { resolveOccurrenceDateString } from "@/lib/finance/fixed-expenses";

/**
 * Divide um valor total em `count` parcelas de centavos inteiros que
 * somam exatamente o total — a sobra da divisão inteira vai pra última
 * parcela (convenção comum: as primeiras parcelas são "redondas", a
 * última absorve o resto).
 */
export function splitIntoInstallments(totalCents: number, count: number): number[] {
  const base = Math.floor(totalCents / count);
  const installments = Array(count).fill(base);
  installments[count - 1] += totalCents - base * count;
  return installments;
}

/**
 * Gera as `count` datas de ocorrência de uma compra parcelada, uma por
 * ciclo futuro, mantendo o mesmo dia do mês da compra original (clampado
 * quando o mês for mais curto). Nunca soma meses via aritmética de `Date`
 * (`addMonths`) — isso quebra em mês curto, já que o dia pode "vazar"
 * pro mês seguinte. Em vez disso compõe duas funções puras já existentes:
 * `nextYearMonth` (avança a competência) e `resolveOccurrenceDateString`
 * (resolve dia-do-mês + competência pra uma data, com o mesmo clamp já
 * usado nas despesas fixas).
 */
export function resolveInstallmentDates(firstDateString: string, count: number): string[] {
  const [yearMonth, dayString] = [firstDateString.slice(0, 7), firstDateString.slice(8, 10)];
  const day = Number(dayString);

  const dates: string[] = [];
  let competencia = yearMonth;
  for (let i = 0; i < count; i++) {
    dates.push(i === 0 ? firstDateString : resolveOccurrenceDateString(competencia, day));
    competencia = nextYearMonth(competencia);
  }
  return dates;
}
