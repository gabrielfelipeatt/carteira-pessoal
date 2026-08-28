"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/finance/money-input";
import { AccountSelect } from "@/components/finance/account-select";
import { payStatementAction } from "@/lib/actions/statements";
import { formatCentsToBRL } from "@/lib/finance/money";
import type { accounts as accountsTable } from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;

const paySchema = z.object({
  amount: z.string().min(1, "Informe o valor."),
  payingAccountId: z.string().min(1, "Selecione a conta de pagamento."),
});
type PayInput = z.infer<typeof paySchema>;

export function PayStatementForm({
  open,
  onOpenChange,
  statementId,
  remainingCents,
  accounts,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statementId: string;
  remainingCents: number;
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
  } = useForm<PayInput>({
    resolver: zodResolver(paySchema),
    defaultValues: {
      amount: (remainingCents / 100).toFixed(2).replace(".", ","),
      payingAccountId: "",
    },
  });

  async function onSubmit(values: PayInput) {
    try {
      await payStatementAction({ statementId, ...values });
      toast.success("Pagamento registrado.");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao registrar pagamento.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Pagar fatura</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted-foreground">
            Saldo restante: <span className="font-mono tabular-nums">{formatCentsToBRL(remainingCents)}</span>
          </p>

          <AccountSelect
            id="pay-statement-account"
            label="Pagar com a conta"
            accounts={accounts}
            value={watch("payingAccountId")}
            onChange={(value) => setValue("payingAccountId", value)}
            error={errors.payingAccountId?.message}
          />

          <MoneyInput
            label="Valor do pagamento"
            error={errors.amount?.message}
            {...register("amount")}
          />

          <Button type="submit" size="lg" className="h-11 mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Registrando…" : "Registrar pagamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
