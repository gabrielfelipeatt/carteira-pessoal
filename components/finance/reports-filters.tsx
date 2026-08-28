"use client";

import { DateField } from "@/components/finance/date-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ReportFilters } from "@/lib/validation/reports";
import type {
  accounts as accountsTable,
  categories as categoriesTable,
  paymentMethods as paymentMethodsTable,
} from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;
type Category = typeof categoriesTable.$inferSelect;
type PaymentMethod = typeof paymentMethodsTable.$inferSelect;

const typeOptions = [
  { value: "all", label: "Todos os tipos" },
  { value: "income", label: "Receita" },
  { value: "expense", label: "Despesa" },
  { value: "transfer", label: "Transferência" },
  { value: "adjustment", label: "Ajuste" },
] as const;

export function ReportsFilters({
  filters,
  onChange,
  accounts,
  categories,
  paymentMethods,
}: {
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-3">
        <DateField
          label="De"
          value={filters.from}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
        />
        <DateField
          label="Até"
          value={filters.to}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-account">Conta</Label>
        <Select
          value={filters.accountId ?? "all"}
          onValueChange={(next) => {
            const value = String(next);
            onChange({ ...filters, accountId: value === "all" ? undefined : value });
          }}
        >
          <SelectTrigger id="report-account" className="h-11 w-full">
            <SelectValue>
              {(selected: string | null) =>
                selected && selected !== "all"
                  ? (accounts.find((a) => a.id === selected)?.name ?? "Todas as contas")
                  : "Todas as contas"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-category">Categoria</Label>
        <Select
          value={filters.categoryId ?? "all"}
          onValueChange={(next) => {
            const value = String(next);
            onChange({ ...filters, categoryId: value === "all" ? undefined : value });
          }}
        >
          <SelectTrigger id="report-category" className="h-11 w-full">
            <SelectValue>
              {(selected: string | null) =>
                selected && selected !== "all"
                  ? (categories.find((c) => c.id === selected)?.name ?? "Todas as categorias")
                  : "Todas as categorias"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-type">Tipo</Label>
        <Select
          value={filters.type ?? "all"}
          onValueChange={(next) => {
            const value = String(next);
            onChange({
              ...filters,
              type: value === "all" ? undefined : (value as ReportFilters["type"]),
            });
          }}
        >
          <SelectTrigger id="report-type" className="h-11 w-full">
            <SelectValue>
              {(selected: string | null) =>
                typeOptions.find((o) => o.value === selected)?.label ?? "Todos os tipos"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-payment-method">Forma de pagamento</Label>
        <Select
          value={filters.paymentMethodId ?? "all"}
          onValueChange={(next) => {
            const value = String(next);
            onChange({ ...filters, paymentMethodId: value === "all" ? undefined : value });
          }}
        >
          <SelectTrigger id="report-payment-method" className="h-11 w-full">
            <SelectValue>
              {(selected: string | null) =>
                selected && selected !== "all"
                  ? (paymentMethods.find((p) => p.id === selected)?.name ?? "Todas")
                  : "Todas"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {paymentMethods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
