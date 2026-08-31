import { describe, expect, it } from "vitest";
import {
  resolveInstallmentDates,
  splitIntoInstallments,
} from "@/lib/finance/installments";

describe("splitIntoInstallments", () => {
  it("divide igualmente quando o total é múltiplo do número de parcelas", () => {
    expect(splitIntoInstallments(3000, 3)).toEqual([1000, 1000, 1000]);
  });

  it("joga a sobra pra última parcela", () => {
    const installments = splitIntoInstallments(1000, 3);
    expect(installments).toEqual([333, 333, 334]);
    expect(installments.reduce((sum, c) => sum + c, 0)).toBe(1000);
  });

  it("soma sempre bate com o total, mesmo com resto negativo-arredondado", () => {
    const installments = splitIntoInstallments(9999, 7);
    expect(installments.reduce((sum, c) => sum + c, 0)).toBe(9999);
  });

  it("funciona com 2 parcelas (mínimo permitido)", () => {
    expect(splitIntoInstallments(101, 2)).toEqual([50, 51]);
  });
});

describe("resolveInstallmentDates", () => {
  it("mantém o mesmo dia do mês em cada parcela", () => {
    expect(resolveInstallmentDates("2026-08-15", 3)).toEqual([
      "2026-08-15",
      "2026-09-15",
      "2026-10-15",
    ]);
  });

  it("clampa o dia em meses mais curtos", () => {
    expect(resolveInstallmentDates("2026-01-31", 4)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("atravessa a virada de ano", () => {
    expect(resolveInstallmentDates("2026-11-10", 3)).toEqual([
      "2026-11-10",
      "2026-12-10",
      "2027-01-10",
    ]);
  });
});
