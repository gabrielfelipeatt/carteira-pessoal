import { describe, expect, it } from "vitest";
import { sortReminders, type Reminder } from "@/lib/finance/reminders";

function statement(cardNickname: string, dueInDays: number): Reminder {
  return {
    kind: "statement",
    cardId: `card-${cardNickname}`,
    cardNickname,
    statementId: `stmt-${cardNickname}`,
    dueDate: new Date(),
    dueInDays,
    owedCents: 1000,
    effectiveStatus: dueInDays < 0 ? "overdue" : "closed",
  };
}

function occurrence(description: string): Reminder {
  return {
    kind: "fixed-occurrence",
    type: "expense",
    fixedExpenseId: `fx-${description}`,
    description,
    competencia: "2026-08",
    suggestedAmountCents: 500,
  };
}

describe("sortReminders", () => {
  it("coloca a fatura mais vencida primeiro", () => {
    const sorted = sortReminders([statement("B", 2), statement("A", -3)]);
    expect(sorted.map((r) => (r.kind === "statement" ? r.cardNickname : ""))).toEqual([
      "A",
      "B",
    ]);
  });

  it("intercala lançamentos fixos entre faturas por urgência", () => {
    const sorted = sortReminders([
      statement("Vencida", -1),
      occurrence("Internet"),
      statement("Vence em 5 dias", 5),
    ]);
    expect(
      sorted.map((r) => (r.kind === "statement" ? r.cardNickname : r.description)),
    ).toEqual(["Vencida", "Internet", "Vence em 5 dias"]);
  });

  it("em empate de urgência, ordena faturas antes de lançamentos fixos", () => {
    const sorted = sortReminders([occurrence("Internet"), statement("Cartão", 3)]);
    expect(sorted[0].kind).toBe("statement");
  });

  it("em empate de urgência e tipo, ordena por nome (pt-BR)", () => {
    const sorted = sortReminders([occurrence("Zebra"), occurrence("Abacaxi")]);
    expect(sorted.map((r) => (r.kind === "fixed-occurrence" ? r.description : ""))).toEqual([
      "Abacaxi",
      "Zebra",
    ]);
  });
});
