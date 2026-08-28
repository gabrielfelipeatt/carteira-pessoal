"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/finance/money-text";
import { formatCentsToBRL } from "@/lib/finance/money";

export type SpendByCategoryItem = {
  categoryId: string;
  categoryName: string;
  color: string;
  totalCents: number;
};

export function SpendByCategoryChart({ items }: { items: SpendByCategoryItem[] }) {
  const [showTable, setShowTable] = useState(false);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Sem despesas categorizadas neste período.
      </p>
    );
  }

  const data = items.map((item) => ({
    name: item.categoryName,
    value: item.totalCents / 100,
    color: item.color,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Gastos por categoria
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
          <caption className="sr-only">Gastos por categoria no período selecionado</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="pb-2 font-normal">Categoria</th>
              <th scope="col" className="pb-2 text-right font-normal">Valor</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.categoryId} className="border-t border-border/60">
                <td className="py-1.5 text-foreground">{item.categoryName}</td>
                <td className="py-1.5 text-right">
                  <MoneyText cents={-item.totalCents} tone="neutral" className="text-sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="h-[260px] w-full" role="img" aria-label="Gráfico de barras de gastos por categoria">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                tickFormatter={(v) => formatCentsToBRL(v * 100)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: "var(--foreground)", fontSize: 12 }}
                axisLine={{ stroke: "var(--border)" }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="var(--chart-3)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
