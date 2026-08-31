import { z } from "zod";

const baseFields = {
  id: z.string().optional(),
  date: z.string().min(1, "Informe a data."), // "YYYY-MM-DD", convertido para UTC no servidor
  amount: z.string().min(1, "Informe o valor."),
  description: z.string().trim().min(1, "Informe uma descrição."),
  notes: z.string().trim().optional(),
};

export const incomeFormSchema = z.object({
  ...baseFields,
  accountId: z.string().min(1, "Selecione uma conta."),
  categoryId: z.string().min(1, "Selecione uma categoria."),
  paymentMethodId: z.string().min(1, "Selecione a forma de recebimento."),
  // Preenchidos só quando este lançamento vem da confirmação de uma
  // receita fixa recorrente — nunca usados numa edição normal.
  fixedExpenseId: z.string().optional(),
  competencia: z.string().optional(),
});
export type IncomeFormInput = z.infer<typeof incomeFormSchema>;

export const expenseFormSchema = z
  .object({
    ...baseFields,
    // Obrigatório apenas quando a forma de pagamento não é "crédito" — uma
    // compra no crédito é lançada na conta de controle do cartão, nunca em
    // uma conta escolhida pelo usuário.
    accountId: z.string().optional(),
    categoryId: z.string().min(1, "Selecione uma categoria."),
    paymentMethodId: z.string().min(1, "Selecione a forma de pagamento."),
    isCredit: z.boolean(),
    creditCardId: z.string().optional(),
    // Preenchidos só quando este lançamento vem da confirmação de uma
    // despesa fixa recorrente — nunca usados numa edição normal.
    fixedExpenseId: z.string().optional(),
    competencia: z.string().optional(),
    // Só faz sentido numa compra nova no cartão — nunca numa edição
    // retroativa de um lançamento já existente.
    installmentCount: z.number().int().min(2).max(48).optional(),
  })
  .refine((data) => data.isCredit || !!data.accountId, {
    message: "Selecione uma conta.",
    path: ["accountId"],
  })
  .refine((data) => !data.isCredit || !!data.creditCardId, {
    message: "Selecione um cartão.",
    path: ["creditCardId"],
  })
  .refine((data) => !data.installmentCount || (data.isCredit && !!data.creditCardId), {
    message: "Parcelamento só é possível numa compra no cartão de crédito.",
    path: ["installmentCount"],
  });
export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;

export const transferFormSchema = z
  .object({
    ...baseFields,
    // Para edição, este é o `transferGroupId` (liga as 2 pontas) — nunca o
    // id de uma única linha de `transactions`.
    originAccountId: z.string().min(1, "Selecione a conta de origem."),
    destinationAccountId: z.string().min(1, "Selecione a conta de destino."),
    paymentMethodId: z.string().min(1, "Selecione a forma de transferência."),
  })
  .refine((data) => data.originAccountId !== data.destinationAccountId, {
    message: "Origem e destino precisam ser contas diferentes.",
    path: ["destinationAccountId"],
  });
export type TransferFormInput = z.infer<typeof transferFormSchema>;

export const adjustmentFormSchema = z.object({
  ...baseFields,
  accountId: z.string().min(1, "Selecione uma conta."),
  direction: z.enum(["inflow", "outflow"]),
});
export type AdjustmentFormInput = z.infer<typeof adjustmentFormSchema>;
