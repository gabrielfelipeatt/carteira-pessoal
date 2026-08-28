import { z } from "zod";

export const paymentMethodFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe um nome."),
  kind: z.enum([
    "pix",
    "boleto",
    "dinheiro",
    "debito",
    "credito",
    "transferencia",
    "outro",
  ]),
  isActive: z.boolean(),
});

export type PaymentMethodFormInput = z.infer<typeof paymentMethodFormSchema>;
