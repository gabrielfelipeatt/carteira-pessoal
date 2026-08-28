import { MoneyText } from "@/components/finance/money-text";

export function KpiCards({
  incomeCents,
  expenseCents,
  resultCents,
  previousResultCents,
}: {
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

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">Entradas</p>
        <MoneyText cents={incomeCents} className="text-lg" />
      </div>
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">Saídas</p>
        <MoneyText cents={-expenseCents} className="text-lg" />
      </div>
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
