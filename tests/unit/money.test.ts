import { describe, expect, it } from "vitest";
import { formatCentsToBRL, parseBrlToCents } from "@/lib/finance/money";

describe("parseBrlToCents", () => {
  it("aceita formato BR com milhar e vírgula decimal", () => {
    expect(parseBrlToCents("1.234,56")).toBe(123456);
  });

  it("aceita vírgula decimal sem milhar", () => {
    expect(parseBrlToCents("1234,56")).toBe(123456);
  });

  it("aceita ponto decimal (formato US)", () => {
    expect(parseBrlToCents("1234.56")).toBe(123456);
  });

  it("aceita inteiro sem parte decimal", () => {
    expect(parseBrlToCents("1234")).toBe(123400);
  });

  it("aceita um único dígito decimal", () => {
    expect(parseBrlToCents("10,5")).toBe(1050);
  });

  it("aceita valores negativos (ajuste de saldo, por exemplo)", () => {
    expect(parseBrlToCents("-50,00")).toBe(-5000);
  });

  it("ignora o prefixo 'R$' e espaços", () => {
    expect(parseBrlToCents("R$ 1.234,56")).toBe(123456);
  });

  it("rejeita string vazia", () => {
    expect(() => parseBrlToCents("")).toThrow();
  });

  it("rejeita entrada não numérica", () => {
    expect(() => parseBrlToCents("abc")).toThrow();
  });

  it("rejeita mais de duas casas decimais", () => {
    expect(() => parseBrlToCents("10,999")).toThrow();
  });
});

describe("formatCentsToBRL", () => {
  it("formata centavos como moeda BRL", () => {
    expect(formatCentsToBRL(123456)).toContain("1.234,56");
  });

  it("formata zero corretamente", () => {
    expect(formatCentsToBRL(0)).toContain("0,00");
  });
});
