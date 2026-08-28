import { z } from "zod";
import type { AccountType } from "@/db/schema";

export const accountTypeOptions: { value: AccountType; label: string }[] = [
  { value: "corrente", label: "Conta corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "investimento", label: "Investimento" },
  { value: "outra", label: "Outra" },
];

export const accountColorOptions = [
  "#1B4DD1", // cobalto
  "#2F6E51", // verde profundo
  "#B05A2C", // terracota
  "#7A5AC9", // roxo
  "#C9A227", // âmbar
  "#4A5568", // grafite
] as const;

export const accountFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe um nome para a conta."),
  institution: z.string().trim().optional(),
  type: z.enum(["corrente", "poupanca", "dinheiro", "investimento", "outra"]),
  lastDigits: z
    .string()
    .trim()
    .max(8, "No máximo 8 dígitos.")
    .optional(),
  initialBalance: z.string().min(1, "Informe o saldo inicial."),
  color: z.string().min(1),
  isActive: z.boolean(),
});

export type AccountFormInput = z.infer<typeof accountFormSchema>;
