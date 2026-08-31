"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/finance/states";
import { MoneyText } from "@/components/finance/money-text";
import { ExpenseForm } from "@/components/finance/expense-form";
import { IncomeForm } from "@/components/finance/income-form";
import { FixedExpenseForm } from "@/components/finance/fixed-expense-form";
import {
  removeFixedExpense,
  skipFixedExpenseOccurrence,
} from "@/lib/actions/fixed-expenses";
import { formatMonthLabel } from "@/lib/finance/dates";
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

type FixedExpense = {
  id: string;
  type: "income" | "expense";
  description: string;
  categoryId: string;
  categoryName: string;
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

type PendingOccurrence = {
  fixedExpenseId: string;
  type: "income" | "expense";
  description: string;
  categoryId: string;
  categoryName: string;
  suggestedAmountCents: number;
  paymentMethodId: string;
  creditCardId: string | null;
  accountId: string | null;
  competencia: string;
  occurrenceDateString: string;
};

const typeLabels: Record<"income" | "expense", string> = {
  income: "Receita",
  expense: "Despesa",
};

type FormDialog = { open: false } | { open: true; editing?: FixedExpense };

export function DespesasFixasView({
  fixedExpenses,
  pending,
  accounts,
  categories,
  paymentMethods,
  creditCards,
}: {
  fixedExpenses: FixedExpense[];
  pending: PendingOccurrence[];
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  creditCards: CreditCard[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<FormDialog>({ open: false });
  const [confirming, setConfirming] = useState<PendingOccurrence | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleRemove(id: string) {
    try {
      await removeFixedExpense(id);
      toast.success("Lançamento fixo removido.");
      refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao remover lançamento fixo.",
      );
    }
  }

  async function handleSkip(occurrence: PendingOccurrence) {
    try {
      await skipFixedExpenseOccurrence(occurrence.fixedExpenseId, occurrence.competencia);
      toast.success("Mês dispensado.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao dispensar mês.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Lançamentos fixos
          </h1>
          <p className="text-sm text-muted-foreground">
            Receitas e despesas recorrentes, como salário, luz, água e internet.
          </p>
        </div>
        {fixedExpenses.length > 0 ? (
          <Button
            size="sm"
            className="h-9 gap-1"
            onClick={() => setDialog({ open: true })}
          >
            <Plus className="size-4" aria-hidden />
            Novo
          </Button>
        ) : null}
      </div>

      {fixedExpenses.length === 0 ? (
        <EmptyState
          icon={<Repeat className="size-8 text-muted-foreground" aria-hidden />}
          title="Nenhum lançamento fixo cadastrado"
          description="Cadastre uma receita ou despesa recorrente uma única vez e confirme o lançamento todo mês, sem digitar tudo de novo."
          action={
            <Button size="lg" className="h-11" onClick={() => setDialog({ open: true })}>
              Criar lançamento fixo
            </Button>
          }
        />
      ) : (
        <>
          {pending.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="font-heading text-sm font-semibold text-muted-foreground">
                Pendentes
              </h2>
              {pending.map((occurrence) => (
                <div
                  key={`${occurrence.fixedExpenseId}-${occurrence.competencia}`}
                  className="rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {occurrence.description}
                        </p>
                        <Badge variant="secondary">{typeLabels[occurrence.type]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatMonthLabel(occurrence.competencia)}
                      </p>
                    </div>
                    <MoneyText
                      cents={
                        occurrence.type === "expense"
                          ? -occurrence.suggestedAmountCents
                          : occurrence.suggestedAmountCents
                      }
                      tone="auto"
                      className="shrink-0 text-sm"
                    />
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button variant="outline" size="sm" className="h-9">
                            Dispensar
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Dispensar {formatMonthLabel(occurrence.competencia)}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Nenhum lançamento é criado para este mês. A despesa
                            fixa continua ativa para os próximos meses.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleSkip(occurrence)}>
                            Dispensar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      size="sm"
                      className="h-9"
                      onClick={() => setConfirming(occurrence)}
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-sm font-semibold text-muted-foreground">
              Cadastradas
            </h2>
            {fixedExpenses.map((fixedExpense) => (
              <div
                key={fixedExpense.id}
                className="rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {fixedExpense.description}
                      </p>
                      <Badge variant="secondary">{typeLabels[fixedExpense.type]}</Badge>
                      {!fixedExpense.isActive ? (
                        <Badge variant="secondary">Pausada</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fixedExpense.categoryName} · todo dia {fixedExpense.dayOfMonth}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <MoneyText
                      cents={
                        fixedExpense.type === "expense"
                          ? -fixedExpense.amountCents
                          : fixedExpense.amountCents
                      }
                      tone="auto"
                      className="mr-1 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-11"
                      aria-label="Editar lançamento fixo"
                      onClick={() => setDialog({ open: true, editing: fixedExpense })}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Remover lançamento fixo"
                            className="size-11 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover este lançamento fixo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Só é possível remover um lançamento fixo sem
                            lançamentos gerados. Essa ação não pode ser
                            desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemove(fixedExpense.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {dialog.open ? (
        <FixedExpenseForm
          open
          accounts={accounts}
          categories={categories}
          paymentMethods={paymentMethods}
          creditCards={creditCards}
          editing={dialog.editing}
          onOpenChange={(open) => !open && setDialog({ open: false })}
          onSaved={refresh}
        />
      ) : null}

      {confirming && confirming.type === "expense" ? (
        <ExpenseForm
          open
          accounts={accounts}
          categories={categories}
          paymentMethods={paymentMethods}
          creditCards={creditCards}
          prefill={{
            fixedExpenseId: confirming.fixedExpenseId,
            competencia: confirming.competencia,
            categoryId: confirming.categoryId,
            paymentMethodId: confirming.paymentMethodId,
            creditCardId: confirming.creditCardId,
            accountId: confirming.accountId,
            amountCents: confirming.suggestedAmountCents,
            date: confirming.occurrenceDateString,
            description: confirming.description,
          }}
          onOpenChange={(open) => !open && setConfirming(null)}
          onSaved={() => {
            setConfirming(null);
            refresh();
          }}
        />
      ) : null}

      {confirming && confirming.type === "income" ? (
        <IncomeForm
          open
          accounts={accounts}
          categories={categories}
          paymentMethods={paymentMethods}
          prefill={{
            fixedExpenseId: confirming.fixedExpenseId,
            competencia: confirming.competencia,
            categoryId: confirming.categoryId,
            paymentMethodId: confirming.paymentMethodId,
            accountId: confirming.accountId ?? "",
            amountCents: confirming.suggestedAmountCents,
            date: confirming.occurrenceDateString,
            description: confirming.description,
          }}
          onOpenChange={(open) => !open && setConfirming(null)}
          onSaved={() => {
            setConfirming(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}
