"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MoneyText } from "@/components/finance/money-text";
import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/lib/actions/budgets";

export type Budget = {
  id: string;
  categoryId: string;
  categoryName: string;
  limitCents: number;
  consumedCents: number;
  remainingCents: number;
  percentage: number;
  status: BudgetStatus;
};

const statusStyles: Record<BudgetStatus, string> = {
  normal: "bg-income",
  atencao: "bg-[color:var(--chart-4)]",
  acima: "bg-destructive",
};

const statusLabels: Record<BudgetStatus, string> = {
  normal: "Dentro do limite",
  atencao: "Perto do limite",
  acima: "Acima do limite",
};

export function BudgetProgress({
  budget,
  onEdit,
  onRemoved,
}: {
  budget: Budget;
  onEdit: () => void;
  onRemoved: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card px-4 py-3",
        budget.status === "acima" ? "border-destructive/40" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {budget.categoryName}
          </p>
          <p className="text-xs text-muted-foreground">{statusLabels[budget.status]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-11"
            aria-label="Editar orçamento"
            onClick={onEdit}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remover orçamento"
                  className="size-11 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover este orçamento?</AlertDialogTitle>
                <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onRemoved}>Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", statusStyles[budget.status])}
          style={{ width: `${Math.min(budget.percentage * 100, 100)}%` }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          <MoneyText cents={budget.consumedCents} tone="neutral" className="text-xs" /> de{" "}
          <MoneyText cents={budget.limitCents} tone="neutral" className="text-xs" />
        </span>
        <span className={budget.remainingCents < 0 ? "text-destructive" : "text-muted-foreground"}>
          {budget.remainingCents < 0 ? "excedeu " : "restam "}
          <MoneyText cents={Math.abs(budget.remainingCents)} tone="neutral" className="text-xs" />
        </span>
      </div>
    </div>
  );
}
