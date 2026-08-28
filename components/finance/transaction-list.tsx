"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, CreditCard, Pencil, Scale, Trash2 } from "lucide-react";
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
import { MoneyText } from "@/components/finance/money-text";
import { removeTransaction } from "@/lib/actions/transactions";
import { formatDateShort } from "@/lib/finance/dates";
import type { TransactionType } from "@/db/schema";

export type TransactionListItem = {
  id: string;
  type: TransactionType;
  direction: "inflow" | "outflow";
  amountCents: number;
  occurredAt: Date;
  description: string;
  notes: string | null;
  transferGroupId: string | null;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  creditCardId: string | null;
  creditCardNickname: string | null;
  statementId: string | null;
};

export type EditPayload =
  | {
      kind: "income";
      id: string;
      accountId: string;
      categoryId: string | null;
      paymentMethodId: string | null;
      amountCents: number;
      occurredAt: Date;
      description: string;
      notes: string | null;
    }
  | {
      kind: "expense";
      id: string;
      accountId: string;
      categoryId: string | null;
      paymentMethodId: string | null;
      amountCents: number;
      occurredAt: Date;
      description: string;
      notes: string | null;
      creditCardId: string | null;
    }
  | {
      kind: "adjustment";
      id: string;
      accountId: string;
      direction: "inflow" | "outflow";
      amountCents: number;
      occurredAt: Date;
      description: string;
      notes: string | null;
    }
  | {
      kind: "transfer";
      transferGroupId: string;
      originAccountId: string;
      destinationAccountId: string;
      paymentMethodId: string | null;
      amountCents: number;
      occurredAt: Date;
      description: string;
      notes: string | null;
    };

type DisplayRow =
  | { display: "single"; key: string; item: TransactionListItem }
  | {
      display: "transfer";
      key: string;
      outflowLeg: TransactionListItem;
      inflowLeg: TransactionListItem;
    };

function groupTransferLegs(transactions: TransactionListItem[]): DisplayRow[] {
  const byGroup = new Map<string, TransactionListItem[]>();
  const rows: DisplayRow[] = [];

  for (const transaction of transactions) {
    if (transaction.type === "transfer" && transaction.transferGroupId) {
      const list = byGroup.get(transaction.transferGroupId) ?? [];
      list.push(transaction);
      byGroup.set(transaction.transferGroupId, list);
    } else {
      rows.push({ display: "single", key: transaction.id, item: transaction });
    }
  }

  for (const [groupId, legs] of byGroup) {
    const outflowLeg = legs.find((leg) => leg.direction === "outflow");
    const inflowLeg = legs.find((leg) => leg.direction === "inflow");
    if (outflowLeg && inflowLeg) {
      rows.push({ display: "transfer", key: groupId, outflowLeg, inflowLeg });
    } else {
      // Grupo inconsistente (não deveria acontecer) — mostra as pernas soltas
      // em vez de esconder o problema.
      for (const leg of legs) {
        rows.push({ display: "single", key: leg.id, item: leg });
      }
    }
  }

  rows.sort((a, b) => {
    const dateA = a.display === "single" ? a.item.occurredAt : a.outflowLeg.occurredAt;
    const dateB = b.display === "single" ? b.item.occurredAt : b.outflowLeg.occurredAt;
    return dateB.getTime() - dateA.getTime();
  });

  return rows;
}

