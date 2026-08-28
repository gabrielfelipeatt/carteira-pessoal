import { cn } from "@/lib/utils";
import { formatCentsToBRL } from "@/lib/finance/money";

/** Exibe um valor em centavos como moeda BRL, em fonte monoespaçada tabular. */
export function MoneyText({
  cents,
  className,
  tone = "auto",
}: {
  cents: number;
  className?: string;
  /** "auto" colore verde/grafite conforme o sinal; "neutral" nunca colore. */
  tone?: "auto" | "neutral";
}) {
  const toneClass =
    tone === "auto"
      ? cents > 0
        ? "text-income"
        : cents < 0
          ? "text-expense"
          : "text-foreground"
      : "text-foreground";

  return (
    <span
      className={cn(
        "font-mono tabular-nums tracking-tight",
        toneClass,
        className,
      )}
    >
      {formatCentsToBRL(cents)}
    </span>
  );
}
