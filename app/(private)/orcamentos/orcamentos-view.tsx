"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/finance/states";
import { MonthPicker } from "@/components/finance/month-picker";
import { BudgetProgress, type Budget } from "@/components/finance/budget-progress";
import { BudgetForm } from "@/components/finance/budget-form";
import { removeBudget } from "@/lib/actions/budgets";
import type { categories as categoriesTable } from "@/db/schema";

type Category = typeof categoriesTable.$inferSelect;

type Dialog = { open: false } | { open: true; budget?: Budget };

export function OrcamentosView({
  yearMonth,
  budgets,
  categories,
}: {
  yearMonth: string;
  budgets: Budget[];
  categories: Category[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>({ open: false });

  function refresh() {
    router.refresh();
  }

  async function handleRemove(id: string) {
    try {
      await removeBudget(id);
      toast.success("Orçamento removido.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover orçamento.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Orçamentos
          </h1>
          <p className="text-sm text-muted-foreground">Limites mensais por categoria.</p>
        </div>
        {budgets.length > 0 ? (
          <Button size="sm" className="h-9 gap-1" onClick={() => setDialog({ open: true })}>
            <Plus className="size-4" aria-hidden />
            Novo
          </Button>
        ) : null}
      </div>

      <MonthPicker yearMonth={yearMonth} basePath="/orcamentos" />

      {budgets.length === 0 ? (
        <EmptyState
          icon={<Target className="size-8 text-muted-foreground" aria-hidden />}
          title="Nenhum orçamento definido"
          description="Defina um limite mensal por categoria para acompanhar seus gastos."
          action={
            <Button size="lg" className="h-11" onClick={() => setDialog({ open: true })}>
              Criar orçamento
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
          {budgets.map((budget) => (
            <BudgetProgress
              key={budget.id}
              budget={budget}
              onEdit={() => setDialog({ open: true, budget })}
              onRemoved={() => handleRemove(budget.id)}
            />
          ))}
        </div>
      )}

      {dialog.open ? (
        <BudgetForm
          open
          categories={categories}
          yearMonth={yearMonth}
          editing={
            dialog.budget
              ? {
                  id: dialog.budget.id,
                  categoryId: dialog.budget.categoryId,
                  limitCents: dialog.budget.limitCents,
                }
              : undefined
          }
          onOpenChange={(open) => !open && setDialog({ open: false })}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}
