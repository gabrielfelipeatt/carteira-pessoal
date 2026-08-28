import { Target } from "lucide-react";
import { EmptyState } from "@/components/finance/states";

export default function OrcamentosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Orçamentos
        </h1>
        <p className="text-sm text-muted-foreground">
          Limites mensais por categoria.
        </p>
      </div>

      <EmptyState
        icon={<Target className="size-8 text-muted-foreground" aria-hidden />}
        title="Nenhum orçamento definido"
        description="Defina um limite mensal por categoria para acompanhar seus gastos."
      />
    </div>
  );
}
