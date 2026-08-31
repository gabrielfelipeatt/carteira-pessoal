"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { accounts, goals, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth/guards";
import {
  goalContributionFormSchema,
  goalFormSchema,
  type GoalContributionFormInput,
  type GoalFormInput,
} from "@/lib/validation/goals";
import { parseBrlToCents } from "@/lib/finance/money";
import { localDateStringToUtcDate, currentYearMonth } from "@/lib/finance/dates";
import { computeGoalStatus } from "@/lib/finance/goals";

/**
 * Progresso de uma meta = soma assinada por `direction` dos aportes/
 * resgates vinculados a ela — mesmo padrão de `lib/finance/balances.ts`,
 * filtrando por `goalId` em vez de `accountId`. Nunca armazenado.
 */
async function sumGoalProgressCents(goalId: string): Promise<number> {
  const [row] = await db
    .select({
      progress: sql<number>`coalesce(sum(case when ${transactions.direction} = 'inflow' then -${transactions.amountCents} else ${transactions.amountCents} end), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.goalId, goalId));
  return row?.progress ?? 0;
}

export async function listGoals() {
  const userId = await requireUserId();

  const rows = await db.select().from(goals).where(eq(goals.userId, userId));
  const today = currentYearMonth();

  return Promise.all(
    rows.map(async (goal) => {
      const progressCents = await sumGoalProgressCents(goal.id);
      return {
        ...goal,
        progressCents,
        status: computeGoalStatus(progressCents, goal.targetCents, goal.targetMonth, today),
      };
    }),
  );
}

export async function saveGoal(input: GoalFormInput) {
  const userId = await requireUserId();
  const parsed = goalFormSchema.parse(input);

  const values = {
    userId,
    name: parsed.name,
    targetCents: parseBrlToCents(parsed.targetAmount),
    targetMonth: parsed.targetMonth || null,
    color: parsed.color,
    isActive: parsed.isActive,
    notes: parsed.notes || null,
  };

  if (parsed.id) {
    const [existing] = await db
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.id, parsed.id), eq(goals.userId, userId)));
    if (!existing) {
      throw new Error("Meta não encontrada.");
    }
    await db
      .update(goals)
      .set(values)
      .where(and(eq(goals.id, parsed.id), eq(goals.userId, userId)));
  } else {
    await db.insert(goals).values(values);
  }

  revalidatePath("/metas");
}

export async function removeGoal(goalId: string) {
  const userId = await requireUserId();

  const [existing] = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  if (!existing) {
    throw new Error("Meta não encontrada.");
  }

  const [linkedTransaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.goalId, goalId))
    .limit(1);
  if (linkedTransaction) {
    throw new Error(
      "Esta meta já tem aportes ou resgates e não pode ser removida. Você pode desativá-la em vez disso.",
    );
  }

  await db.delete(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));

  revalidatePath("/metas");
}

/**
 * Registra um aporte ou resgate — sempre uma transação de uma linha só
 * (`type: 'transfer'`, sem `transferGroupId`), mesmo padrão já usado em
 * `payStatement` pra pagamento de fatura. Aporte é `direction: 'outflow'`
 * (sai da conta real, soma no progresso); resgate é `direction: 'inflow'`
 * (volta pra conta, subtrai do progresso) — nunca pode exceder o
 * progresso atual, mesma checagem de "não pode pagar mais que o saldo
 * restante" já usada em `payStatement`.
 */
export async function contributeToGoal(input: GoalContributionFormInput) {
  const userId = await requireUserId();
  const parsed = goalContributionFormSchema.parse(input);

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, parsed.goalId), eq(goals.userId, userId)));
  if (!goal) {
    throw new Error("Meta não encontrada.");
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, parsed.accountId), eq(accounts.userId, userId)));
  if (!account) {
    throw new Error("Conta inválida.");
  }

  const amountCents = parseBrlToCents(parsed.amount);
  if (amountCents <= 0) {
    throw new Error("O valor deve ser positivo.");
  }

  if (parsed.mode === "resgate") {
    const progressCents = await sumGoalProgressCents(goal.id);
    if (amountCents > progressCents) {
      throw new Error("O resgate não pode ser maior que o progresso atual da meta.");
    }
  }

  await db.insert(transactions).values({
    userId,
    accountId: parsed.accountId,
    categoryId: null,
    goalId: goal.id,
    type: "transfer",
    direction: parsed.mode === "aporte" ? "outflow" : "inflow",
    amountCents,
    occurredAt: localDateStringToUtcDate(parsed.date),
    description: `${parsed.mode === "aporte" ? "Aporte" : "Resgate"} — ${goal.name}`,
    notes: parsed.notes || null,
  });

  revalidatePath("/metas");
  revalidatePath("/lancamentos");
  revalidatePath("/");
}
