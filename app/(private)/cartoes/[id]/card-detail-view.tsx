"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/finance/states";
import { MoneyText } from "@/components/finance/money-text";
import { CreditCardForm } from "@/components/finance/credit-card-form";
import { StatementPanel } from "@/components/finance/statement-panel";
import { formatCentsToBRL } from "@/lib/finance/money";
import type { accounts as accountsTable, creditCards as creditCardsTable, StatementStatus } from "@/db/schema";

type CreditCard = typeof creditCardsTable.$inferSelect & { availableCents: number };
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
};

export function CardDetailView({
  card,
  statements,
  accounts,
}: {
  card: CreditCard;
  statements: Statement[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-11"
          nativeButton={false}
          render={
            <Link href="/cartoes" aria-label="Voltar">
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          }
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-2xl font-semibold text-foreground">
            {card.nickname}
          </h1>
          <p className="text-sm text-muted-foreground">
            Fecha dia {card.closingDay} · vence dia {card.dueDay}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-11"
          aria-label="Editar cartão"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card px-4 py-4">
        <p className="text-xs text-muted-foreground">Limite disponível</p>
        <MoneyText cents={card.availableCents} tone="neutral" className="text-2xl" />
        <p className="mt-1 text-xs text-muted-foreground">
          de {formatCentsToBRL(card.limitCents)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold text-muted-foreground">
          Faturas
        </h2>
        {statements.length === 0 ? (
          <EmptyState
            title="Nenhuma fatura ainda"
            description="Faturas aparecem aqui assim que você registrar uma compra no crédito com este cartão."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {statements.map((statement) => (
              <StatementPanel key={statement.id} statement={statement} accounts={accounts} />
            ))}
          </div>
        )}
      </div>

      <CreditCardForm
        open={editOpen}
        onOpenChange={setEditOpen}
        card={card}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
