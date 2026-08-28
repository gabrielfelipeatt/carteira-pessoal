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
import { saveIncome, saveExpense } from "@/lib/actions/transactions";
import {
  incomeFormSchema,
  expenseFormSchema,
  type IncomeFormInput,
  type ExpenseFormInput,
} from "@/lib/validation/transactions";
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

export function IncomeExpenseForm({
  type,
  open,
  onOpenChange,
  accounts,
  categories,
  paymentMethods,
  editing,
  onSaved,
}: {
  type: "income" | "expense";
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
  onSaved?: () => void;
}) {
  const schema = type === "income" ? incomeFormSchema : expenseFormSchema;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormInput | ExpenseFormInput>({
    resolver: zodResolver(schema),
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

  async function onSubmit(values: IncomeFormInput | ExpenseFormInput) {
    try {
      if (type === "income") {
        await saveIncome(values);
      } else {
        await saveExpense(values);
      }
      toast.success(
        type === "income" ? "Receita registrada." : "Despesa registrada.",
      );
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar lançamento.",
      );
    }
  }

  const title =
    type === "income"
      ? editing
        ? "Editar receita"
        : "Nova receita"
      : editing
        ? "Editar despesa"
        : "Nova despesa";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle
            className={
              "font-heading " + (type === "income" ? "text-income" : "text-expense")
            }
          >
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <DateField label="Data" error={errors.date?.message} {...register("date")} />

          <AccountSelect
            id={`${type}-account`}
            label="Conta"
            accounts={accounts}
            value={watch("accountId")}
            onChange={(value) => setValue("accountId", value)}
            error={errors.accountId?.message}
          />

          <CategorySelect
            id={`${type}-category`}
            label="Categoria"
            kind={type}
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
            id={`${type}-payment-method`}
            label={type === "income" ? "Forma de recebimento" : "Forma de pagamento"}
            paymentMethods={paymentMethods}
            value={watch("paymentMethodId")}
            onChange={(value) => setValue("paymentMethodId", value)}
            error={errors.paymentMethodId?.message}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${type}-description`}>Descrição</Label>
            <Input
              id={`${type}-description`}
              className="h-11"
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${type}-notes`}>Observações (opcional)</Label>
            <Textarea id={`${type}-notes`} rows={2} {...register("notes")} />
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
