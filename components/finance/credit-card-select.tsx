"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { creditCards as creditCardsTable } from "@/db/schema";

type CreditCard = typeof creditCardsTable.$inferSelect;

export function CreditCardSelect({
  id,
  label,
  creditCards,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  creditCards: CreditCard[];
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
}) {
  const active = creditCards.filter((card) => card.status === "active");
  const nameById = new Map(active.map((card) => [card.id, card.nickname]));

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(String(next))}>
        <SelectTrigger id={id} className="h-11 w-full" aria-invalid={!!error}>
          <SelectValue>
            {(selected: string | null) =>
              selected ? (nameById.get(selected) ?? selected) : "Selecione um cartão"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {active.map((card) => (
            <SelectItem key={card.id} value={card.id}>
              {card.nickname}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
