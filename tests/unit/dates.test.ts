import { describe, expect, it } from "vitest";
import {
  localDateStringToUtcDate,
  utcDateToLocalDateString,
} from "@/lib/finance/dates";

describe("localDateStringToUtcDate / utcDateToLocalDateString", () => {
  it("faz o round-trip de uma data sem perder o dia (fuso America/Sao_Paulo)", () => {
    const original = "2026-08-28";
    const utc = localDateStringToUtcDate(original);
    expect(utcDateToLocalDateString(utc)).toBe(original);
  });

  it("interpreta a data como meia-noite no fuso do usuário, não em UTC", () => {
    // America/Sao_Paulo é UTC-3, então meia-noite local é 03:00 UTC.
    const utc = localDateStringToUtcDate("2026-08-28");
    expect(utc.toISOString()).toBe("2026-08-28T03:00:00.000Z");
  });

  it("rejeita formatos inválidos", () => {
    expect(() => localDateStringToUtcDate("28/08/2026")).toThrow();
    expect(() => localDateStringToUtcDate("2026-8-28")).toThrow();
  });
});
