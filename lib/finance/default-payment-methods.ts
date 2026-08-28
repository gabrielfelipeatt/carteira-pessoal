import type { PaymentMethodKind } from "@/db/schema";

export const systemPaymentMethods: { name: string; kind: PaymentMethodKind }[] = [
  { name: "Pix", kind: "pix" },
  { name: "Boleto", kind: "boleto" },
  { name: "Dinheiro", kind: "dinheiro" },
  { name: "Débito", kind: "debito" },
  { name: "Crédito", kind: "credito" },
  { name: "Transferência bancária", kind: "transferencia" },
  { name: "Outro", kind: "outro" },
];
