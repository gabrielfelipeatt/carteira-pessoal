"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { paymentMethods as paymentMethodsTable } from "@/db/schema";

type PaymentMethod = typeof paymentMethodsTable.$inferSelect;

export function PaymentMethodSelect({
  id,
  label,
  paymentMethods,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  paymentMethods: PaymentMethod[];
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
}) {
  const active = paymentMethods.filter((method) => method.isActive);
  const nameById = new Map(paymentMethods.map((method) => [method.id, method.name]));

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(String(next))}>
        <SelectTrigger id={id} className="h-11 w-full" aria-invalid={!!error}>
          <SelectValue>
            {(selected: string | null) =>
              selected ? (nameById.get(selected) ?? selected) : "Selecione"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {active.map((method) => (
            <SelectItem key={method.id} value={method.id}>
              {method.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
