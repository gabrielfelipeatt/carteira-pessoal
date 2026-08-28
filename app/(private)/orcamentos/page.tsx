import { listBudgets } from "@/lib/actions/budgets";
import { listCategories } from "@/lib/actions/categories";
import { currentYearMonth } from "@/lib/finance/dates";
import { OrcamentosView } from "./orcamentos-view";

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const yearMonth = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : currentYearMonth();

  const [budgets, categories] = await Promise.all([
    listBudgets(yearMonth),
    listCategories(),
  ]);

  return <OrcamentosView yearMonth={yearMonth} budgets={budgets} categories={categories} />;
}
