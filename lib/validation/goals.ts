import { z } from "zod";

export const goalFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe um nome para a meta."),
  targetAmount: z.string().min(1, "Informe o valor-alvo."),
  // Um `<input type="month">` vazio chega como "" (não `undefined`), então
  // o regex só entra em jogo quando o campo foi de fato preenchido —
  // mesma solução já usada em `fixedExpenseFormSchema.endMonth`.
  targetMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Mês-alvo inválido.")
    .optional()
    .or(z.literal("")),
  color: z.string().min(1),
  isActive: z.boolean(),
  notes: z.string().trim().optional(),
});
export type GoalFormInput = z.infer<typeof goalFormSchema>;

export const goalContributionFormSchema = z.object({
  goalId: z.string().min(1),
  accountId: z.string().min(1, "Selecione uma conta."),
  amount: z.string().min(1, "Informe o valor."),
  date: z.string().min(1, "Informe a data."),
  mode: z.enum(["aporte", "resgate"]),
  notes: z.string().trim().optional(),
});
export type GoalContributionFormInput = z.infer<typeof goalContributionFormSchema>;
