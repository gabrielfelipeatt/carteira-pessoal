import { describe, expect, it } from "vitest";
import {
  classifyBankRow,
  classifyCardRow,
  classifyFlashRow,
  consumeDuplicate,
  countKeys,
  findSheet,
  matchKey,
  normalizeText,
  paymentKindForTipo,
  parseSheetRows,
} from "@/lib/finance/import";

const row = (cents: number, desc: string, tipo = "") => ({
  date: "2026-09-02",
  cents,
  desc,
  tipo,
});

describe("normalizeText", () => {
  it("ignora acento, caixa e espaços extras", () => {
    expect(normalizeText("  Aplicação   COFRINHO ")).toBe("aplicacao cofrinho");
  });
});

describe("parseSheetRows", () => {
  it("lê datas UTC como o dia de calendário e converte valor para centavos", () => {
    const { rows, errors } = parseSheetRows([
      ["data", "valor", "desc", "tipo"],
      [new Date("2026-09-02T00:00:00.000Z"), 300.02, "Cofrinhos", "Resgate"],
      [new Date("2026-09-02T00:00:00.000Z"), -17.92, "Uber", "Débito"],
    ]);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { date: "2026-09-02", cents: 30002, desc: "Cofrinhos", tipo: "Resgate" },
      { date: "2026-09-02", cents: -1792, desc: "Uber", tipo: "Débito" },
    ]);
  });

  it("aceita aba sem coluna tipo e datas em texto dd/mm/aaaa", () => {
    const { rows } = parseSheetRows([
      ["Data", "Valor", "Desc"],
      ["11/09/2026", 81.48, "Nuuvem 2/2"],
    ]);
    expect(rows).toEqual([{ date: "2026-09-11", cents: 8148, desc: "Nuuvem 2/2", tipo: "" }]);
  });

  it("pula linhas vazias e reporta linhas inválidas com o número da linha", () => {
    const { rows, errors } = parseSheetRows([
      ["data", "valor", "desc"],
      [null, null, null],
      ["não é data", 10, "x"],
      [new Date("2026-09-02T00:00:00.000Z"), "abc", "y"],
      [new Date("2026-09-02T00:00:00.000Z"), 5, "ok"],
    ]);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual(["Linha 3: data inválida.", "Linha 4: valor inválido."]);
  });

  it("rejeita cabeçalho sem as colunas obrigatórias", () => {
    const { rows, errors } = parseSheetRows([["a", "b"]]);
    expect(rows).toEqual([]);
    expect(errors[0]).toContain("Cabeçalho inválido");
  });

  it("não perde centavos por ponto flutuante", () => {
    const { rows } = parseSheetRows([
      ["data", "valor", "desc"],
      [new Date("2026-09-02T00:00:00.000Z"), 0.1 + 0.2, "soma"],
    ]);
    expect(rows[0].cents).toBe(30);
  });
});

describe("findSheet", () => {
  it("acha a aba ignorando acento e caixa", () => {
    const sheets = [{ sheet: "Itaú" }, { sheet: "NUBANK" }];
    expect(findSheet(sheets, "itau")).toBe(sheets[0]);
    expect(findSheet(sheets, "nubank")).toBe(sheets[1]);
    expect(findSheet(sheets, "flash")).toBeUndefined();
  });
});

describe("classificação", () => {
  const cards = ["Nubank"];

  it("cofrinho é transferência, nunca receita/despesa", () => {
    expect(classifyBankRow(row(-10000, "Aplicação Cofrinho", "Saida"), cards)).toBe("cofrinho");
    expect(classifyBankRow(row(30002, "Cofrinhos", "Resgate"), cards)).toBe("cofrinho");
  });

  it("saída com o nome do cartão é pagamento de fatura", () => {
    expect(classifyBankRow(row(-34119, "Nubank", "Pix"), cards)).toBe("card_payment");
  });

  it("entrada com o nome do cartão não é pagamento de fatura", () => {
    expect(classifyBankRow(row(5000, "Nubank", "Pix"), cards)).toBe("income");
  });

  it("classifica receita, despesa e valor zero", () => {
    expect(classifyBankRow(row(92000, "Salario", "Entrada"), cards)).toBe("income");
    expect(classifyBankRow(row(-280, "Antonio", "Pix"), cards)).toBe("expense");
    expect(classifyBankRow(row(0, "x"), cards)).toBe("zero");
  });

  it("no cartão, valor positivo é compra e negativo é pagamento ou crédito", () => {
    expect(classifyCardRow(row(8148, "Nuuvem 2/2"))).toBe("card_purchase");
    expect(classifyCardRow(row(-34119, "Pagamento recebido"))).toBe("card_payment_info");
    expect(classifyCardRow(row(-7919, "Crédito Shopee"))).toBe("card_credit");
  });

  it("no flash, 'Ajuste' é ajuste de saldo", () => {
    expect(classifyFlashRow(row(2681, "Ajuste", "Flexível"))).toBe("adjustment");
    expect(classifyFlashRow(row(0, "Ajuste", "Refeição"))).toBe("zero");
    expect(classifyFlashRow(row(-1500, "Almoço", "Refeição"))).toBe("expense");
  });

  it("mapeia o tipo da planilha para a forma de pagamento", () => {
    expect(paymentKindForTipo("Pix")).toBe("pix");
    expect(paymentKindForTipo("Débito")).toBe("debito");
    expect(paymentKindForTipo("Entrada")).toBe("transferencia");
    expect(paymentKindForTipo("Estorno")).toBe("outro");
  });
});

describe("duplicatas por data e valor", () => {
  it("chave inclui o sentido: entrada e saída de mesmo valor não colidem", () => {
    expect(matchKey("2026-09-02", 1792, "outflow")).not.toBe(matchKey("2026-09-02", 1792, "inflow"));
  });

  it("compara por contagem — só consome o que já existe", () => {
    const existing = countKeys([matchKey("2026-09-13", 314, "outflow")]);
    const key = matchKey("2026-09-13", 314, "outflow");
    // Planilha traz dois lançamentos iguais no mesmo dia; um já existe.
    expect(consumeDuplicate(existing, key)).toBe(true);
    expect(consumeDuplicate(existing, key)).toBe(false);
  });

  it("chave inexistente nunca é duplicata", () => {
    expect(consumeDuplicate(new Map(), matchKey("2026-09-13", 314, "outflow"))).toBe(false);
  });
});
