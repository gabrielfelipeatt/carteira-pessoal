"use server";

import { and, eq, gte, inArray, isNotNull, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  accounts,
  categories,
  creditCardStatements,
  creditCards,
  paymentMethods,
  transactions,
  type AccountType,
  type PaymentMethodKind,
} from "@/db/schema";
import { requireUserId } from "@/lib/auth/guards";
import {
  localDateStringToUtcDate,
  utcDateToLocalDateString,
} from "@/lib/finance/dates";
import { resolveCycleForDate } from "@/lib/finance/statement-cycle";
import {
  computeStatementOwedCents,
  payStatement,
  resolveStatementForPurchase,
} from "@/lib/finance/statements";
import { createTransfer } from "@/lib/finance/transfers";
import {
  classifyBankRow,
  classifyCardRow,
  classifyFlashRow,
  consumeDuplicate,
  countKeys,
  directionOf,
  matchKey,
  normalizeText,
  paymentKindForTipo,
  type ImportInput,
  type ImportKind,
  type ImportPreview,
  type ImportPreviewItem,
  type ImportResult,
  type ImportRow,
  type ImportSheetName,
} from "@/lib/finance/import";

const MAX_ROWS = 2000;
const IMPORT_NOTE = "Importado da planilha";
const UNCATEGORIZED = "Sem categoria";
const COFRINHO_NAME = "Cofrinho";

const rowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cents: z.number().int(),
  desc: z.string().trim().min(1).max(200),
  tipo: z.string().max(60),
});

const importInputSchema = z.object({
  itauAccountId: z.string().optional(),
  creditCardId: z.string().optional(),
  itau: z.array(rowSchema).max(MAX_ROWS),
  nubank: z.array(rowSchema).max(MAX_ROWS),
  flash: z.array(rowSchema).max(MAX_ROWS),
});

/** Só o que o commit precisa além do que a tela mostra. */
type Internal = {
  accountKey: "itau" | "cofrinho" | "flash" | "card";
  flashName?: string;
  cardId?: string;
  statementId?: string;
  categoryId: string | null; // null = "Sem categoria" (criada só se preciso)
};

type Analyzed = ImportPreviewItem & { internal: Internal };

type Category = typeof categories.$inferSelect;

function flashAccountName(tipo: string) {
  return `Flash ${tipo.trim() || "Geral"}`;
}

/**
 * Análise única, usada tanto pela prévia quanto pela importação: o servidor
 * nunca confia no status que a tela mostrou — refaz a classificação e a
 * detecção de duplicatas no momento de gravar.
 */
