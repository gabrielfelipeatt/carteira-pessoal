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
import { MoneyInput } from "@/components/finance/money-input";
import { DateField } from "@/components/finance/date-field";
import { AccountSelect } from "@/components/finance/account-select";
import { PaymentMethodSelect } from "@/components/finance/payment-method-select";
import { saveTransfer } from "@/lib/actions/transactions";
import {
  transferFormSchema,
  type TransferFormInput,
} from "@/lib/validation/transactions";
import type {
  accounts as accountsTable,
  paymentMethods as paymentMethodsTable,
} from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;
type PaymentMethod = typeof paymentMethodsTable.$inferSelect;

function todayLocalDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TransferForm({
  open,
  onOpenChange,
  accounts,
  paymentMethods,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  paymentMethods: PaymentMethod[];
  editing?: {
    transferGroupId: string;
    originAccountId: string;
    destinationAccountId: string;
    paymentMethodId: string | null;
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
  } = useForm<TransferFormInput>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: editing
      ? {
          id: editing.transferGroupId,
          date: editing.occurredAt.toISOString().slice(0, 10),
          amount: (editing.amountCents / 100).toFixed(2).replace(".", ","),
          description: editing.description,
          notes: editing.notes ?? "",
          originAccountId: editing.originAccountId,
          destinationAccountId: editing.destinationAccountId,
          paymentMethodId: editing.paymentMethodId ?? "",
        }
      : {
          date: todayLocalDateString(),
          amount: "",
          description: "",
          notes: "",
          originAccountId: "",
          destinationAccountId: "",
          paymentMethodId: "",
        },
  });

  async function onSubmit(values: TransferFormInput) {
    try {
      await saveTransfer(values);
      toast.success("Transferência registrada.");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar transferência.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {editing ? "Editar transferência" : "Nova transferência"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <DateField label="Data" error={errors.date?.message} {...register("date")} />

          <AccountSelect
            id="transfer-origin"
            label="Conta de origem"
            accounts={accounts}
            value={watch("originAccountId")}
            onChange={(value) => setValue("originAccountId", value)}
            error={errors.originAccountId?.message}
          />

          <AccountSelect
            id="transfer-destination"
            label="Conta de destino"
            accounts={accounts}
            value={watch("destinationAccountId")}
            onChange={(value) => setValue("destinationAccountId", value)}
            error={errors.destinationAccountId?.message}
          />

          <MoneyInput
            label="Valor"
            error={errors.amount?.message}
            {...register("amount")}
          />

          <PaymentMethodSelect
            id="transfer-payment-method"
            label="Forma de transferência"
            paymentMethods={paymentMethods}
            value={watch("paymentMethodId")}
            onChange={(value) => setValue("paymentMethodId", value)}
            error={errors.paymentMethodId?.message}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-description">Descrição</Label>
            <Input
              id="transfer-description"
              className="h-11"
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-notes">Observações (opcional)</Label>
            <Textarea id="transfer-notes" rows={2} {...register("notes")} />
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
