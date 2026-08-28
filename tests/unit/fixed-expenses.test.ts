import { describe, expect, it } from "vitest";
import {
  computePendingCompetencias,
  listCompetenciasInRange,
  resolveOccurrenceDateString,
} from "@/lib/finance/fixed-expenses";

describe("resolveOccurrenceDateString", () => {
  it("usa o dia informado quando o mês é longo o suficiente", () => {
    expect(resolveOccurrenceDateString("2026-08", 15)).toBe("2026-08-15");
  });

  it("clampa para o último dia em fevereiro comum", () => {
    expect(resolveOccurrenceDateString("2026-02", 31)).toBe("2026-02-28");
  });

  it("clampa para o último dia em fevereiro bissexto", () => {
    expect(resolveOccurrenceDateString("2028-02", 31)).toBe("2028-02-29");
  });

  it("clampa para o último dia em mês de 30 dias", () => {
    expect(resolveOccurrenceDateString("2026-04", 31)).toBe("2026-04-30");
  });
});

describe("listCompetenciasInRange", () => {
  it("gera a sequência inclusiva sem data final", () => {
    expect(listCompetenciasInRange("2026-06", null, "2026-08")).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
  });

  it("respeita a data final quando é antes do teto", () => {
    expect(listCompetenciasInRange("2026-06", "2026-07", "2026-10")).toEqual([
      "2026-06",
      "2026-07",
    ]);
  });

  it("ignora a data final quando é depois do teto", () => {
    expect(listCompetenciasInRange("2026-06", "2027-01", "2026-08")).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
  });

  it("atravessa a virada de ano", () => {
    expect(listCompetenciasInRange("2026-11", null, "2027-01")).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
  });

  it("retorna lista vazia quando o início é depois do teto", () => {
    expect(listCompetenciasInRange("2027-01", null, "2026-08")).toEqual([]);
  });
});

describe("computePendingCompetencias", () => {
  it("exclui competências já geradas e dispensadas", () => {
    const pending = computePendingCompetencias(
      "2026-06",
      null,
      "2026-09",
      new Set(["2026-06", "2026-08"]),
      new Set(["2026-07"]),
    );
    expect(pending).toEqual(["2026-09"]);
  });

  it("retorna tudo pendente quando nada foi gerado ou dispensado", () => {
    const pending = computePendingCompetencias(
      "2026-08",
      "2026-09",
      "2026-09",
      new Set(),
      new Set(),
    );
    expect(pending).toEqual(["2026-08", "2026-09"]);
  });
});
