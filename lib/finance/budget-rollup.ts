/**
 * Cálculo puro (sem I/O) de quais categorias entram na apuração de consumo
 * de um orçamento — separado para ser testável em isolamento. Um orçamento
 * numa categoria-pai soma, por padrão, os gastos das subcategorias também
 * (salvo a subcategoria ter `rollupToParentBudget: false`).
 */

type CategoryLike = {
  id: string;
  parentId: string | null;
  rollupToParentBudget: boolean;
};

export function resolveBudgetCategoryIds(
  budgetCategoryId: string,
  allCategories: CategoryLike[],
): string[] {
  const budgetCategory = allCategories.find((c) => c.id === budgetCategoryId);
  if (!budgetCategory) return [budgetCategoryId];

  // Orçamento numa subcategoria: só a própria subcategoria (não existe
  // rollup "para baixo" além de um nível).
  if (budgetCategory.parentId) {
    return [budgetCategoryId];
  }

  // Orçamento numa categoria-pai: inclui filhas que não optaram por ficar
  // de fora do rollup.
  const children = allCategories.filter(
    (c) => c.parentId === budgetCategoryId && c.rollupToParentBudget,
  );
  return [budgetCategoryId, ...children.map((c) => c.id)];
}
