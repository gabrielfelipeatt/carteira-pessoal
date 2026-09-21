/**
 * Lógica pura (sem I/O, sem `db`) da importação de planilha: leitura das
 * linhas, classificação de cada linha e detecção de duplicatas. Fica
 * separada de `lib/actions/import.ts` pelo mesmo motivo dos demais módulos
 * puros — importar `db` quebra o import a partir dos testes unitários.
 */

import type { Direction, PaymentMethodKind } from "@/db/schema";
import { parseBrlToCents } from "@/lib/finance/money";

/** Linha já normalizada: `cents` com sinal (positivo = entrou dinheiro na planilha). */
export type ImportRow = {
  date: string; // "YYYY-MM-DD"
  cents: number;
  desc: string;
  tipo: string;
};

export type ImportSheetName = "itau" | "nubank" | "flash";

export type ImportKind =
  | "income"
  | "expense"
  | "cofrinho" // aplicação/resgate — transferência entre a conta e a conta "Cofrinho"
  | "card_payment" // Pix/TED para o próprio cartão — pagamento de fatura
  | "card_purchase"
  | "card_payment_info" // "Pagamento recebido" na aba do cartão — já coberto pela conta
  | "card_credit" // crédito/estorno no cartão — o app não modela isso
  | "adjustment"
  | "zero";

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Leitura das células
// ---------------------------------------------------------------------------

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseDateCell(cell: unknown): string | null {
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    // A biblioteca devolve datas de célula como meia-noite UTC — o dia de
    // calendário é o componente UTC, nunca o local.
    return `${cell.getUTCFullYear()}-${pad(cell.getUTCMonth() + 1)}-${pad(cell.getUTCDate())}`;
  }
  if (typeof cell === "string") {
    const text = cell.trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (br) return `${br[3]}-${pad(Number(br[2]))}-${pad(Number(br[1]))}`;
  }
  return null;
}

function parseValueCell(cell: unknown): number | null {
  if (typeof cell === "number" && Number.isFinite(cell)) {
    return Math.round(cell * 100);
  }
  if (typeof cell === "string" && cell.trim()) {
    try {
      return parseBrlToCents(cell);
    } catch {
      return null;
    }
  }
  return null;
}

function findColumn(header: string[], names: string[]): number {
  return header.findIndex((cell) => names.includes(cell));
}

/**
 * Converte a matriz de uma aba (primeira linha = cabeçalho com `data`,
 * `valor`, `desc` e, opcionalmente, `tipo`) em linhas normalizadas. Linhas
 * inválidas não interrompem a leitura — voltam em `errors`, com o número da
 * linha na planilha.
 */
export function parseSheetRows(data: unknown[][]): {
  rows: ImportRow[];
  errors: string[];
} {
  const errors: string[] = [];
  if (data.length === 0) return { rows: [], errors: ["A aba está vazia."] };

  const header = data[0].map((cell) => normalizeText(String(cell ?? "")));
  const dateCol = findColumn(header, ["data"]);
  const valueCol = findColumn(header, ["valor"]);
  const descCol = findColumn(header, ["desc", "descricao"]);
  const tipoCol = findColumn(header, ["tipo"]);

  if (dateCol < 0 || valueCol < 0 || descCol < 0) {
    return {
      rows: [],
      errors: ['Cabeçalho inválido: a aba precisa das colunas "data", "valor" e "desc".'],
    };
  }

  const rows: ImportRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const line = data[i];
    if (line.every((cell) => cell === null || cell === undefined || cell === "")) continue;

    const date = parseDateCell(line[dateCol]);
    const cents = parseValueCell(line[valueCol]);
    if (!date) {
      errors.push(`Linha ${i + 1}: data inválida.`);
      continue;
    }
    if (cents === null) {
      errors.push(`Linha ${i + 1}: valor inválido.`);
      continue;
    }

    const desc = String(line[descCol] ?? "").trim() || "Sem descrição";
    const tipo = tipoCol >= 0 ? String(line[tipoCol] ?? "").trim() : "";
    rows.push({ date, cents, desc, tipo });
  }

  return { rows, errors };
}

