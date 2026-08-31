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
import { CategorySelect } from "@/components/finance/category-select";
import { PaymentMethodSelect } from "@/components/finance/payment-method-select";
import { saveIncome } from "@/lib/actions/transactions";
import { incomeFormSchema, type IncomeFormInput } from "@/lib/validation/transactions";
import type {
  accounts as accountsTable,
  categories as categoriesTable,
  paymentMethods as paymentMethodsTable,
} from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;
type Category = typeof categoriesTable.$inferSelect;
type PaymentMethod = typeof paymentMethodsTable.$inferSelect;

function todayLocalDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function IncomeForm({
  open,
  onOpenChange,
  accounts,
  categories,
  paymentMethods,
  editing,
  prefill,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  editing?: {
    id: string;
    accountId: string;
    categoryId: string | null;
    paymentMethodId: string | null;
    amountCents: number;
    occurredAt: Date;
    description: string;
    notes: string | null;
  };
  /** Pré-preenche a confirmação de uma ocorrência de receita fixa — nunca
   * usado junto com `editing` (aqui é sempre um lançamento novo). */
  prefill?: {
    fixedExpenseId: string;
    competencia: string;
    categoryId: string;
    paymentMethodId: string;
    accountId: string;
    amountCents: number;
    date: string;
    description: string;
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
  } = useForm<IncomeFormInput>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: editing
      ? {
          id: editing.id,
          date: editing.occurredAt.toISOString().slice(0, 10),
          amount: (editing.amountCents / 100).toFixed(2).replace(".", ","),
          description: editing.description,
          notes: editing.notes ?? "",
          accountId: editing.accountId,
          categoryId: editing.categoryId ?? "",
          paymentMethodId: editing.paymentMethodId ?? "",
        }
      : prefill
        ? {
            date: prefill.date,
            amount: (prefill.amountCents / 100).toFixed(2).replace(".", ","),
            description: prefill.description,
            notes: "",
            accountId: prefill.accountId,
            categoryId: prefill.categoryId,
            paymentMethodId: prefill.paymentMethodId,
            fixedExpenseId: prefill.fixedExpenseId,
            competencia: prefill.competencia,
          }
        : {
            date: todayLocalDateString(),
            amount: "",
            description: "",
            notes: "",
            accountId: "",
            categoryId: "",
            paymentMethodId: "",
          },
  });

  async function onSubmit(values: IncomeFormInput) {
    try {
      await saveIncome(values);
      toast.success("Receita registrada.");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar lançamento.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-income">
            {editing ? "Editar receita" : prefill ? "Confirmar receita fixa" : "Nova receita"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {prefill ? (
            <>
              <input type="hidden" {...register("fixedExpenseId")} />
              <input type="hidden" {...register("competencia")} />
            </>
          ) : null}

          <DateField label="Data" error={errors.date?.message} {...register("date")} />

          <AccountSelect
            id="income-account"
            label="Conta"
            accounts={accounts}
            value={watch("accountId")}
            onChange={(value) => setValue("accountId", value)}
            error={errors.accountId?.message}
          />

          <CategorySelect
            id="income-category"
            label="Categoria"
            kind="income"
            categories={categories}
            value={watch("categoryId")}
            onChange={(value) => setValue("categoryId", value)}
            error={errors.categoryId?.message}
          />

          <MoneyInput
            label="Valor"
            error={errors.amount?.message}
            {...register("amount")}
          />

          <PaymentMethodSelect
            id="income-payment-method"
            label="Forma de recebimento"
            paymentMethods={paymentMethods}
            value={watch("paymentMethodId")}
            onChange={(value) => setValue("paymentMethodId", value)}
            error={errors.paymentMethodId?.message}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="income-description">Descrição</Label>
            <Input
              id="income-description"
              className="h-11"
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="income-notes">Observações (opcional)</Label>
            <Textarea id="income-notes" rows={2} {...register("notes")} />
          </div>

          <Button type="submit" size="lg" className="h-11 mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
