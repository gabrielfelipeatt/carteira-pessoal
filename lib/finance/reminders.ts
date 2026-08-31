/**
 * Moldagem/ordenação pura de lembretes — combina faturas a vencer e
 * lançamentos fixos pendentes num único feed, sem tocar no banco (a
 * leitura de dados fica em `lib/actions/reminders.ts`). Não existe
 * cron/job: os lembretes são recalculados a cada carregamento do
 * dashboard, mesmo princípio de `computeEffectiveStatus`.
 */

export type Reminder =
  | {
      kind: "statement";
      cardId: string;
      cardNickname: string;
      statementId: string;
      dueDate: Date;
      dueInDays: number;
      owedCents: number;
      effectiveStatus: "open" | "closed" | "overdue";
    }
  | {
      kind: "fixed-occurrence";
      type: "income" | "expense";
      fixedExpenseId: string;
      description: string;
      competencia: string;
      suggestedAmountCents: number;
    };

/**
 * Menor valor = mais urgente. Faturas usam os próprios dias até o
 * vencimento (negativo = já vencida). Um lançamento fixo pendente não tem
 * um "dia de vencimento" da mesma forma — já pode ser confirmado a
 * qualquer momento do mês corrente — então recebe um valor fixo
 * (equivalente a "vence em 3 dias") pra ficar perto do topo sem disputar
 * posição com faturas já vencidas ou vencendo hoje/amanhã.
 */
function urgencyRank(reminder: Reminder): number {
  return reminder.kind === "statement" ? reminder.dueInDays : 3;
}

export function sortReminders(reminders: Reminder[]): Reminder[] {
  return [...reminders].sort((a, b) => {
    const rankDiff = urgencyRank(a) - urgencyRank(b);
    if (rankDiff !== 0) return rankDiff;
    if (a.kind !== b.kind) return a.kind === "statement" ? -1 : 1;
    const labelA = a.kind === "statement" ? a.cardNickname : a.description;
    const labelB = b.kind === "statement" ? b.cardNickname : b.description;
    return labelA.localeCompare(labelB, "pt-BR");
  });
}
