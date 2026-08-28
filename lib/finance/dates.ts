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
