/**
 * Dinheiro é sempre representado como centavos inteiros (integer). Nunca usar
 * `float`/`parseFloat` para valores monetários em nenhum ponto do sistema.
 */

/**
 * Converte uma string digitada pelo usuário (aceita vírgula ou ponto como
 * separador decimal, com ou sem separador de milhar) para centavos inteiros.
 * Lança erro em entradas inválidas — nunca inventa ou arredonda "no escuro".
 */
export function parseBrlToCents(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Valor obrigatório.");
  }

  // Remove tudo que não for dígito, vírgula, ponto ou sinal de menos.
  const cleaned = trimmed.replace(/[^\d,.-]/g, "");

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized: string;
  if (hasComma && hasDot) {
    // Formato BR com milhar: "1.234,56" -> "1234.56"
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // "1234,56" -> "1234.56"
    normalized = cleaned.replace(",", ".");
  } else {
    // Só ponto ou só dígitos: já está em formato decimal padrão ("1234.56").
    normalized = cleaned;
  }

  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Valor monetário inválido: "${input}"`);
  }

  const [integerPart, decimalPart = ""] = normalized.split(".");
  const cents = decimalPart.length === 1 ? `${decimalPart}0` : decimalPart.padEnd(2, "0");
  const sign = integerPart.startsWith("-") ? -1 : 1;
  const absoluteIntegerPart = integerPart.replace("-", "");

  return sign * (Number(absoluteIntegerPart) * 100 + Number(cents || "0"));
}

/** Formata centavos inteiros como moeda brasileira ("R$ 1.234,56"). */
export function formatCentsToBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
