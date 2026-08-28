import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/finance/states";

export default function CartoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Cartões
        </h1>
        <p className="text-sm text-muted-foreground">
          Limites, ciclos e faturas dos seus cartões de crédito.
        </p>
      </div>

      <EmptyState
        icon={<CreditCard className="size-8 text-muted-foreground" aria-hidden />}
        title="Nenhum cartão cadastrado"
        description="O cadastro de cartões de crédito chega em uma próxima etapa."
      />
    </div>
  );
}
