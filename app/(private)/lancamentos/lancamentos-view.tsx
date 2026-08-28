"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  MoreHorizontal,
  Repeat,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/finance/states";
import { AccountList } from "@/components/finance/account-list";
import { AccountForm } from "@/components/finance/account-form";
import { IncomeForm } from "@/components/finance/income-form";
import { ExpenseForm } from "@/components/finance/expense-form";
import { TransferForm } from "@/components/finance/transfer-form";
import { AdjustmentForm } from "@/components/finance/adjustment-form";
import { OutrosSheet } from "@/components/finance/outros-sheet";
import {
  TransactionList,
  type EditPayload,
  type TransactionListItem,
} from "@/components/finance/transaction-list";
import type {
  accounts as accountsTable,
  categories as categoriesTable,
  creditCards as creditCardsTable,
  paymentMethods as paymentMethodsTable,
} from "@/db/schema";

type Account = typeof accountsTable.$inferSelect & { currentBalanceCents: number };
type Category = typeof categoriesTable.$inferSelect;
type PaymentMethod = typeof paymentMethodsTable.$inferSelect;
type CreditCard = typeof creditCardsTable.$inferSelect;

type Dialog =
  | { kind: "none" }
  | { kind: "account"; account?: Account }
  | { kind: "income"; editing?: Extract<EditPayload, { kind: "income" }> }
  | { kind: "expense"; editing?: Extract<EditPayload, { kind: "expense" }> }
  | { kind: "transfer"; editing?: Extract<EditPayload, { kind: "transfer" }> }
  | { kind: "adjustment"; editing?: Extract<EditPayload, { kind: "adjustment" }> }
  | { kind: "outros" };

export function LancamentosView({
  accounts,
  categories,
  paymentMethods,
  creditCards,
  transactions,
  pendingFixedExpensesCount,
}: {
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  creditCards: CreditCard[];
  transactions: TransactionListItem[];
  pendingFixedExpensesCount: number;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });

  function refresh() {
    router.refresh();
  }

  function handleEdit(payload: EditPayload) {
    if (payload.kind === "income") {
      setDialog({ kind: "income", editing: payload });
    } else if (payload.kind === "expense") {
      setDialog({ kind: "expense", editing: payload });
    } else if (payload.kind === "transfer") {
      setDialog({ kind: "transfer", editing: payload });
    } else {
      setDialog({ kind: "adjustment", editing: payload });
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Lançamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Receitas, despesas, transferências e ajustes.
          </p>
        </div>

        <EmptyState
          icon={<Wallet className="size-8 text-muted-foreground" aria-hidden />}
          title="Cadastre sua primeira conta"
          description="Para registrar um lançamento, você precisa de pelo menos uma conta (corrente, poupança, dinheiro...)."
          action={
            <Button
              size="lg"
              className="h-11"
              onClick={() => setDialog({ kind: "account" })}
            >
              Cadastrar conta
            </Button>
          }
        />

        <AccountForm
          open={dialog.kind === "account"}
          onOpenChange={(open) => setDialog(open ? { kind: "account" } : { kind: "none" })}
          onSaved={refresh}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Lançamentos
        </h1>
        <p className="text-sm text-muted-foreground">
          Receitas, despesas, transferências e ajustes.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          className="h-14 flex-col gap-1 bg-income text-income-foreground hover:bg-income/90"
          onClick={() => setDialog({ kind: "income" })}
        >
          <ArrowUpCircle className="size-5" aria-hidden />
          Receita
        </Button>
        <Button
          className="h-14 flex-col gap-1 bg-expense text-expense-foreground hover:bg-expense/90"
          onClick={() => setDialog({ kind: "expense" })}
        >
          <ArrowDownCircle className="size-5" aria-hidden />
          Despesa
        </Button>
        <Button
          variant="outline"
          className="h-14 flex-col gap-1"
          onClick={() => setDialog({ kind: "outros" })}
        >
          <MoreHorizontal className="size-5" aria-hidden />
          Outros
        </Button>
      </div>

      {pendingFixedExpensesCount > 0 ? (
        <Link
          href="/despesas-fixas"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
        >
          <Repeat className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="flex-1 text-sm text-foreground">
            Você tem {pendingFixedExpensesCount}{" "}
            {pendingFixedExpensesCount === 1
              ? "despesa fixa pendente"
              : "despesas fixas pendentes"}
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      ) : null}

      <AccountList
        accounts={accounts}
        onEdit={(account) => setDialog({ kind: "account", account })}
        onCreate={() => setDialog({ kind: "account" })}
      />

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold text-muted-foreground">
          Últimos lançamentos
        </h2>
        {transactions.length === 0 ? (
          <EmptyState
            title="Nenhum lançamento ainda"
            description="Use os botões acima para registrar sua primeira receita ou despesa."
          />
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={handleEdit}
            onRemoved={refresh}
          />
        )}
      </div>

      {dialog.kind === "account" ? (
        <AccountForm
          open
          account={dialog.account}
          onOpenChange={(open) => !open && setDialog({ kind: "none" })}
          onSaved={refresh}
        />
      ) : null}

      {dialog.kind === "income" ? (
        <IncomeForm
          open
          accounts={accounts}
          categories={categories}
          paymentMethods={paymentMethods}
          editing={dialog.editing}
          onOpenChange={(open) => !open && setDialog({ kind: "none" })}
          onSaved={refresh}
        />
      ) : null}

      {dialog.kind === "expense" ? (
        <ExpenseForm
          open
          accounts={accounts}
          categories={categories}
          paymentMethods={paymentMethods}
          creditCards={creditCards}
          editing={dialog.editing}
          onOpenChange={(open) => !open && setDialog({ kind: "none" })}
          onSaved={refresh}
        />
      ) : null}

      {dialog.kind === "transfer" ? (
        <TransferForm
          open
          accounts={accounts}
          paymentMethods={paymentMethods}
          editing={dialog.editing}
          onOpenChange={(open) => !open && setDialog({ kind: "none" })}
          onSaved={refresh}
        />
      ) : null}

      {dialog.kind === "adjustment" ? (
        <AdjustmentForm
          open
          accounts={accounts}
          editing={dialog.editing}
          onOpenChange={(open) => !open && setDialog({ kind: "none" })}
          onSaved={refresh}
        />
      ) : null}

      {dialog.kind === "outros" ? (
        <OutrosSheet
          open
          onOpenChange={(open) => !open && setDialog({ kind: "none" })}
          onSelectTransfer={() => setDialog({ kind: "transfer" })}
          onSelectAdjustment={() => setDialog({ kind: "adjustment" })}
        />
      ) : null}
    </div>
  );
}
