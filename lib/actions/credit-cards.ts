"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { accounts, creditCards, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth/guards";
import {
  creditCardFormSchema,
  type CreditCardFormInput,
} from "@/lib/validation/credit-cards";
import { parseBrlToCents } from "@/lib/finance/money";
import { computeAvailableCreditCents } from "@/lib/finance/statements";

export async function listCreditCards() {
  const userId = await requireUserId();
  const cards = await db
    .select()
    .from(creditCards)
    .where(eq(creditCards.userId, userId));

  const withLimits = await Promise.all(
    cards.map(async (card) => ({
      ...card,
      availableCents: await computeAvailableCreditCents(userId, card.id),
    })),
  );

  return withLimits.sort((a, b) => a.nickname.localeCompare(b.nickname, "pt-BR"));
}

export async function getCreditCard(creditCardId: string) {
  const userId = await requireUserId();
  const [card] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, creditCardId), eq(creditCards.userId, userId)));
  if (!card) {
    return null;
  }
  return { ...card, availableCents: await computeAvailableCreditCents(userId, card.id) };
}

export async function saveCreditCard(input: CreditCardFormInput) {
  const userId = await requireUserId();
  const parsed = creditCardFormSchema.parse(input);

  const values = {
    userId,
    nickname: parsed.nickname,
    issuer: parsed.issuer || null,
    brand: parsed.brand || null,
    lastDigits: parsed.lastDigits || null,
    limitCents: parseBrlToCents(parsed.limit),
    closingDay: parsed.closingDay,
    dueDay: parsed.dueDay,
    color: parsed.color,
    status: parsed.status,
  };

  if (parsed.id) {
    const [existing] = await db
      .select({ id: creditCards.id, controlAccountId: creditCards.controlAccountId })
      .from(creditCards)
      .where(and(eq(creditCards.id, parsed.id), eq(creditCards.userId, userId)));
    if (!existing) {
      throw new Error("Cartão não encontrado.");
    }
    await db
      .update(creditCards)
      .set(values)
      .where(and(eq(creditCards.id, parsed.id), eq(creditCards.userId, userId)));

    // Mantém a conta de controle com o mesmo nome/cor do cartão, para não
    // confundir se algum dia for exposta em uma tela de depuração.
    if (existing.controlAccountId) {
      await db
        .update(accounts)
        .set({ name: `Cartão ${parsed.nickname} (controle)`, color: parsed.color })
        .where(eq(accounts.id, existing.controlAccountId));
    }
  } else {
    // A compra no crédito é lançada na conta de controle, nunca em uma
    // conta real — só a página da fatura/pagamento afeta o saldo real.
    await db.transaction(async (tx) => {
      const [card] = await tx.insert(creditCards).values(values).returning({ id: creditCards.id });

      const [controlAccount] = await tx
        .insert(accounts)
        .values({
          userId,
          name: `Cartão ${parsed.nickname} (controle)`,
          type: "outra",
          initialBalanceCents: 0,
          color: parsed.color,
          isActive: true,
          isControlAccount: true,
        })
        .returning({ id: accounts.id });

      await tx
        .update(creditCards)
        .set({ controlAccountId: controlAccount.id })
        .where(eq(creditCards.id, card.id));
    });
  }

  revalidatePath("/cartoes");
  revalidatePath("/lancamentos");
}

export async function removeCreditCard(creditCardId: string) {
  const userId = await requireUserId();

  const [existing] = await db
    .select({ id: creditCards.id, controlAccountId: creditCards.controlAccountId })
    .from(creditCards)
    .where(and(eq(creditCards.id, creditCardId), eq(creditCards.userId, userId)));
  if (!existing) {
    throw new Error("Cartão não encontrado.");
  }

  const [linkedTransaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.creditCardId, creditCardId))
    .limit(1);
  if (linkedTransaction) {
    throw new Error(
      "Este cartão tem compras ou faturas registradas e não pode ser removido. Você pode desativá-lo em vez disso.",
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(creditCards)
      .where(and(eq(creditCards.id, creditCardId), eq(creditCards.userId, userId)));
    if (existing.controlAccountId) {
      await tx.delete(accounts).where(eq(accounts.id, existing.controlAccountId));
    }
  });

  revalidatePath("/cartoes");
  revalidatePath("/lancamentos");
}