/** Acha a aba pelo nome, ignorando caixa/acento ("Itaú", "itau", "ITAU"). */
export function findSheet<T extends { sheet: string }>(
  sheets: T[],
  name: ImportSheetName,
): T | undefined {
  return sheets.find((s) => normalizeText(s.sheet) === name);
}

// ---------------------------------------------------------------------------
// Classificação
// ---------------------------------------------------------------------------

export function directionOf(cents: number): Direction {
  return cents >= 0 ? "inflow" : "outflow";
}

export function classifyBankRow(row: ImportRow, cardNicknames: string[]): ImportKind {
  if (row.cents === 0) return "zero";
  const desc = normalizeText(row.desc);
  if (desc.includes("cofrinho")) return "cofrinho";
  if (row.cents < 0 && cardNicknames.some((nick) => desc === normalizeText(nick))) {
    return "card_payment";
  }
  return row.cents > 0 ? "income" : "expense";
}

export function classifyCardRow(row: ImportRow): ImportKind {
  if (row.cents === 0) return "zero";
  if (row.cents > 0) return "card_purchase";
  return normalizeText(row.desc).startsWith("pagamento") ? "card_payment_info" : "card_credit";
}

export function classifyFlashRow(row: ImportRow): ImportKind {
  if (row.cents === 0) return "zero";
  if (normalizeText(row.desc) === "ajuste") return "adjustment";
  return row.cents > 0 ? "income" : "expense";
}

/** Forma de pagamento do sistema que melhor representa o `tipo` da planilha. */
export function paymentKindForTipo(tipo: string): PaymentMethodKind {
  switch (normalizeText(tipo)) {
    case "pix":
      return "pix";
    case "debito":
      return "debito";
    case "boleto":
      return "boleto";
    case "entrada":
      return "transferencia";
    default:
      return "outro";
  }
}

// ---------------------------------------------------------------------------
// Duplicatas
// ---------------------------------------------------------------------------

/** Chave de comparação: dia + valor absoluto + sentido. */
export function matchKey(date: string, absCents: number, direction: Direction): string {
  return `${date}|${absCents}|${direction}`;
}

/**
 * Compara por contagem, não por presença: se já existem 2 lançamentos com a
 * mesma chave e a planilha traz 3, só os 2 primeiros são duplicatas — dois
 * cafés de mesmo valor no mesmo dia continuam sendo dois lançamentos.
 * `existing` é consumido (decrementado) na ordem das linhas.
 */
export function consumeDuplicate(existing: Map<string, number>, key: string): boolean {
  const remaining = existing.get(key) ?? 0;
  if (remaining <= 0) return false;
  existing.set(key, remaining - 1);
  return true;
}

export function countKeys(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

// ---------------------------------------------------------------------------
// Contrato entre servidor e tela
// ---------------------------------------------------------------------------

export type ImportItemStatus =
  | "new" // será importada
  | "duplicate" // já existe lançamento com mesma data e valor
  | "skip" // informativa, nunca importada
  | "review"; // não dá para importar automaticamente

export type ImportPreviewItem = {
  key: string; // "itau:3" — aba + posição da linha
  sheet: ImportSheetName;
  date: string;
  cents: number; // sempre positivo
  direction: Direction;
  desc: string;
  tipo: string;
  kind: ImportKind;
  status: ImportItemStatus;
  note: string | null;
  category: string | null;
  target: string;
};

export type ImportInput = {
  itauAccountId?: string;
  creditCardId?: string;
  itau: ImportRow[];
  nubank: ImportRow[];
  flash: ImportRow[];
};

export type ImportPreview = {
  items: ImportPreviewItem[];
  newAccounts: string[]; // contas que serão criadas na importação
};

export type ImportResult = {
  imported: number;
  createdAccounts: string[];
  errors: { key: string; message: string }[];
};