async function analyze(userId: string, raw: ImportInput) {
  const input = importInputSchema.parse(raw);

  if (input.itau.length > 0 && !input.itauAccountId) {
    throw new Error("Selecione a conta da aba Itaú.");
  }
  if (input.nubank.length > 0 && !input.creditCardId) {
    throw new Error("Selecione o cartão da aba Nubank.");
  }

  const userAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isControlAccount, false)));
  const userCards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
  const userCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId));

  const itauAccount = input.itauAccountId
    ? userAccounts.find((a) => a.id === input.itauAccountId)
    : undefined;
  if (input.itau.length > 0 && !itauAccount) throw new Error("Conta inválida.");

  const purchaseCard = input.creditCardId
    ? userCards.find((c) => c.id === input.creditCardId)
    : undefined;
  if (input.nubank.length > 0 && !purchaseCard) throw new Error("Cartão inválido.");

  const cofrinhoAccount = userAccounts.find((a) =>
    normalizeText(a.name).includes("cofrinho"),
  );
  const flashAccountByName = new Map(
    userAccounts.map((a) => [normalizeText(a.name), a]),
  );

  // --- Lançamentos que já existem no período (para detectar duplicatas) ----
  const allDates = [...input.itau, ...input.nubank, ...input.flash].map((r) => r.date).sort();
  const existing =
    allDates.length === 0
      ? []
      : await db
          .select({
            accountId: transactions.accountId,
            creditCardId: transactions.creditCardId,
            type: transactions.type,
            direction: transactions.direction,
            amountCents: transactions.amountCents,
            occurredAt: transactions.occurredAt,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              gte(transactions.occurredAt, localDateStringToUtcDate(allDates[0])),
              lt(
                transactions.occurredAt,
                new Date(
                  localDateStringToUtcDate(allDates[allDates.length - 1]).getTime() +
                    24 * 60 * 60 * 1000,
                ),
              ),
            ),
          );

  const keyOf = (t: (typeof existing)[number]) =>
    matchKey(utcDateToLocalDateString(t.occurredAt), t.amountCents, t.direction);

  const bankExisting = countKeys(
    existing.filter((t) => t.accountId === itauAccount?.id).map(keyOf),
  );
  const cardExisting = countKeys(
    existing
      .filter((t) => t.creditCardId === purchaseCard?.id && t.type === "expense")
      .map(keyOf),
  );
  const flashExistingByAccount = new Map<string, Map<string, number>>();
  const flashExisting = (accountId: string) => {
    let map = flashExistingByAccount.get(accountId);
    if (!map) {
      map = countKeys(existing.filter((t) => t.accountId === accountId).map(keyOf));
      flashExistingByAccount.set(accountId, map);
    }
    return map;
  };

  // Pagamentos de fatura já registrados (qualquer data — o app grava o
  // pagamento com a data em que foi lançado, não a do extrato).
  const cardIdsInPayments = userCards.map((c) => c.id);
  const existingPayments =
    cardIdsInPayments.length === 0
      ? []
      : await db
          .select({ creditCardId: transactions.creditCardId, amountCents: transactions.amountCents })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              eq(transactions.type, "transfer"),
              isNotNull(transactions.statementId),
              inArray(transactions.creditCardId, cardIdsInPayments),
            ),
          );
  const paymentCounts = countKeys(
    existingPayments.map((p) => `${p.creditCardId}|${p.amountCents}`),
  );

  // --- Faturas: saldo restante de cada uma (para alocar pagamentos) --------
  const statements = await db
    .select()
    .from(creditCardStatements)
    .where(eq(creditCardStatements.userId, userId));
  const statementByCardMonth = new Map(
    statements.map((s) => [`${s.creditCardId}|${s.referenceMonth}`, s]),
  );
  const remainingByStatement = new Map<string, number>();
  const payableStatementsByCard = new Map<string, typeof statements>();
  for (const s of [...statements].sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth))) {
    if (s.status === "paid") continue;
    const owed = await computeStatementOwedCents(s);
    remainingByStatement.set(s.id, owed - s.paidCents);
    const list = payableStatementsByCard.get(s.creditCardId) ?? [];
    list.push(s);
    payableStatementsByCard.set(s.creditCardId, list);
  }

  // --- Categoria sugerida pelo histórico (mesma descrição, mesmo tipo) -----
  const history = await db
    .select({
      description: transactions.description,
      type: transactions.type,
      categoryId: transactions.categoryId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNotNull(transactions.categoryId),
        inArray(transactions.type, ["income", "expense"]),
      ),
    );
  const votes = new Map<string, Map<string, number>>();
  for (const h of history) {
    const key = `${h.type}|${normalizeText(h.description)}`;
    const byCategory = votes.get(key) ?? new Map<string, number>();
    byCategory.set(h.categoryId as string, (byCategory.get(h.categoryId as string) ?? 0) + 1);
    votes.set(key, byCategory);
  }
  const categoryById = new Map<string, Category>(userCategories.map((c) => [c.id, c]));
  const uncategorizedByKind = (kind: "income" | "expense") =>
    userCategories.find(
      (c) => c.kind === kind && normalizeText(c.name) === normalizeText(UNCATEGORIZED),
    );

  function guessCategory(type: "income" | "expense", desc: string) {
    const byCategory = votes.get(`${type}|${normalizeText(desc)}`);
    let best: string | null = null;
    let bestCount = 0;
    for (const [categoryId, count] of byCategory ?? []) {
      if (count > bestCount && categoryById.get(categoryId)?.isActive) {
        best = categoryId;
        bestCount = count;
      }
    }
    if (best) return { id: best, name: categoryById.get(best)?.name ?? UNCATEGORIZED };
    const fallback = uncategorizedByKind(type);
    return { id: fallback?.id ?? null, name: UNCATEGORIZED };
  }

  // --- Montagem dos itens --------------------------------------------------
  const items: Analyzed[] = [];
  const newAccounts = new Set<string>();

  function base(sheet: ImportSheetName, index: number, row: ImportRow, kind: ImportKind) {
    return {
      key: `${sheet}:${index}`,
      sheet,
      date: row.date,
      cents: Math.abs(row.cents),
      direction: directionOf(row.cents),
      desc: row.desc,
      tipo: row.tipo,
      kind,
    };
  }

  const cardNicknames = userCards.map((c) => c.nickname);

  input.itau.forEach((row, index) => {
    const kind = classifyBankRow(row, cardNicknames);
    const common = base("itau", index, row, kind);
    const accountName = itauAccount?.name ?? "Itaú";
    const key = matchKey(row.date, Math.abs(row.cents), directionOf(row.cents));

    if (kind === "zero") {
      items.push({ ...common, status: "skip", note: "Valor zero.", category: null, target: accountName, internal: { accountKey: "itau", categoryId: null } });
      return;
    }

    if (kind === "cofrinho") {
      if (!cofrinhoAccount) newAccounts.add(COFRINHO_NAME);
      const dup = consumeDuplicate(bankExisting, key);
      items.push({
        ...common,
        status: dup ? "duplicate" : "new",
        note: dup ? "Já existe um lançamento com a mesma data e valor nesta conta." : null,
        category: null,
        target:
          row.cents < 0
            ? `${accountName} → ${cofrinhoAccount?.name ?? COFRINHO_NAME}`
            : `${cofrinhoAccount?.name ?? COFRINHO_NAME} → ${accountName}`,
        internal: { accountKey: "itau", categoryId: null },
      });
      return;
    }

    if (kind === "card_payment") {
      const card = userCards.find((c) => normalizeText(c.nickname) === normalizeText(row.desc));
      const target = `Pagamento de fatura — ${card?.nickname ?? row.desc}`;
      if (!card) {
        items.push({ ...common, status: "review", note: "Cartão não encontrado.", category: null, target, internal: { accountKey: "itau", categoryId: null } });
        return;
      }
      if (consumeDuplicate(paymentCounts, `${card.id}|${Math.abs(row.cents)}`)) {
        items.push({ ...common, status: "duplicate", note: "Já existe um pagamento de fatura com este valor.", category: null, target, internal: { accountKey: "itau", cardId: card.id, categoryId: null } });
        return;
      }
      const statement = (payableStatementsByCard.get(card.id) ?? []).find(
        (s) => (remainingByStatement.get(s.id) ?? 0) >= Math.abs(row.cents),
      );
      if (!statement) {
        items.push({ ...common, status: "review", note: "Nenhuma fatura em aberto com saldo suficiente para este pagamento.", category: null, target, internal: { accountKey: "itau", cardId: card.id, categoryId: null } });
        return;
      }
      remainingByStatement.set(
        statement.id,
        (remainingByStatement.get(statement.id) ?? 0) - Math.abs(row.cents),
      );
      items.push({
        ...common,
        status: "new",
        note: null,
        category: null,
        target: `${target} (fatura ${statement.referenceMonth})`,
        internal: { accountKey: "itau", cardId: card.id, statementId: statement.id, categoryId: null },
      });
      return;
    }

    const type = kind === "income" ? "income" : "expense";
    const category = guessCategory(type, row.desc);
    const dup = consumeDuplicate(bankExisting, key);
    items.push({
      ...common,
      status: dup ? "duplicate" : "new",
      note: dup ? "Já existe um lançamento com a mesma data e valor nesta conta." : null,
      category: category.name,
      target: accountName,
      internal: { accountKey: "itau", categoryId: category.id },
    });
  });

  input.nubank.forEach((row, index) => {
    const kind = classifyCardRow(row);
    const common = base("nubank", index, row, kind);
    const cardName = purchaseCard?.nickname ?? "Cartão";
    const internal: Internal = { accountKey: "card", cardId: purchaseCard?.id, categoryId: null };

    if (kind === "zero") {
      items.push({ ...common, status: "skip", note: "Valor zero.", category: null, target: cardName, internal });
    } else if (kind === "card_payment_info") {
      items.push({ ...common, status: "skip", note: "Pagamento da fatura — já é registrado pela linha correspondente da conta.", category: null, target: cardName, internal });
    } else if (kind === "card_credit") {
      items.push({ ...common, status: "review", note: "Crédito/estorno no cartão não é suportado — lance como ajuste manualmente, se quiser.", category: null, target: cardName, internal });
    } else if (purchaseCard) {
      const cycle = resolveCycleForDate(
        localDateStringToUtcDate(row.date),
        purchaseCard.closingDay,
        purchaseCard.dueDay,
      );
      const statement = statementByCardMonth.get(`${purchaseCard.id}|${cycle.referenceMonth}`);
      const target = `${cardName} · fatura ${cycle.referenceMonth}`;
      const category = guessCategory("expense", row.desc);
      const key = matchKey(row.date, Math.abs(row.cents), "outflow");
      if (statement && statement.status !== "open") {
        items.push({ ...common, status: "review", note: `A fatura ${cycle.referenceMonth} já está fechada.`, category: category.name, target, internal: { ...internal, categoryId: category.id } });
      } else {
        const dup = consumeDuplicate(cardExisting, key);
        items.push({
          ...common,
          status: dup ? "duplicate" : "new",
          note: dup ? "Já existe uma compra com a mesma data e valor neste cartão." : null,
          category: category.name,
          target,
          internal: { ...internal, categoryId: category.id },
        });
      }
    }
  });

  input.flash.forEach((row, index) => {
    const kind = classifyFlashRow(row);
    const common = base("flash", index, row, kind);
    const accountName = flashAccountName(row.tipo);
    const account = flashAccountByName.get(normalizeText(accountName));
    const internal: Internal = { accountKey: "flash", flashName: accountName, categoryId: null };
    if (!account) newAccounts.add(accountName);

    if (kind === "zero") {
      items.push({ ...common, status: "skip", note: "Valor zero.", category: null, target: accountName, internal });
      return;
    }
    const key = matchKey(row.date, Math.abs(row.cents), directionOf(row.cents));
    const dup = account ? consumeDuplicate(flashExisting(account.id), key) : false;
    const type = kind === "income" ? "income" : "expense";
    const category = kind === "adjustment" ? null : guessCategory(type, row.desc);
    items.push({
      ...common,
      status: dup ? "duplicate" : "new",
      note: dup ? "Já existe um lançamento com a mesma data e valor nesta conta." : null,
      category: category?.name ?? null,
      target: account ? accountName : `${accountName} (nova conta)`,
      internal: { ...internal, categoryId: category?.id ?? null },
    });
  });

  return {
    items,
    newAccounts: [...newAccounts],
    ctx: { userId, itauAccount, purchaseCard, cofrinhoAccount, userAccounts, userCategories },
  };
}

