import { describe, expect, it } from "vitest";
import { resolveCycleForDate } from "@/lib/finance/statement-cycle";

function utc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

describe("resolveCycleForDate", () => {
  it("compra no dia do fechamento pertence ao ciclo que fecha nesse dia", () => {
    const cycle = resolveCycleForDate(utc(2026, 3, 5), 5, 15);
    expect(cycle.referenceMonth).toBe("2026-03");
    expect(cycle.periodEnd.toISOString().slice(0, 10)).toBe("2026-03-05");
  });

  it("compra um dia depois do fechamento vai para o ciclo do mês seguinte", () => {
    const cycle = resolveCycleForDate(utc(2026, 3, 6), 5, 15);
    expect(cycle.referenceMonth).toBe("2026-04");
    expect(cycle.periodEnd.toISOString().slice(0, 10)).toBe("2026-04-05");
  });

  it("período começa no dia seguinte ao fechamento anterior", () => {
    const cycle = resolveCycleForDate(utc(2026, 3, 6), 5, 15);
    expect(cycle.periodStart.toISOString().slice(0, 10)).toBe("2026-03-06");
  });

  it("vencimento no mesmo mês do fechamento quando dueDay > closingDay", () => {
    const cycle = resolveCycleForDate(utc(2026, 3, 1), 5, 15);
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2026-03-15");
  });

  it("vencimento no mês seguinte quando dueDay < closingDay", () => {
    const cycle = resolveCycleForDate(utc(2026, 3, 1), 25, 5);
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2026-04-05");
  });

  it("fechamento dia 31 em fevereiro é clampado para o último dia do mês (28 em 2026)", () => {
    const cycle = resolveCycleForDate(utc(2026, 2, 15), 31, 10);
    expect(cycle.referenceMonth).toBe("2026-02");
    expect(cycle.periodEnd.toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("fechamento dia 31 em fevereiro bissexto é clampado para dia 29", () => {
    const cycle = resolveCycleForDate(utc(2028, 2, 15), 31, 10);
    expect(cycle.periodEnd.toISOString().slice(0, 10)).toBe("2028-02-29");
  });

  it("vira o ano corretamente (dezembro -> janeiro)", () => {
    const cycle = resolveCycleForDate(utc(2026, 12, 20), 5, 15);
    expect(cycle.referenceMonth).toBe("2027-01");
    expect(cycle.periodEnd.toISOString().slice(0, 10)).toBe("2027-01-05");
  });

  it("compra logo após o fechamento no fim do ano gera vencimento no ano seguinte", () => {
    const cycle = resolveCycleForDate(utc(2026, 12, 20), 5, 1);
    // fechamento em 2027-01-05, dueDay(1) < closingDay(5) -> vencimento mês seguinte
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2027-02-01");
  });
});