export function TransactionList({
  transactions,
  onEdit,
  onRemoved,
}: {
  transactions: TransactionListItem[];
  onEdit: (payload: EditPayload) => void;
  onRemoved?: () => void;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleRemove(id: string) {
    setPendingDeleteId(id);
    try {
      await removeTransaction(id);
      toast.success("Lançamento removido.");
      onRemoved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao remover lançamento.",
      );
    } finally {
      setPendingDeleteId(null);
    }
  }

  if (transactions.length === 0) {
    return null;
  }

  const rows = groupTransferLegs(transactions);

  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {rows.map((row) => {
        if (row.display === "transfer") {
          const { outflowLeg, inflowLeg } = row;
          return (
            <li key={row.key} className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ArrowLeftRight className="size-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {outflowLeg.description}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDateShort(outflowLeg.occurredAt)} · {outflowLeg.accountName} → {inflowLeg.accountName}
                </p>
              </div>
              <MoneyText cents={outflowLeg.amountCents} tone="neutral" className="shrink-0 text-sm" />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Editar transferência"
                onClick={() =>
                  onEdit({
                    kind: "transfer",
                    transferGroupId: row.key,
                    originAccountId: outflowLeg.accountId,
                    destinationAccountId: inflowLeg.accountId,
                    paymentMethodId: outflowLeg.paymentMethodId,
                    amountCents: outflowLeg.amountCents,
                    occurredAt: outflowLeg.occurredAt,
                    description: outflowLeg.description,
                    notes: outflowLeg.notes,
                  })
                }
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover transferência"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover transferência?</AlertDialogTitle>
                    <AlertDialogDescription>
                      As duas pontas dessa transferência serão removidas. Essa
                      ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={pendingDeleteId === outflowLeg.id}
                      onClick={() => handleRemove(outflowLeg.id)}
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          );
        }

        const transaction = row.item;
        const isAdjustment = transaction.type === "adjustment";
        const isStatementPayment = transaction.type === "transfer" && !!transaction.statementId;
        const isCreditExpense = transaction.type === "expense" && !!transaction.creditCardId;

        return (
          <li key={row.key} className="flex items-center gap-3 px-4 py-3">
            {isAdjustment ? (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Scale className="size-4" aria-hidden />
              </div>
            ) : null}
            {isStatementPayment || isCreditExpense ? (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CreditCard className="size-4" aria-hidden />
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {isStatementPayment
                  ? `Pagamento de fatura — ${transaction.creditCardNickname ?? ""}`
                  : transaction.description}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {formatDateShort(transaction.occurredAt)} ·{" "}
                {isCreditExpense
                  ? transaction.creditCardNickname
                  : transaction.accountName}
                {transaction.categoryName ? ` · ${transaction.categoryName}` : ""}
              </p>
            </div>

            <MoneyText
              cents={
                transaction.direction === "outflow"
                  ? -transaction.amountCents
                  : transaction.amountCents
              }
              className="shrink-0 text-sm"
            />

            {isStatementPayment ? null : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Editar lançamento"
              onClick={() => {
                if (transaction.type === "income") {
                  onEdit({
                    kind: "income",
                    id: transaction.id,
                    accountId: transaction.accountId,
                    categoryId: transaction.categoryId,
                    paymentMethodId: transaction.paymentMethodId,
                    amountCents: transaction.amountCents,
                    occurredAt: transaction.occurredAt,
                    description: transaction.description,
                    notes: transaction.notes,
                  });
                } else if (transaction.type === "expense") {
                  onEdit({
                    kind: "expense",
                    id: transaction.id,
                    accountId: transaction.accountId,
                    categoryId: transaction.categoryId,
                    paymentMethodId: transaction.paymentMethodId,
                    amountCents: transaction.amountCents,
                    occurredAt: transaction.occurredAt,
                    description: transaction.description,
                    notes: transaction.notes,
                    creditCardId: transaction.creditCardId,
                  });
                } else if (transaction.type === "adjustment") {
                  onEdit({
                    kind: "adjustment",
                    id: transaction.id,
                    accountId: transaction.accountId,
                    direction: transaction.direction,
                    amountCents: transaction.amountCents,
                    occurredAt: transaction.occurredAt,
                    description: transaction.description,
                    notes: transaction.notes,
                  });
                }
              }}
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover lançamento"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover lançamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={pendingDeleteId === transaction.id}
                    onClick={() => handleRemove(transaction.id)}
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        );
      })}
    </ul>
  );
}
