"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
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
import { MoneyText } from "@/components/finance/money-text";
import { PayStatementForm } from "@/components/finance/pay-statement-form";
import { closeStatementAction, listStatementTransactions } from "@/lib/actions/statements";
import { formatDateShort } from "@/lib/finance/dates";
import type { accounts as accountsTable, StatementStatus } from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;

type Statement = {
  id: string;
  referenceMonth: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  status: StatementStatus;
  effectiveStatus: "open" | "closed" | "overdue" | "paid";
  totalCents: number;
  paidCents: number;
  /** Quanto a fatura deve agora — para uma fatura aberta, calculado em tempo
   * real a partir das compras do ciclo (nunca `totalCents`, que só é
   * apurado no fechamento). */
  owedCents: number;
};

const statusLabels: Record<Statement["effectiveStatus"], string> = {
  open: "Aberta",
  closed: "Fechada",
  overdue: "Vencida",
  paid: "Paga",
};

const statusVariants: Record<Statement["effectiveStatus"], "secondary" | "destructive" | "default"> = {
  open: "secondary",
  closed: "default",
  overdue: "destructive",
  paid: "secondary",
};

export function StatementPanel({
  statement,
  accounts,
}: {
  statement: Statement;
  accounts: Account[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState<
    { id: string; amountCents: number; occurredAt: Date; description: string }[] | null
  >(null);
  const [payOpen, setPayOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  async function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && transactions === null) {
      const rows = await listStatementTransactions(statement.id);
      setTransactions(rows);
    }
  }

  async function handleClose() {
    setClosing(true);
    try {
      await closeStatementAction(statement.id);
      toast.success("Fatura fechada.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao fechar fatura.");
    } finally {
      setClosing(false);
    }
  }

  const remaining = statement.owedCents - statement.paidCents;
  const canPay = statement.status !== "paid" && remaining > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={handleExpand}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {statement.referenceMonth}
            </span>
            <Badge variant={statusVariants[statement.effectiveStatus]}>
              {statusLabels[statement.effectiveStatus]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDateShort(statement.periodStart)} – {formatDateShort(statement.periodEnd)} · vence {formatDateShort(statement.dueDate)}
          </p>
        </div>
        <MoneyText cents={statement.owedCents} tone="neutral" className="text-sm" />
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        )}
      </button>

      {expanded ? (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
          {statement.status === "open" ? (
            <p className="text-xs text-muted-foreground">
              Pagamentos numa fatura aberta são adiantamentos — o ciclo só
              fecha (e vira &quot;Paga&quot;, se já tiver quitado tudo) quando
              você fechar explicitamente.
            </p>
          ) : null}

          {canPay || statement.status === "open" ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Restante: <MoneyText cents={remaining} tone="neutral" className="text-xs" />
              </span>
              <div className="flex gap-2">
                {statement.status === "open" ? (
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="outline" size="sm" className="h-9">
                          Fechar fatura
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Fechar esta fatura?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Depois de fechada, as compras deste ciclo não podem
                          mais ser editadas ou removidas. Novas compras entram
                          no próximo ciclo.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction disabled={closing} onClick={handleClose}>
                          Fechar fatura
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
                {canPay ? (
                  <Button size="sm" className="h-9" onClick={() => setPayOpen(true)}>
                    Pagar fatura
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {transactions === null ? (
            <p className="text-xs text-muted-foreground">Carregando compras…</p>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma compra neste ciclo.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border/60">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateShort(t.occurredAt)}
                    </p>
                  </div>
                  <MoneyText cents={t.amountCents} tone="neutral" className="shrink-0 text-sm" />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <PayStatementForm
        open={payOpen}
        onOpenChange={setPayOpen}
        statementId={statement.id}
        remainingCents={remaining}
        accounts={accounts}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
