"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard as CreditCardIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/finance/states";
import { MoneyText } from "@/components/finance/money-text";
import { CreditCardForm } from "@/components/finance/credit-card-form";
import type { creditCards as creditCardsTable } from "@/db/schema";

type CreditCard = typeof creditCardsTable.$inferSelect & { availableCents: number };

export function CartoesView({ cards }: { cards: CreditCard[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Cartões
          </h1>
          <p className="text-sm text-muted-foreground">
            Limites, ciclos e faturas dos seus cartões de crédito.
          </p>
        </div>
        {cards.length > 0 ? (
          <Button size="sm" className="h-9 gap-1" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Novo
          </Button>
        ) : null}
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<CreditCardIcon className="size-8 text-muted-foreground" aria-hidden />}
          title="Nenhum cartão cadastrado"
          description="Cadastre um cartão para lançar compras no crédito e acompanhar suas faturas."
          action={
            <Button size="lg" className="h-11" onClick={() => setFormOpen(true)}>
              Cadastrar cartão
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                href={`/cartoes/${card.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-4 hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: card.color }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {card.nickname}
                    {card.status === "inactive" ? (
                      <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>
                    ) : null}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">
                    Disponível de {(card.limitCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                  <MoneyText cents={card.availableCents} tone="neutral" className="text-sm" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreditCardForm open={formOpen} onOpenChange={setFormOpen} onSaved={refresh} />
    </div>
  );
}
