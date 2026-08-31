/**
 * Cálculo puro (sem I/O) de status de meta financeira — separado para ser
 * testável em isolamento, mesmo padrão de `statement-cycle.ts` (a soma de
 * progresso, que precisa de banco, fica em `lib/actions/goals.ts`).
 */

export type GoalStatus = "no_prazo" | "atrasada" | "concluida";

/**
 * Status é sempre derivado na leitura — nunca armazenado (mesmo princípio
 * de `computeEffectiveStatus` das faturas). "Concluída" tem prioridade
 * sobre prazo vencido: bater a meta depois do previsto ainda é bater a
 * meta.
 */
export function computeGoalStatus(
  progressCents: number,
  targetCents: number,
  targetMonth: string | null,
  today: string,
): GoalStatus {
  if (progressCents >= targetCents) return "concluida";
  if (targetMonth && targetMonth < today) return "atrasada";
  return "no_prazo";
}
