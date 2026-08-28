"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/finance/money-input";
import { DateField } from "@/components/finance/date-field";
import { AccountSelect } from "@/components/finance/account-select";
import { saveAdjustment } from "@/lib/actions/transactions";
import {
  adjustmentFormSchema,
  type AdjustmentFormInput,
} from "@/lib/validation/transactions";
import type { accounts as accountsTable } from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;

function todayLocalDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AdjustmentForm({
  open,
  onOpenChange,
  accounts,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  editing?: {
    id: string;
    accountId: string;
    direction: "inflow" | "outflow";
    amountCents: number;
    occurredAt: Date;
    description: string;
    notes: string | null;
  };
  onSaved?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdjustmentFormInput>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: editing
      ? {
          id: editing.id,
          date: editing.occurredAt.toISOString().slice(0, 10),
          amount: (editing.amountCents / 100).toFixed(2).replace(".", ","),
          description: editing.description,
          notes: editing.notes ?? "",
          accountId: editing.accountId,
          direction: editing.direction,
        }
      : {
          date: todayLocalDateString(),
          amount: "",
          description: "",
          notes: "",
          accountId: "",
          direction: "inflow",
        },
  });

  async function onSubmit(values: AdjustmentFormInput) {
    try {
      await saveAdjustment(values);
      toast.success("Ajuste registrado.");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar ajuste.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {editing ? "Editar ajuste de saldo" : "Novo ajuste de saldo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <DateField label="Data" error={errors.date?.message} {...register("date")} />

          <AccountSelect
            id="adjustment-account"
            label="Conta"
            accounts={accounts}
            value={watch("accountId")}
            onChange={(value) => setValue("accountId", value)}
            error={errors.accountId?.message}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjustment-direction">O saldo deve...</Label>
            <Select
              value={watch("direction")}
              onValueChange={(value) =>
                setValue("direction", value as AdjustmentFormInput["direction"])
              }
            >
              <SelectTrigger id="adjustment-direction" className="h-11 w-full">
                <SelectValue>
                  {(selected: AdjustmentFormInput["direction"] | null) =>
                    selected === "inflow"
                      ? "Aumentar"
                      : selected === "outflow"
                        ? "Reduzir"
                        : "Selecione"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inflow">Aumentar</SelectItem>
                <SelectItem value="outflow">Reduzir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <MoneyInput
            label="Valor do ajuste"
            error={errors.amount?.message}
            {...register("amount")}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjustment-description">Descrição</Label>
            <Input
              id="adjustment-description"
              className="h-11"
              placeholder="Ex: Conciliação com o extrato do banco"
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjustment-notes">Observações (opcional)</Label>
            <Textarea id="adjustment-notes" rows={2} {...register("notes")} />
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-11 mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
