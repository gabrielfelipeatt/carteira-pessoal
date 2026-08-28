import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/finance/states";

export default function DashboardPage() {
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
    </div>
  );
}
