"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/finance/money-text";
import { formatCentsToBRL } from "@/lib/finance/money";
import { formatMonthLabel, formatMonthShort } from "@/lib/finance/dates";

export type IncomeExpensePoint = {
  month: string;
  incomeCents: number;
  expenseCents: number;
};

export function IncomeExpenseChart({ points }: { points: IncomeExpensePoint[] }) {
  const [showTable, setShowTable] = useState(false);

  if (points.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Sem lançamentos neste período.
      </p>
    );
  }

  const data = points.map((p) => ({
    month: formatMonthShort(p.month),
    Entradas: p.incomeCents / 100,
    Saídas: p.expenseCents / 100,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Receitas e despesas no tempo
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowTable((v) => !v)}
        >
          {showTable ? "Ver gráfico" : "Ver tabela"}
        </Button>
      </div>

      {showTable ? (
        <table className="w-full text-sm">
          <caption className="sr-only">Receitas e despesas por mês</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="pb-2 font-normal">Mês</th>
              <th scope="col" className="pb-2 text-right font-normal">Entradas</th>
              <th scope="col" className="pb-2 text-right font-normal">Saídas</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.month} className="border-t border-border/60">
                <td className="py-1.5 capitalize text-foreground">{formatMonthLabel(p.month)}</td>
                <td className="py-1.5 text-right">
                  <MoneyText cents={p.incomeCents} className="text-sm" />
                </td>
                <td className="py-1.5 text-right">
                  <MoneyText cents={-p.expenseCents} className="text-sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="h-[240px] w-full" role="img" aria-label="Gráfico de barras de receitas e despesas por mês">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} />
              <YAxis
                tickFormatter={(v) => formatCentsToBRL(v * 100)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                width={70}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Entradas" fill="var(--income)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Saídas" fill="var(--expense)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
