import { PieChart } from "lucide-react";
import { EmptyState } from "@/components/finance/states";

export default function RelatoriosPage() {
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

      <EmptyState
        icon={<PieChart className="size-8 text-muted-foreground" aria-hidden />}
        title="Sem dados para exibir"
        description="Os relatórios aparecem aqui assim que você tiver lançamentos registrados."
      />
    </div>
  );
}
