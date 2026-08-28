import type { CategoryKind } from "@/db/schema";

/**
 * Estrutura de categorias sugerida pelo PRD — inserida como configuração no
 * primeiro acesso do usuário (nunca como dado fictício/financeiro). O
 * usuário pode editar, desativar ou ignorar por completo.
 */
export const defaultCategoryGroups: {
  name: string;
  kind: CategoryKind;
  color: string;
  subcategories: string[];
}[] = [
  {
    name: "Moradia",
    kind: "expense",
    color: "#B05A2C",
    subcategories: ["Aluguel", "Condomínio", "Energia", "Água", "Internet"],
  },
  {
    name: "Alimentação",
    kind: "expense",
    color: "#C9A227",
    subcategories: ["Mercado", "Restaurantes", "Delivery"],
  },
  {
    name: "Transporte",
    kind: "expense",
    color: "#4A5568",
    subcategories: ["Combustível", "Transporte público", "Estacionamento"],
  },
  {
    name: "Saúde",
    kind: "expense",
    color: "#2F6E51",
    subcategories: ["Consultas", "Farmácia", "Exames"],
  },
  {
    name: "Assinaturas",
    kind: "expense",
    color: "#7A5AC9",
    subcategories: ["Streaming", "Software", "Serviços digitais"],
  },
  {
    name: "Compras",
    kind: "expense",
    color: "#B05A2C",
    subcategories: ["Casa", "Eletrônicos", "Vestuário"],
  },
  {
    name: "Lazer",
    kind: "expense",
    color: "#C9A227",
    subcategories: ["Viagens", "Cultura", "Hobbies"],
  },
  {
    name: "Educação",
    kind: "expense",
    color: "#1B4DD1",
    subcategories: ["Cursos", "Livros", "Mensalidades"],
  },
  {
    name: "Financeiro",
    kind: "expense",
    color: "#4A5568",
    subcategories: ["Tarifas", "Juros", "Impostos"],
  },
  {
    name: "Receitas",
    kind: "income",
    color: "#2F6E51",
    subcategories: ["Salário", "Freelance", "Reembolsos", "Rendimentos"],
  },
  {
    name: "Transferências",
    kind: "transfer",
    color: "#7A5AC9",
    subcategories: ["Entre contas próprias", "A terceiros"],
  },
];
