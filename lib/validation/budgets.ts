import { z } from "zod";

export const budgetFormSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, "Selecione uma categoria."),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  limit: z.string().min(1, "Informe o limite."),
});

export type BudgetFormInput = z.infer<typeof budgetFormSchema>;
