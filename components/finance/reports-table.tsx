import { MoneyText } from "@/components/finance/money-text";
import { formatDateShort } from "@/lib/finance/dates";
import type { TransactionType } from "@/db/schema";

export type ReportRow = {
  id: string;
  type: TransactionType;
  direction: "inflow" | "outflow";
  amountCents: number;
  occurredAt: Date;
  description: string;
  accountName: string;
  categoryName: string | null;
  paymentMethodName: string | null;
};

const typeLabels: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
  adjustment: "Ajuste",
};

export function ReportsTable({ rows }: { rows: ReportRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhum lançamento encontrado com esses filtros.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">Tabela detalhada de lançamentos filtrados</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-normal">Data</th>
            <th scope="col" className="px-3 py-2 font-normal">Descrição</th>
            <th scope="col" className="px-3 py-2 font-normal">Tipo</th>
            <th scope="col" className="px-3 py-2 font-normal">Conta</th>
            <th scope="col" className="px-3 py-2 font-normal">Categoria</th>
            <th scope="col" className="px-3 py-2 text-right font-normal">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60 last:border-0">
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                {formatDateShort(row.occurredAt)}
              </td>
              <td className="px-3 py-2 text-foreground">{row.description}</td>
              <td className="px-3 py-2 text-muted-foreground">{typeLabels[row.type]}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.accountName}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.categoryName ?? "—"}</td>
              <td className="px-3 py-2 text-right">
                <MoneyText
                  cents={row.direction === "outflow" ? -row.amountCents : row.amountCents}
                  tone={row.type === "transfer" || row.type === "adjustment" ? "neutral" : "auto"}
                  className="text-sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
