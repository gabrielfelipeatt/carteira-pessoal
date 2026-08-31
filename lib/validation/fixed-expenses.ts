import { z } from "zod";

export const fixedExpenseFormSchema = z
  .object({
    id: z.string().optional(),
    type: z.enum(["income", "expense"]),
    description: z.string().trim().min(1, "Informe uma descrição."),
    categoryId: z.string().min(1, "Selecione uma categoria."),
    amount: z.string().min(1, "Informe o valor."),
    dayOfMonth: z
      .number({ error: "Informe o dia do mês." })
      .int()
      .min(1)
      .max(31),
    paymentMethodId: z.string().min(1, "Selecione a forma de pagamento."),
    isCredit: z.boolean(),
    creditCardId: z.string().optional(),
    // Obrigatório apenas quando a forma de pagamento não é "crédito" — mesmo
    // XOR de `expenseFormSchema`.
    accountId: z.string().optional(),
    startMonth: z.string().regex(/^\d{4}-\d{2}$/, "Informe o mês inicial."),
    // Um `<input type="month">` vazio chega como "" (não `undefined`), então
    // o regex só entra em jogo quando o campo foi de fato preenchido.
    endMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Mês final inválido.")
      .optional()
      .or(z.literal("")),
    isActive: z.boolean(),
    notes: z.string().trim().optional(),
  })
  .refine((data) => data.isCredit || !!data.accountId, {
    message: "Selecione uma conta.",
    path: ["accountId"],
  })
  .refine((data) => !data.isCredit || !!data.creditCardId, {
    message: "Selecione um cartão.",
    path: ["creditCardId"],
  })
  .refine((data) => !data.endMonth || data.endMonth >= data.startMonth, {
    message: "O mês final não pode ser antes do mês inicial.",
    path: ["endMonth"],
  })
  .refine((data) => data.type === "expense" || !data.isCredit, {
    message: "Receita fixa não pode ser no cartão de crédito.",
    path: ["isCredit"],
  });

export type FixedExpenseFormInput = z.infer<typeof fixedExpenseFormSchema>;
