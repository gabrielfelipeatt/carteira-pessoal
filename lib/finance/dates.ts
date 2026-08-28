import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale/pt-BR";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

function timezone(): string {
  return process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
}

/**
 * Converte uma data digitada pelo usuário ("YYYY-MM-DD", meia-noite no fuso
 * dele) para o instante UTC armazenado no banco. Datas de negócio são
 * sempre UTC no banco, exibidas no fuso do usuário.
 */
export function localDateStringToUtcDate(dateString: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error(`Data inválida: "${dateString}"`);
  }
  return fromZonedTime(`${dateString}T00:00:00`, timezone());
}

/** Formata um instante UTC como "YYYY-MM-DD" no fuso do usuário (para inputs de data). */
export function utcDateToLocalDateString(date: Date): string {
  return format(toZonedTime(date, timezone()), "yyyy-MM-dd");
}

/** Formata um instante UTC como data legível em pt-BR ("28 de agosto de 2026"). */
export function formatDateLong(date: Date): string {
  return format(toZonedTime(date, timezone()), "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
}

/** Formata um instante UTC como data curta em pt-BR ("28/08/2026"). */
export function formatDateShort(date: Date): string {
  return format(toZonedTime(date, timezone()), "dd/MM/yyyy");
}

/** Nome do mês em pt-BR ("agosto de 2026") a partir de "YYYY-MM". */
export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
}

/** Rótulo curto de mês para eixos de gráfico ("ago/2026") a partir de "YYYY-MM". */
export function formatMonthShort(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return format(new Date(year, month - 1, 1), "MMM/yyyy", { locale: ptBR });
}

/** Intervalo [início, fim] em UTC (meia-noite local) de um mês "YYYY-MM". */
export function monthRange(yearMonth: string): { from: Date; to: Date } {
  const [year, month] = yearMonth.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const from = localDateStringToUtcDate(`${yearMonth}-01`);
  const startOfNextMonth = localDateStringToUtcDate(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  );
  const to = new Date(startOfNextMonth.getTime() - 1);
  return { from, to };
}

/** "YYYY-MM" do mês atual, no fuso do usuário. */
export function currentYearMonth(): string {
  return utcDateToLocalDateString(new Date()).slice(0, 7);
}

/** "YYYY-MM" do mês anterior ao informado. */
export function previousYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}
