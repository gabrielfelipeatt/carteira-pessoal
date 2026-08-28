"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/finance/money-input";
import { CategorySelect } from "@/components/finance/category-select";
import { saveBudget } from "@/lib/actions/budgets";
import { budgetFormSchema, type BudgetFormInput } from "@/lib/validation/budgets";
import type { categories as categoriesTable } from "@/db/schema";

type Category = typeof categoriesTable.$inferSelect;

export function BudgetForm({
  open,
  onOpenChange,
  categories,
  yearMonth,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  yearMonth: string;
  editing?: { id: string; categoryId: string; limitCents: number };
  onSaved?: () => void;
}) {
  const [year, month] = yearMonth.split("-").map(Number);

  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormInput>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: editing
      ? {
          id: editing.id,
          categoryId: editing.categoryId,
          year,
          month,
          limit: (editing.limitCents / 100).toFixed(2).replace(".", ","),
        }
      : { categoryId: "", year, month, limit: "" },
  });

  async function onSubmit(values: BudgetFormInput) {
    try {
      await saveBudget(values);
      toast.success(editing ? "Orçamento atualizado." : "Orçamento criado.");
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar orçamento.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {editing ? "Editar orçamento" : "Novo orçamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <input type="hidden" {...register("year", { valueAsNumber: true })} />
          <input type="hidden" {...register("month", { valueAsNumber: true })} />

          <CategorySelect
            id="budget-category"
            label="Categoria"
            kind="expense"
            categories={categories}
            value={watch("categoryId")}
            onChange={(value) => setValue("categoryId", value)}
            error={errors.categoryId?.message}
          />

          <MoneyInput
            label="Limite mensal"
            error={errors.limit?.message}
            {...register("limit")}
          />

          <Button type="submit" size="lg" className="h-11 mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar orçamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
