import { describe, expect, it } from "vitest";
import { resolveBudgetCategoryIds } from "@/lib/finance/budget-rollup";

const categories = [
  { id: "moradia", parentId: null, rollupToParentBudget: true },
  { id: "aluguel", parentId: "moradia", rollupToParentBudget: true },
  { id: "energia", parentId: "moradia", rollupToParentBudget: true },
  { id: "internet", parentId: "moradia", rollupToParentBudget: false },
  { id: "lazer", parentId: null, rollupToParentBudget: true },
];

describe("resolveBudgetCategoryIds", () => {
  it("orçamento em categoria-pai inclui as subcategorias por padrão", () => {
    const ids = resolveBudgetCategoryIds("moradia", categories);
    expect(ids.sort()).toEqual(["aluguel", "energia", "moradia"].sort());
  });

  it("subcategoria com rollupToParentBudget=false fica de fora do orçamento do pai", () => {
    const ids = resolveBudgetCategoryIds("moradia", categories);
    expect(ids).not.toContain("internet");
  });

  it("orçamento numa subcategoria considera só ela mesma", () => {
    const ids = resolveBudgetCategoryIds("aluguel", categories);
    expect(ids).toEqual(["aluguel"]);
  });

  it("categoria-pai sem filhas retorna só ela mesma", () => {
    const ids = resolveBudgetCategoryIds("lazer", categories);
    expect(ids).toEqual(["lazer"]);
  });

  it("categoria desconhecida retorna ela mesma (sem inventar filhas)", () => {
    const ids = resolveBudgetCategoryIds("inexistente", categories);
    expect(ids).toEqual(["inexistente"]);
  });
});
