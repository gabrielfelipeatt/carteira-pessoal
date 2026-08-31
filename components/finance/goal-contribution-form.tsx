"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/finance/money-input";
import { DateField } from "@/components/finance/date-field";
import { AccountSelect } from "@/components/finance/account-select";
import { contributeToGoal } from "@/lib/actions/goals";
import {
  goalContributionFormSchema,
  type GoalContributionFormInput,
} from "@/lib/validation/goals";
import type { accounts as accountsTable } from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;

function todayLocalDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function GoalContributionForm({
  open,
  onOpenChange,
  goalId,
  goalName,
  accounts,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalName: string;
  accounts: Account[];
  onSaved?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GoalContributionFormInput>({
    resolver: zodResolver(goalContributionFormSchema),
    defaultValues: {
      goalId,
      accountId: "",
      amount: "",
      date: todayLocalDateString(),
      mode: "aporte",
      notes: "",
    },
  });

  const mode = watch("mode");

  async function onSubmit(values: GoalContributionFormInput) {
    try {
      await contributeToGoal(values);
      toast.success(mode === "aporte" ? "Aporte registrado." : "Resgate registrado.");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao registrar movimentação.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{goalName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <input type="hidden" {...register("goalId")} />

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "aporte" ? "default" : "outline"}
              className={mode === "aporte" ? "h-10 bg-income text-income-foreground hover:bg-income/90" : "h-10"}
              onClick={() => setValue("mode", "aporte")}
            >
              Aportar
            </Button>
            <Button
              type="button"
              variant={mode === "resgate" ? "default" : "outline"}
              className={mode === "resgate" ? "h-10 bg-expense text-expense-foreground hover:bg-expense/90" : "h-10"}
              onClick={() => setValue("mode", "resgate")}
            >
              Resgatar
            </Button>
          </div>

          <AccountSelect
            id="goal-contribution-account"
            label={mode === "aporte" ? "Sai da conta" : "Volta pra conta"}
            accounts={accounts}
            value={watch("accountId")}
            onChange={(value) => setValue("accountId", value)}
            error={errors.accountId?.message}
          />

          <MoneyInput
            label="Valor"
            error={errors.amount?.message}
            {...register("amount")}
          />

          <DateField label="Data" error={errors.date?.message} {...register("date")} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-contribution-notes">Observações (opcional)</Label>
            <Textarea id="goal-contribution-notes" rows={2} {...register("notes")} />
          </div>

          <Button type="submit" size="lg" className="h-11 mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : mode === "aporte" ? "Registrar aporte" : "Registrar resgate"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
