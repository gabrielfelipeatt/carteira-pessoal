import { z } from "zod";

export const creditCardFormSchema = z.object({
  id: z.string().optional(),
  nickname: z.string().trim().min(1, "Informe um apelido para o cartão."),
  issuer: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  lastDigits: z.string().trim().max(8).optional(),
  limit: z.string().min(1, "Informe o limite total."),
  closingDay: z
    .number({ error: "Informe o dia de fechamento." })
    .int()
    .min(1)
    .max(31),
  dueDay: z
    .number({ error: "Informe o dia de vencimento." })
    .int()
    .min(1)
    .max(31),
  color: z.string().min(1),
  status: z.enum(["active", "inactive"]),
});

export type CreditCardFormInput = z.infer<typeof creditCardFormSchema>;
