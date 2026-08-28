"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/finance/money-input";
import { AccountSelect } from "@/components/finance/account-select";
import { CategorySelect } from "@/components/finance/category-select";
import { PaymentMethodSelect } from "@/components/finance/payment-method-select";
import { CreditCardSelect } from "@/components/finance/credit-card-select";
import { saveFixedExpense } from "@/lib/actions/fixed-expenses";
import { currentYearMonth } from "@/lib/finance/dates";
import {
  fixedExpenseFormSchema,
  type FixedExpenseFormInput,
} from "@/lib/validation/fixed-expenses";
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

export function FixedExpenseForm({
  open,
  onOpenChange,
  accounts,
  categories,
  paymentMethods,
  creditCards,
  editing,
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
    description: string;
    categoryId: string;
    amountCents: number;
    dayOfMonth: number;
    paymentMethodId: string;
    creditCardId: string | null;
    accountId: string | null;
    startMonth: string;
    endMonth: string | null;
    isActive: boolean;
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
  } = useForm<FixedExpenseFormInput>({
    resolver: zodResolver(fixedExpenseFormSchema),
    defaultValues: editing
      ? {
          id: editing.id,
          description: editing.description,
          categoryId: editing.categoryId,
          amount: (editing.amountCents / 100).toFixed(2).replace(".", ","),
          dayOfMonth: editing.dayOfMonth,
          paymentMethodId: editing.paymentMethodId,
          isCredit: !!editing.creditCardId,
          creditCardId: editing.creditCardId ?? "",
          accountId: editing.accountId ?? "",
          startMonth: editing.startMonth,
          endMonth: editing.endMonth ?? "",
          isActive: editing.isActive,
          notes: editing.notes ?? "",
        }
      : {
          description: "",
          categoryId: "",
          amount: "",
          dayOfMonth: 5,
          paymentMethodId: "",
          isCredit: false,
          creditCardId: "",
          accountId: "",
          startMonth: currentYearMonth(),
          endMonth: "",
          isActive: true,
          notes: "",
        },
  });

  const paymentMethodId = watch("paymentMethodId");
  const isCredit = paymentMethods.find((m) => m.id === paymentMethodId)?.kind === "credito";

  // Mesma razão de expense-form.tsx: o resolver do Zod valida contra o
  // estado do RHF, não contra a variável derivada.
  useEffect(() => {
    setValue("isCredit", isCredit);
  }, [isCredit, setValue]);

  async function onSubmit(values: FixedExpenseFormInput) {
    try {
      await saveFixedExpense(values);
      toast.success(editing ? "Despesa fixa atualizada." : "Despesa fixa criada.");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar despesa fixa.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {editing ? "Editar despesa fixa" : "Nova despesa fixa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fixed-expense-description">Descrição</Label>
            <Input
              id="fixed-expense-description"
              className="h-11"
              placeholder="Ex: Conta de luz, Internet..."
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <PaymentMethodSelect
            id="fixed-expense-payment-method"
            label="Forma de pagamento"
            paymentMethods={paymentMethods}
            value={paymentMethodId}
            onChange={(value) => setValue("paymentMethodId", value)}
            error={errors.paymentMethodId?.message}
          />

          {isCredit ? (
            <CreditCardSelect
              id="fixed-expense-credit-card"
              label="Cartão"
              creditCards={creditCards}
              value={watch("creditCardId")}
              onChange={(value) => setValue("creditCardId", value)}
              error={errors.creditCardId?.message}
            />
          ) : (
            <AccountSelect
              id="fixed-expense-account"
              label="Conta"
              accounts={accounts}
              value={watch("accountId")}
              onChange={(value) => setValue("accountId", value)}
              error={errors.accountId?.message}
            />
          )}

          <CategorySelect
            id="fixed-expense-category"
            label="Categoria"
            kind="expense"
            categories={categories}
            value={watch("categoryId")}
            onChange={(value) => setValue("categoryId", value)}
            error={errors.categoryId?.message}
          />

          <MoneyInput
            label="Valor sugerido"
            error={errors.amount?.message}
            {...register("amount")}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fixed-expense-day">Dia do mês</Label>
            <Input
              id="fixed-expense-day"
              type="number"
              min={1}
              max={31}
              className="h-11"
              aria-invalid={!!errors.dayOfMonth}
              {...register("dayOfMonth", { valueAsNumber: true })}
            />
            {errors.dayOfMonth ? (
              <p className="text-sm text-destructive">{errors.dayOfMonth.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fixed-expense-start-month">Começa em</Label>
              <Input
                id="fixed-expense-start-month"
                type="month"
                className="h-11"
                aria-invalid={!!errors.startMonth}
                {...register("startMonth")}
              />
              {errors.startMonth ? (
                <p className="text-sm text-destructive">{errors.startMonth.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fixed-expense-end-month">Termina em (opcional)</Label>
              <Input
                id="fixed-expense-end-month"
                type="month"
                className="h-11"
                aria-invalid={!!errors.endMonth}
                {...register("endMonth")}
              />
              {errors.endMonth ? (
                <p className="text-sm text-destructive">{errors.endMonth.message}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fixed-expense-notes">Observações (opcional)</Label>
            <Textarea id="fixed-expense-notes" rows={2} {...register("notes")} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <Label htmlFor="fixed-expense-active" className="text-sm">
              Ativa
            </Label>
            <Switch
              id="fixed-expense-active"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
          </div>

          <Button type="submit" size="lg" className="h-11 mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar despesa fixa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
