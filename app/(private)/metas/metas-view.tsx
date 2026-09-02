"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PiggyBank, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/finance/states";
import { GoalProgress } from "@/components/finance/goal-progress";
import { GoalForm } from "@/components/finance/goal-form";
import { GoalContributionForm } from "@/components/finance/goal-contribution-form";
import { removeGoal } from "@/lib/actions/goals";
import type { accounts as accountsTable, goals as goalsTable } from "@/db/schema";
import type { GoalStatus } from "@/lib/finance/goals";

type Account = typeof accountsTable.$inferSelect;
type GoalRow = typeof goalsTable.$inferSelect & {
  progressCents: number;
  status: GoalStatus;
};

type FormDialog = { open: false } | { open: true; goal?: GoalRow };

export function MetasView({
  goals,
  accounts,
}: {
  goals: GoalRow[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<FormDialog>({ open: false });
  const [contributing, setContributing] = useState<GoalRow | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleRemove(id: string) {
    try {
      await removeGoal(id);
      toast.success("Meta removida.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover meta.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Metas</h1>
          <p className="text-sm text-muted-foreground">
            Objetivos de economia, com progresso sempre derivado dos seus aportes.
          </p>
        </div>
        {goals.length > 0 ? (
          <Button size="sm" className="h-9 gap-1" onClick={() => setDialog({ open: true })}>
            <Plus className="size-4" aria-hidden />
            Novo
          </Button>
        ) : null}
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="size-8 text-muted-foreground" aria-hidden />}
          title="Nenhuma meta cadastrada"
          description="Crie um objetivo de economia (viagem, reserva de emergência...) e registre aportes de qualquer conta — o progresso é sempre calculado a partir deles, nunca um contador solto."
          action={
            <Button size="lg" className="h-11" onClick={() => setDialog({ open: true })}>
              Criar meta
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
          {goals.map((goal) => (
            <GoalProgress
              key={goal.id}
              goal={goal}
              onEdit={() => setDialog({ open: true, goal })}
              onContribute={() => setContributing(goal)}
              onRemoved={() => handleRemove(goal.id)}
            />
          ))}
        </div>
      )}

      {dialog.open ? (
        <GoalForm
          open
          goal={dialog.goal}
          onOpenChange={(open) => !open && setDialog({ open: false })}
          onSaved={refresh}
        />
      ) : null}

      {contributing ? (
        <GoalContributionForm
          open
          goalId={contributing.id}
          goalName={contributing.name}
          accounts={accounts}
          onOpenChange={(open) => !open && setContributing(null)}
          onSaved={() => {
            setContributing(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}
