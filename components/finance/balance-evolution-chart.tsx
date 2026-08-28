"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/finance/money-text";
import { formatCentsToBRL } from "@/lib/finance/money";
import { formatMonthLabel, formatMonthShort } from "@/lib/finance/dates";

export type BalancePoint = { month: string; balanceCents: number };

export function BalanceEvolutionChart({ points }: { points: BalancePoint[] }) {
  const [showTable, setShowTable] = useState(false);

  if (points.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Sem dados de saldo para este período.
      </p>
    );
  }

  const data = points.map((p) => ({
    month: formatMonthShort(p.month),
    saldo: p.balanceCents / 100,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Evolução do saldo
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
          <caption className="sr-only">Evolução do saldo consolidado por mês</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="pb-2 font-normal">Mês</th>
              <th scope="col" className="pb-2 text-right font-normal">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.month} className="border-t border-border/60">
                <td className="py-1.5 capitalize text-foreground">{formatMonthLabel(p.month)}</td>
                <td className="py-1.5 text-right">
                  <MoneyText cents={p.balanceCents} tone="neutral" className="text-sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="h-[220px] w-full" role="img" aria-label="Gráfico de linha da evolução do saldo consolidado">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 8, right: 16 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} />
              <YAxis
                tickFormatter={(v) => formatCentsToBRL(v * 100)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                width={70}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--primary)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