export async function previewImport(raw: ImportInput): Promise<ImportPreview> {
  const userId = await requireUserId();
  const { items, newAccounts } = await analyze(userId, raw);
  return {
    // `internal` é só do servidor — nunca vai para a tela.
    items: items.map((item) => {
      const { internal, ...visible } = item;
      void internal;
      return visible;
    }),
    newAccounts,
  };
}

async function loadPaymentMethodResolver(userId: string) {
  const methods = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.isActive, true)));

  return (kind: PaymentMethodKind) => {
    const method =
      methods.find((m) => m.kind === kind && m.isSystem) ??
      methods.find((m) => m.kind === kind) ??
      methods.find((m) => m.kind === "outro");
    if (!method) throw new Error("Nenhuma forma de pagamento disponível.");
    return method;
  };
}

export async function commitImport(
  raw: ImportInput & { selectedKeys: string[] },
): Promise<ImportResult> {
  const userId = await requireUserId();
  const { selectedKeys, ...input } = raw;
  const selected = new Set(z.array(z.string()).max(MAX_ROWS * 3).parse(selectedKeys));

  const { items, ctx } = await analyze(userId, input);
  const methodFor = await loadPaymentMethodResolver(userId);

  const result: ImportResult = { imported: 0, createdAccounts: [], errors: [] };
  const accountCache = new Map<string, string>();

  async function ensureAccount(name: string, type: AccountType, color: string, existingId?: string) {
    if (existingId) return existingId;
    const cached = accountCache.get(name);
    if (cached) return cached;
    const [created] = await db
      .insert(accounts)
      .values({ userId, name, type, color })
      .returning({ id: accounts.id });
    accountCache.set(name, created.id);
    result.createdAccounts.push(name);
    return created.id;
  }

  const uncategorizedCache = new Map<string, string>();
  async function ensureCategoryId(kind: "income" | "expense", categoryId: string | null) {
    if (categoryId) return categoryId;
    const existingCategory = ctx.userCategories.find(
      (c) => c.kind === kind && normalizeText(c.name) === normalizeText(UNCATEGORIZED),
    );
    if (existingCategory) return existingCategory.id;
    const cached = uncategorizedCache.get(kind);
    if (cached) return cached;
    const [created] = await db
      .insert(categories)
      .values({ userId, name: UNCATEGORIZED, kind, color: "#4A5568" })
      .returning({ id: categories.id });
    uncategorizedCache.set(kind, created.id);
    return created.id;
  }

  for (const item of items) {
    if (!selected.has(item.key)) continue;
    if (item.status !== "new" && item.status !== "duplicate") {
      result.errors.push({ key: item.key, message: item.note ?? "Linha não importável." });
      continue;
    }

    try {
      const occurredAt = localDateStringToUtcDate(item.date);
      const { internal } = item;

      if (item.kind === "cofrinho") {
        const itauId = ctx.itauAccount?.id;
        if (!itauId) throw new Error("Conta inválida.");
        const cofrinhoId = await ensureAccount(COFRINHO_NAME, "investimento", "#7A5AC9", ctx.cofrinhoAccount?.id);
        const method = methodFor("transferencia");
        const applying = item.direction === "outflow";
        await createTransfer({
          userId,
          originAccountId: applying ? itauId : cofrinhoId,
          destinationAccountId: applying ? cofrinhoId : itauId,
          amountCents: item.cents,
          occurredAt,
          description: item.desc,
          notes: IMPORT_NOTE,
          paymentMethod: method.kind,
          customPaymentMethodId: method.id,
        });
      } else if (item.kind === "card_payment") {
        if (!internal.statementId || !ctx.itauAccount) throw new Error("Fatura não resolvida.");
        await payStatement(userId, internal.statementId, item.cents, ctx.itauAccount.id, occurredAt);
      } else if (item.kind === "card_purchase") {
        const card = ctx.purchaseCard;
        if (!card?.controlAccountId) throw new Error("Cartão inválido.");
        const statementId = await resolveStatementForPurchase(userId, card.id, occurredAt);
        const method = methodFor("credito");
        await db.insert(transactions).values({
          userId,
          accountId: card.controlAccountId,
          categoryId: await ensureCategoryId("expense", internal.categoryId),
          creditCardId: card.id,
          statementId,
          type: "expense",
          direction: "outflow",
          paymentMethod: method.kind,
          customPaymentMethodId: method.id,
          amountCents: item.cents,
          occurredAt,
          description: item.desc,
          notes: IMPORT_NOTE,
        });
      } else if (item.kind === "income" || item.kind === "expense" || item.kind === "adjustment") {
        let accountId: string;
        if (item.sheet === "flash") {
          const name = internal.flashName ?? flashAccountName(item.tipo);
          const found = ctx.userAccounts.find((a) => normalizeText(a.name) === normalizeText(name));
          accountId = await ensureAccount(name, "outra", "#2F6E51", found?.id);
        } else {
          if (!ctx.itauAccount) throw new Error("Conta inválida.");
          accountId = ctx.itauAccount.id;
        }

        if (item.kind === "adjustment") {
          await db.insert(transactions).values({
            userId,
            accountId,
            categoryId: null,
            type: "adjustment",
            direction: item.direction,
            paymentMethod: null,
            customPaymentMethodId: null,
            amountCents: item.cents,
            occurredAt,
            description: item.desc,
            notes: IMPORT_NOTE,
          });
        } else {
          const method = methodFor(item.sheet === "flash" ? "outro" : paymentKindForTipo(item.tipo));
          await db.insert(transactions).values({
            userId,
            accountId,
            categoryId: await ensureCategoryId(item.kind, internal.categoryId),
            type: item.kind,
            direction: item.direction,
            paymentMethod: method.kind,
            customPaymentMethodId: method.id,
            amountCents: item.cents,
            occurredAt,
            description: item.desc,
            notes: IMPORT_NOTE,
          });
        }
      } else {
        throw new Error("Linha não importável.");
      }

      result.imported += 1;
    } catch (error) {
      result.errors.push({
        key: item.key,
        message: error instanceof Error ? error.message : "Erro ao importar a linha.",
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/lancamentos");
  revalidatePath("/cartoes");
  revalidatePath("/relatorios");
  return result;
}
