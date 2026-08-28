"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonthLabel, previousYearMonth } from "@/lib/finance/dates";

function nextYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

export function MonthPicker({
  yearMonth,
  basePath,
}: {
  yearMonth: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-2 py-2">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Mês anterior"
        onClick={() => router.push(`${basePath}?mes=${previousYearMonth(yearMonth)}`)}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      <span className="font-heading text-sm font-medium capitalize text-foreground">
        {formatMonthLabel(yearMonth)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Próximo mês"
        onClick={() => router.push(`${basePath}?mes=${nextYearMonth(yearMonth)}`)}
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
