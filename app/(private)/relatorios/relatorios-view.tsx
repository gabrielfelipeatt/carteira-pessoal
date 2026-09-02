"use client";

import { useEffect, useState, useTransition } from "react";
import { ReportsFilters } from "@/components/finance/reports-filters";
import { SpendByCategoryChart, type SpendByCategoryItem } from "@/components/finance/spend-by-category-chart";
import { IncomeExpenseChart, type IncomeExpensePoint } from "@/components/finance/income-expense-chart";
import { BalanceEvolutionChart, type BalancePoint } from "@/components/finance/balance-evolution-chart";
import { ReportsTable, type ReportRow } from "@/components/finance/reports-table";
import {
  queryReportBalanceEvolution,
  queryReportIncomeExpenseByMonth,
  queryReportSpendByCategory,
  queryReportTable,
} from "@/lib/actions/reports";
import type { ReportFilters } from "@/lib/validation/reports";
import type {
  accounts as accountsTable,
  categories as categoriesTable,
  paymentMethods as paymentMethodsTable,
} from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;
type Category = typeof categoriesTable.$inferSelect;
type PaymentMethod = typeof paymentMethodsTable.$inferSelect;

export function RelatoriosView({
  initialFilters,
  accounts,
  categories,
  paymentMethods,
}: {
  initialFilters: ReportFilters;
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [isPending, startTransition] = useTransition();
  const [spend, setSpend] = useState<SpendByCategoryItem[]>([]);
  const [series, setSeries] = useState<IncomeExpensePoint[]>([]);
  const [balance, setBalance] = useState<BalancePoint[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);

  useEffect(() => {
    startTransition(async () => {
      const [spendData, seriesData, balanceData, tableData] = await Promise.all([
        queryReportSpendByCategory(filters),
        queryReportIncomeExpenseByMonth(filters),
        queryReportBalanceEvolution(filters),
        queryReportTable(filters),
      ]);
      setSpend(spendData);
      setSeries(seriesData);
      setBalance(balanceData);
      setRows(tableData);
    });
  }, [filters]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Relatórios
        </h1>
        <p className="text-sm text-muted-foreground">
          Gastos por categoria, evolução de saldo e filtros por período.
        </p>
      </div>

      <ReportsFilters
        filters={filters}
        onChange={setFilters}
        accounts={accounts}
        categories={categories}
        paymentMethods={paymentMethods}
      />

      <div
        className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start"
        aria-busy={isPending}
        aria-live="polite"
      >
        <SpendByCategoryChart items={spend} />
        <IncomeExpenseChart points={series} />
        <div className="lg:col-span-2">
          <BalanceEvolutionChart points={balance} />
        </div>
        <div className="lg:col-span-2">
          <ReportsTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
