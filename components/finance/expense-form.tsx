"use client";

import { useEffect, useState } from "react";
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
import { DateField } from "@/components/finance/date-field";
import { AccountSelect } from "@/components/finance/account-select";
import { CategorySelect } from "@/components/finance/category-select";
import { PaymentMethodSelect } from "@/components/finance/payment-method-select";
import { CreditCardSelect } from "@/components/finance/credit-card-select";
import { saveExpense } from "@/lib/actions/transactions";
import { expenseFormSchema, type ExpenseFormInput } from "@/lib/validation/transactions";
import type {
  accounts as accountsTable,
  categories as categoriesTable,
  creditCards as creditCardsTable,
  paymentMethods as paymentMethodsTable,
} from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;
type Category = typeof categoriesTable.$inferSelect;
type PaymentMethod = typeof paymentMethodsTable.$inferSelect;
type CreditCard = typeof creditCardsTable.$inferSelect;

function todayLocalDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ExpenseForm({
  open,
  onOpenChange,
  accounts,
  categories,
  paymentMethods,
  creditCards,
  editing,
  prefill,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  creditCards: CreditCard[];
  editing?: {
    id: string;
    accountId: string;
    categoryId: string | null;
    paymentMethodId: string | null;
    amountCents: number;
    occurredAt: Date;
    description: string;
    notes: string | null;
    creditCardId: string | null;
  };
  /** Pré-preenche a confirmação de uma ocorrência de despesa fixa — nunca
   * usado junto com `editing` (aqui é sempre um lançamento novo). */
  prefill?: {
    fixedExpenseId: string;
    competencia: string;
    categoryId: string;
    paymentMethodId: string;
    creditCardId: string | null;
    accountId: string | null;
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
  } = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseFormSchema),
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
          isCredit: !!editing.creditCardId,
          creditCardId: editing.creditCardId ?? "",
        }
      : prefill
        ? {
            date: prefill.date,
            amount: (prefill.amountCents / 100).toFixed(2).replace(".", ","),
            description: prefill.description,
            notes: "",
            accountId: prefill.accountId ?? "",
            categoryId: prefill.categoryId,
            paymentMethodId: prefill.paymentMethodId,
            isCredit: !!prefill.creditCardId,
            creditCardId: prefill.creditCardId ?? "",
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
            isCredit: false,
            creditCardId: "",
          },
  });

  const [isInstallment, setIsInstallment] = useState(false);

  const paymentMethodId = watch("paymentMethodId");
  const isCredit = paymentMethods.find((m) => m.id === paymentMethodId)?.kind === "credito";

  // Mantém o campo `isCredit` do formulário em sincronia com a forma de
  // pagamento escolhida — o resolver do Zod valida contra o estado do RHF,
  // não contra esta variável derivada, e o campo de conta some da tela
  // quando é crédito, então um erro de validação nele nunca apareceria.
  useEffect(() => {
    setValue("isCredit", isCredit);
  }, [isCredit, setValue]);

  async function onSubmit(values: ExpenseFormInput) {
    try {
      await saveExpense(values);
      toast.success("Despesa registrada.");
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
          <DialogTitle className="font-heading text-expense">
            {editing ? "Editar despesa" : prefill ? "Confirmar despesa fixa" : "Nova despesa"}
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

          <PaymentMethodSelect
            id="expense-payment-method"
            label="Forma de pagamento"
            paymentMethods={paymentMethods}
            value={paymentMethodId}
            onChange={(value) => setValue("paymentMethodId", value)}
            error={errors.paymentMethodId?.message}
          />

          {isCredit ? (
            <CreditCardSelect
              id="expense-credit-card"
              label="Cartão"
              creditCards={creditCards}
              value={watch("creditCardId")}
              onChange={(value) => setValue("creditCardId", value)}
              error={errors.creditCardId?.message}
            />
          ) : (
            <AccountSelect
              id="expense-account"
              label="Conta"
              accounts={accounts}
              value={watch("accountId")}
              onChange={(value) => setValue("accountId", value)}
              error={errors.accountId?.message}
            />
          )}

          {isCredit && !editing ? (
            <>
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <Label htmlFor="expense-installment" className="text-sm">
                  Parcelar compra
                </Label>
                <Switch
                  id="expense-installment"
                  checked={isInstallment}
                  onCheckedChange={(checked) => {
                    setIsInstallment(checked);
                    setValue("installmentCount", checked ? 2 : undefined);
                  }}
                />
              </div>
              {isInstallment ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="expense-installment-count">Número de parcelas</Label>
                  <Input
                    id="expense-installment-count"
                    type="number"
                    min={2}
                    max={48}
                    className="h-11"
                    aria-invalid={!!errors.installmentCount}
                    {...register("installmentCount", { valueAsNumber: true })}
                  />
                  {errors.installmentCount ? (
                    <p className="text-sm text-destructive">
                      {errors.installmentCount.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          <CategorySelect
            id="expense-category"
            label="Categoria"
            kind="expense"
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-description">Descrição</Label>
            <Input
              id="expense-description"
              className="h-11"
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-notes">Observações (opcional)</Label>
            <Textarea id="expense-notes" rows={2} {...register("notes")} />
          </div>

          <Button type="submit" size="lg" className="h-11 mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
