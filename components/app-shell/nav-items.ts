import {
  CreditCard,
  Home,
  ListChecks,
  MoreHorizontal,
  PiggyBank,
  PieChart,
  Repeat,
  Settings,
  Tags,
  Target,
} from "lucide-react";

export const primaryNavItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/lancamentos", label: "Lançamentos", icon: ListChecks },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/relatorios", label: "Relatórios", icon: PieChart },
] as const;

export const moreMenuItems = [
  { href: "/orcamentos", label: "Orçamentos", icon: Target },
  { href: "/metas", label: "Metas", icon: PiggyBank },
  { href: "/despesas-fixas", label: "Lançamentos fixos", icon: Repeat },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export const moreNavIcon = MoreHorizontal;
