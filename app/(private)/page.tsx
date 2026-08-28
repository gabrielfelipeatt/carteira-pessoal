import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/finance/states";
import { MoneyText } from "@/components/finance/money-text";
import { MonthPicker } from "@/components/finance/month-picker";
import { KpiCards } from "@/components/finance/kpi-cards";
import { SpendByCategoryChart } from "@/components/finance/spend-by-category-chart";
import { formatDateShort } from "@/lib/finance/dates";
import { getDashboardMonth } from "@/lib/actions/dashboard";
import { currentYearMonth } from "@/lib/finance/dates";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const yearMonth = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : currentYearMonth();
  const data = await getDashboardMonth(yearMonth);

  const hasAnyAccount = data.accounts.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Início
        </h1>
        <p className="text-sm text-muted-foreground">
          Seu resumo financeiro do mês.
        </p>
      </div>

      {!hasAnyAccount ? (
        <EmptyState
          icon={<Wallet className="size-8 text-muted-foreground" aria-hidden />}
          title="Nenhum lançamento ainda"
          description="Cadastre uma conta e registre sua primeira receita ou despesa para ver o resumo do mês aqui."
          action={
            <Button
              render={<Link href="/lancamentos">Novo lançamento</Link>}
              nativeButton={false}
              size="lg"
              className="h-11"
            />
          }
        />
      ) : (
        <>
          <MonthPicker yearMonth={yearMonth} basePath="/" />

          <div className="rounded-2xl border border-border bg-card px-4 py-4">
            <p className="text-xs text-muted-foreground">Saldo consolidado</p>
            <MoneyText cents={data.consolidatedBalanceCents} tone="neutral" className="text-2xl" />
          </div>

          <KpiCards
            incomeCents={data.incomeCents}
            expenseCents={data.expenseCents}
            resultCents={data.resultCents}
            previousResultCents={data.previousMonth.resultCents}
          />

          <div className="grid grid-cols-2 gap-2">
            <Button
              render={
                <Link href="/lancamentos">
                  <ArrowUpCircle className="size-4" aria-hidden />
                  Receita
                </Link>
              }
              nativeButton={false}
              className="h-11 gap-1.5 bg-income text-income-foreground hover:bg-income/90"
            />
            <Button
              render={
                <Link href="/lancamentos">
                  <ArrowDownCircle className="size-4" aria-hidden />
                  Despesa
                </Link>
              }
              nativeButton={false}
              className="h-11 gap-1.5 bg-expense text-expense-foreground hover:bg-expense/90"
            />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-sm font-semibold text-muted-foreground">
              Contas
            </h2>
            <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {data.accounts.map((account) => (
                <li key={account.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: account.color }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {account.name}
                  </span>
                  <MoneyText cents={account.currentBalanceCents} tone="neutral" className="text-sm" />
                </li>
              ))}
            </ul>
          </div>

          <SpendByCategoryChart items={data.spendByCategory} />

          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-sm font-semibold text-muted-foreground">
              Últimos lançamentos
            </h2>
            {data.recentTransactions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum lançamento neste mês.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {data.recentTransactions.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {t.description}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateShort(t.occurredAt)}
                      </p>
                    </div>
                    <MoneyText
                      cents={t.direction === "outflow" ? -t.amountCents : t.amountCents}
                      tone={t.type === "transfer" || t.type === "adjustment" ? "neutral" : "auto"}
                      className="text-sm"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
