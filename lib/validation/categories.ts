import { z } from "zod";
import type { CategoryKind } from "@/db/schema";

export const categoryKindOptions: { value: CategoryKind; label: string }[] = [
  { value: "income", label: "Receita" },
  { value: "expense", label: "Despesa" },
  { value: "transfer", label: "Transferência" },
  { value: "adjustment", label: "Ajuste" },
];

export const categoryFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe um nome para a categoria."),
  kind: z.enum(["income", "expense", "transfer", "adjustment"]),
  parentId: z.string().nullable().optional(),
  color: z.string().min(1),
  icon: z.string().trim().optional(),
  isActive: z.boolean(),
  rollupToParentBudget: z.boolean(),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
