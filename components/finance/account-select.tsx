"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { accounts as accountsTable } from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;

export function AccountSelect({
  id,
  label,
  accounts,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  accounts: Account[];
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
}) {
  const active = accounts.filter((account) => account.isActive);
  const nameById = new Map(accounts.map((account) => [account.id, account.name]));

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(String(next))}>
        <SelectTrigger id={id} className="h-11 w-full" aria-invalid={!!error}>
          <SelectValue>
            {(selected: string | null) =>
              selected ? (nameById.get(selected) ?? selected) : "Selecione uma conta"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {active.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
