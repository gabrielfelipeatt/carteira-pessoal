"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { accounts, transactions } from "@/db/schema";
import { toResult, UserFacingError, type ActionResult } from "@/lib/actions/result";
import { requireUserId } from "@/lib/auth/guards";
import { accountFormSchema, type AccountFormInput } from "@/lib/validation/accounts";
import { parseBrlToCents } from "@/lib/finance/money";
import { computeAccountBalanceDeltasByUser } from "@/lib/finance/balances";

export async function listAccounts() {
  const userId = await requireUserId();

  const [rows, deltas] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isControlAccount, false))),
    computeAccountBalanceDeltasByUser(userId),
  ]);

  return rows
    .map((account) => ({
      ...account,
      currentBalanceCents:
        account.initialBalanceCents + (deltas[account.id] ?? 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function saveAccount(input: AccountFormInput) {
  const userId = await requireUserId();
  const parsed = accountFormSchema.parse(input);

  const initialBalanceCents = parseBrlToCents(parsed.initialBalance);

  const values = {
    userId,
    name: parsed.name,
    institution: parsed.institution || null,
    type: parsed.type,
    lastDigits: parsed.lastDigits || null,
    initialBalanceCents,
    color: parsed.color,
    isActive: parsed.isActive,
  };

  if (parsed.id) {
    const [existing] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, parsed.id), eq(accounts.userId, userId)));
    if (!existing) {
      throw new Error("Conta não encontrada.");
    }
    await db
      .update(accounts)
      .set(values)
      .where(and(eq(accounts.id, parsed.id), eq(accounts.userId, userId)));
  } else {
    await db.insert(accounts).values(values);
  }

  revalidatePath("/lancamentos");
  revalidatePath("/");
}

async function removeAccountOrThrow(accountId: string) {
  const userId = await requireUserId();

  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!existing) {
    throw new UserFacingError("Conta não encontrada.");
  }

  const [linkedTransaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.accountId, accountId))
    .limit(1);

  if (linkedTransaction) {
    throw new UserFacingError(
      "Esta conta tem lançamentos e não pode ser removida. Você pode desativá-la em vez disso.",
    );
  }

  await db
    .delete(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

  revalidatePath("/lancamentos");
  revalidatePath("/");
}

export async function removeAccount(accountId: string): Promise<ActionResult> {
  return toResult(() => removeAccountOrThrow(accountId));
}
