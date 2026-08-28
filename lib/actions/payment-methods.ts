"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { paymentMethods, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth/guards";
import {
  paymentMethodFormSchema,
  type PaymentMethodFormInput,
} from "@/lib/validation/payment-methods";
import { systemPaymentMethods } from "@/lib/finance/default-payment-methods";

export async function listPaymentMethods() {
  const userId = await requireUserId();
  const rows = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId));
  return rows.sort((a, b) => {
    if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export async function savePaymentMethod(input: PaymentMethodFormInput) {
  const userId = await requireUserId();
  const parsed = paymentMethodFormSchema.parse(input);

  if (parsed.id) {
    const [existing] = await db
      .select({ id: paymentMethods.id, isSystem: paymentMethods.isSystem })
      .from(paymentMethods)
      .where(
        and(eq(paymentMethods.id, parsed.id), eq(paymentMethods.userId, userId)),
      );
    if (!existing) {
      throw new Error("Forma de pagamento não encontrada.");
    }
    if (existing.isSystem) {
      // Meios do sistema só podem ter o status (ativo/pausado) alterado.
      await db
        .update(paymentMethods)
        .set({ isActive: parsed.isActive })
        .where(
          and(eq(paymentMethods.id, parsed.id), eq(paymentMethods.userId, userId)),
        );
    } else {
      await db
        .update(paymentMethods)
        .set({ name: parsed.name, kind: parsed.kind, isActive: parsed.isActive })
        .where(
          and(eq(paymentMethods.id, parsed.id), eq(paymentMethods.userId, userId)),
        );
    }
  } else {
    await db.insert(paymentMethods).values({
      userId,
      name: parsed.name,
      kind: parsed.kind,
      isActive: parsed.isActive,
      isSystem: false,
    });
  }

  revalidatePath("/categorias");
  revalidatePath("/lancamentos");
}

export async function removePaymentMethod(paymentMethodId: string) {
  const userId = await requireUserId();

  const [existing] = await db
    .select({ id: paymentMethods.id, isSystem: paymentMethods.isSystem })
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.id, paymentMethodId),
        eq(paymentMethods.userId, userId),
      ),
    );
  if (!existing) {
    throw new Error("Forma de pagamento não encontrada.");
  }
  if (existing.isSystem) {
    throw new Error(
      "Formas de pagamento padrão do sistema não podem ser removidas — apenas pausadas.",
    );
  }

  const [linkedTransaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.customPaymentMethodId, paymentMethodId))
    .limit(1);
  if (linkedTransaction) {
    throw new Error(
      "Esta forma de pagamento tem lançamentos e não pode ser removida. Você pode pausá-la em vez disso.",
    );
  }

  await db
    .delete(paymentMethods)
    .where(
      and(
        eq(paymentMethods.id, paymentMethodId),
        eq(paymentMethods.userId, userId),
      ),
    );

  revalidatePath("/categorias");
  revalidatePath("/lancamentos");
}

export async function seedSystemPaymentMethods() {
  const userId = await requireUserId();

  const existing = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("Você já tem formas de pagamento cadastradas.");
  }

  await db.insert(paymentMethods).values(
    systemPaymentMethods.map((method) => ({
      userId,
      name: method.name,
      kind: method.kind,
      isActive: true,
      isSystem: true,
    })),
  );

  revalidatePath("/categorias");
  revalidatePath("/lancamentos");
}
