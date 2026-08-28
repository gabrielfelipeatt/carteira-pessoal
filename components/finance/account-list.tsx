"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/finance/money-text";
import type { accounts as accountsTable } from "@/db/schema";

type Account = typeof accountsTable.$inferSelect & { currentBalanceCents: number };

export function AccountList({
  accounts,
  onEdit,
  onCreate,
}: {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-muted-foreground">
          Contas
        </h2>
        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={onCreate}>
          <Plus className="size-4" aria-hidden />
          Nova conta
        </Button>
      </div>

      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {accounts.map((account) => (
          <li key={account.id}>
            <button
              type="button"
              onClick={() => onEdit(account)}
              className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: account.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {account.name}
                {!account.isActive ? (
                  <span className="ml-2 text-xs text-muted-foreground">(inativa)</span>
                ) : null}
              </span>
              <MoneyText cents={account.currentBalanceCents} tone="neutral" className="text-sm" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
