import Link from "next/link";
import { ChevronRight, CreditCard, Tags, Wallet } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

const shortcuts = [
  { href: "/lancamentos", label: "Contas", icon: Wallet },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/categorias", label: "Categorias e formas de pagamento", icon: Tags },
] as const;

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Atalhos e preferências da sua carteira.
        </p>
      </div>

      <nav className="overflow-hidden rounded-2xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {shortcuts.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-[52px] items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-accent"
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <SignOutButton />
    </div>
  );
}
