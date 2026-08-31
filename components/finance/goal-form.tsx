"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/finance/money-input";
import { accountColorOptions } from "@/lib/validation/accounts";
import { cn } from "@/lib/utils";
import { saveGoal } from "@/lib/actions/goals";
import { goalFormSchema, type GoalFormInput } from "@/lib/validation/goals";
import type { goals as goalsTable } from "@/db/schema";

type Goal = typeof goalsTable.$inferSelect;

export function GoalForm({
  open,
  onOpenChange,
  goal,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal;
  onSaved?: () => void;
}) {
  const [colorValue, setColorValue] = useState(goal?.color ?? accountColorOptions[0]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormInput>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: goal
      ? {
          id: goal.id,
          name: goal.name,
          targetAmount: (goal.targetCents / 100).toFixed(2).replace(".", ","),
          targetMonth: goal.targetMonth ?? "",
          color: goal.color,
          isActive: goal.isActive,
          notes: goal.notes ?? "",
        }
      : {
          name: "",
          targetAmount: "",
          targetMonth: "",
          color: accountColorOptions[0],
          isActive: true,
          notes: "",
        },
  });

  async function onSubmit(values: GoalFormInput) {
    try {
      await saveGoal({ ...values, color: colorValue });
      toast.success(goal ? "Meta atualizada." : "Meta criada.");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar meta.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {goal ? "Editar meta" : "Nova meta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-name">Nome</Label>
            <Input
              id="goal-name"
              className="h-11"
              placeholder="Ex: Viagem, Reserva de emergência..."
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <MoneyInput
            label="Valor-alvo"
            error={errors.targetAmount?.message}
            {...register("targetAmount")}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-target-month">Mês-alvo (opcional)</Label>
            <Input
              id="goal-target-month"
              type="month"
              className="h-11"
              aria-invalid={!!errors.targetMonth}
              {...register("targetMonth")}
            />
            {errors.targetMonth ? (
              <p className="text-sm text-destructive">{errors.targetMonth.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {accountColorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cor ${color}`}
                  aria-pressed={colorValue === color}
                  onClick={() => setColorValue(color)}
                  className={cn(
                    "size-9 rounded-full border-2 transition-transform",
                    colorValue === color
                      ? "scale-110 border-foreground"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-notes">Observações (opcional)</Label>
            <Textarea id="goal-notes" rows={2} {...register("notes")} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <Label htmlFor="goal-active" className="text-sm">
              Ativa
            </Label>
            <Switch
              id="goal-active"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
          </div>

          <Button type="submit" size="lg" className="h-11 mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar meta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
