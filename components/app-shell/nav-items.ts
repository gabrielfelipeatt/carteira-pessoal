import {
  CreditCard,
  Home,
  ListChecks,
  MoreHorizontal,
  PieChart,
} from "lucide-react";

export const primaryNavItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/lancamentos", label: "Lançamentos", icon: ListChecks },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/relatorios", label: "Relatórios", icon: PieChart },
] as const;

export const moreMenuItems = [
  { href: "/orcamentos", label: "Orçamentos" },
  { href: "/categorias", label: "Categorias" },
  { href: "/configuracoes", label: "Configurações" },
] as const;

export const moreNavIcon = MoreHorizontal;
