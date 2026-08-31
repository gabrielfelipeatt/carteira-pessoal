import Link from "next/link";
import { MoneyText } from "@/components/finance/money-text";
import { monthRange, utcDateToLocalDateString } from "@/lib/finance/dates";

export function KpiCards({
  yearMonth,
  incomeCents,
  expenseCents,
  resultCents,
  previousResultCents,
}: {
  yearMonth: string;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
  previousResultCents: number;
}) {
  const delta = resultCents - previousResultCents;
  const deltaLabel =
    delta === 0
      ? "igual ao mês anterior"
      : delta > 0
        ? "acima do mês anterior"
        : "abaixo do mês anterior";

  const { from, to } = monthRange(yearMonth);
  const de = utcDateToLocalDateString(from);
  const ate = utcDateToLocalDateString(to);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href={`/relatorios?tipo=income&de=${de}&ate=${ate}`}
        className="rounded-2xl border border-border bg-card px-4 py-3"
      >
        <p className="text-xs text-muted-foreground">Entradas</p>
        <MoneyText cents={incomeCents} className="text-lg" />
      </Link>
      <Link
        href={`/relatorios?tipo=expense&de=${de}&ate=${ate}`}
        className="rounded-2xl border border-border bg-card px-4 py-3"
      >
        <p className="text-xs text-muted-foreground">Saídas</p>
        <MoneyText cents={-expenseCents} className="text-lg" />
      </Link>
      <div className="col-span-2 rounded-2xl border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">Resultado do período</p>
        <div className="flex items-baseline justify-between">
          <MoneyText cents={resultCents} className="text-xl" />
          <span className="text-xs text-muted-foreground">{deltaLabel}</span>
        </div>
      </div>
    </div>
  );
}
