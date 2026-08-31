"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import type { GoalStatus } from "@/lib/finance/goals";

export type Goal = {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  targetCents: number;
  progressCents: number;
  status: GoalStatus;
};

const statusLabels: Record<GoalStatus, string> = {
  no_prazo: "No prazo",
  atrasada: "Atrasada",
  concluida: "Concluída",
};

const statusTextClass: Record<GoalStatus, string> = {
  no_prazo: "text-muted-foreground",
  atrasada: "text-destructive",
  concluida: "text-income",
};

export function GoalProgress({
  goal,
  onEdit,
  onContribute,
  onRemoved,
}: {
  goal: Goal;
  onEdit: () => void;
  onContribute: () => void;
  onRemoved: () => void;
}) {
  const percentage = goal.targetCents > 0 ? goal.progressCents / goal.targetCents : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card px-4 py-3",
        goal.status === "atrasada" ? "border-destructive/40" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{goal.name}</p>
            {!goal.isActive ? <Badge variant="secondary">Pausada</Badge> : null}
          </div>
          <p className={cn("text-xs", statusTextClass[goal.status])}>
            {statusLabels[goal.status]}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-11"
            aria-label="Editar meta"
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
                  aria-label="Remover meta"
                  className="size-11 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover esta meta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Só é possível remover uma meta sem aportes ou resgates. Essa
                  ação não pode ser desfeita.
                </AlertDialogDescription>
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
          className="h-full rounded-full"
          style={{ width: `${Math.min(percentage * 100, 100)}%`, backgroundColor: goal.color }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          <MoneyText cents={goal.progressCents} tone="neutral" className="text-xs" /> de{" "}
          <MoneyText cents={goal.targetCents} tone="neutral" className="text-xs" />
        </span>
        <Button size="sm" className="h-8" onClick={onContribute}>
          Movimentar
        </Button>
      </div>
    </div>
  );
}
