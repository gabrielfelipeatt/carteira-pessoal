import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, transactions, type PaymentMethodKind } from "@/db/schema";

export class TransferIntegrityError extends Error {}

type TransferInput = {
  userId: string;
  originAccountId: string;
  destinationAccountId: string;
  occurredAt: Date;
  amountCents: number;
  description: string;
  notes: string | null;
  paymentMethod: PaymentMethodKind;
  customPaymentMethodId: string;
};

async function assertAccountsBelongToUser(
  userId: string,
  accountIds: string[],
) {
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  const owned = new Set(rows.map((row) => row.id));
  for (const id of accountIds) {
    if (!owned.has(id)) {
      throw new TransferIntegrityError("Conta inválida.");
    }
  }
}

/** Cria as duas pontas de uma transferência, atomicamente, com o mesmo `transferGroupId`. */
export async function createTransfer(input: TransferInput) {
  if (input.originAccountId === input.destinationAccountId) {
    throw new TransferIntegrityError(
      "Origem e destino precisam ser contas diferentes.",
    );
  }
  await assertAccountsBelongToUser(input.userId, [
    input.originAccountId,
    input.destinationAccountId,
  ]);

  const transferGroupId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values([
      {
        userId: input.userId,
        accountId: input.originAccountId,
        type: "transfer",
        direction: "outflow",
        paymentMethod: input.paymentMethod,
        customPaymentMethodId: input.customPaymentMethodId,
        amountCents: input.amountCents,
        occurredAt: input.occurredAt,
        description: input.description,
        notes: input.notes,
        transferGroupId,
      },
      {
        userId: input.userId,
        accountId: input.destinationAccountId,
        type: "transfer",
        direction: "inflow",
        paymentMethod: input.paymentMethod,
        customPaymentMethodId: input.customPaymentMethodId,
        amountCents: input.amountCents,
        occurredAt: input.occurredAt,
        description: input.description,
        notes: input.notes,
        transferGroupId,
      },
    ]);
  });

  return transferGroupId;
}

/** Atualiza as duas pontas de uma transferência existente, atomicamente. */
export async function updateTransfer(
  transferGroupId: string,
  input: TransferInput,
) {
  if (input.originAccountId === input.destinationAccountId) {
    throw new TransferIntegrityError(
      "Origem e destino precisam ser contas diferentes.",
    );
  }
  await assertAccountsBelongToUser(input.userId, [
    input.originAccountId,
    input.destinationAccountId,
  ]);

  await db.transaction(async (tx) => {
    const legs = await tx
      .select({ id: transactions.id, direction: transactions.direction })
      .from(transactions)
      .where(
        and(
          eq(transactions.transferGroupId, transferGroupId),
          eq(transactions.userId, input.userId),
        ),
      );

    if (legs.length !== 2) {
      throw new TransferIntegrityError(
        "Grupo de transferência inconsistente — não é possível editar com segurança.",
      );
    }

    const outflowLeg = legs.find((leg) => leg.direction === "outflow");
    const inflowLeg = legs.find((leg) => leg.direction === "inflow");
    if (!outflowLeg || !inflowLeg) {
      throw new TransferIntegrityError(
        "Grupo de transferência inconsistente — não é possível editar com segurança.",
      );
    }

    const sharedFields = {
      paymentMethod: input.paymentMethod,
      customPaymentMethodId: input.customPaymentMethodId,
      amountCents: input.amountCents,
      occurredAt: input.occurredAt,
      description: input.description,
      notes: input.notes,
    };

    await tx
      .update(transactions)
      .set({ ...sharedFields, accountId: input.originAccountId })
      .where(eq(transactions.id, outflowLeg.id));

    await tx
      .update(transactions)
      .set({ ...sharedFields, accountId: input.destinationAccountId })
      .where(eq(transactions.id, inflowLeg.id));
  });
}

/** Remove as duas pontas de uma transferência, atomicamente — nunca uma sozinha. */
export async function removeTransfer(userId: string, transferGroupId: string) {
  await db.transaction(async (tx) => {
    const legs = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.transferGroupId, transferGroupId),
          eq(transactions.userId, userId),
        ),
      );

    if (legs.length !== 2) {
      throw new TransferIntegrityError(
        "Grupo de transferência inconsistente — não é possível remover com segurança.",
      );
    }

    await tx
      .delete(transactions)
      .where(
        and(
          eq(transactions.transferGroupId, transferGroupId),
          eq(transactions.userId, userId),
        ),
      );
  });
}
