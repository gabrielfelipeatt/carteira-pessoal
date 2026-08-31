import {
  index,
  integer,
  type AnySQLiteColumn,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

// ---------------------------------------------------------------------------
// Tipos (espelham os enums de texto validados por Zod em lib/validation/*)
// ---------------------------------------------------------------------------

export type AccountType =
  | "corrente"
  | "poupanca"
  | "dinheiro"
  | "investimento"
  | "outra";

export type CategoryKind = "income" | "expense" | "transfer" | "adjustment";

export type PaymentMethodKind =
  | "pix"
  | "boleto"
  | "dinheiro"
  | "debito"
  | "credito"
  | "transferencia"
  | "outro";

export type CreditCardStatus = "active" | "inactive";

export type StatementStatus = "open" | "closed" | "overdue" | "paid";

export type TransactionType = "income" | "expense" | "transfer" | "adjustment";

export type Direction = "inflow" | "outflow";

export type CategoryRuleSource = "manual" | "history" | "keyword";

export type FixedExpenseType = "income" | "expense";

// ---------------------------------------------------------------------------
// Helpers de coluna
// ---------------------------------------------------------------------------

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// Contas
// ---------------------------------------------------------------------------

export const accounts = sqliteTable(
  "accounts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    institution: text("institution"),
    type: text("type").notNull().$type<AccountType>(),
    lastDigits: text("last_digits"),
    initialBalanceCents: integer("initial_balance_cents").notNull().default(0),
    color: text("color").notNull().default("#1B4DD1"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    // Conta interna criada automaticamente para cada cartão de crédito —
    // nunca aparece nos seletores nem no saldo consolidado. Compras no
    // crédito são lançadas nela (não em uma conta real) para que o saldo
    // real só seja afetado quando a fatura for paga — nunca na compra.
    isControlAccount: integer("is_control_account", { mode: "boolean" })
      .notNull()
      .default(false),
    ...timestamps,
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export const categories = sqliteTable(
  "categories",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references(
      (): AnySQLiteColumn => categories.id,
      { onDelete: "restrict" },
    ),
    name: text("name").notNull(),
    kind: text("kind").notNull().$type<CategoryKind>(),
    color: text("color").notNull().default("#4A5568"),
    icon: text("icon"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    // Se um orçamento na categoria-pai deve somar também os lançamentos das subcategorias.
    rollupToParentBudget: integer("rollup_to_parent_budget", { mode: "boolean" })
      .notNull()
      .default(true),
    ...timestamps,
  },
  (table) => [
    index("categories_user_id_idx").on(table.userId),
    index("categories_user_id_parent_id_idx").on(table.userId, table.parentId),
  ],
);

// ---------------------------------------------------------------------------
// Formas de pagamento
// ---------------------------------------------------------------------------

export const paymentMethods = sqliteTable(
  "payment_methods",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").notNull().$type<PaymentMethodKind>(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    // Meios padrão do sistema (Pix, boleto, ...) — não podem ser removidos, só pausados.
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (table) => [index("payment_methods_user_id_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// Cartões de crédito
// ---------------------------------------------------------------------------

export const creditCards = sqliteTable(
  "credit_cards",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    nickname: text("nickname").notNull(),
    issuer: text("issuer"),
    brand: text("brand"),
    lastDigits: text("last_digits"),
    limitCents: integer("limit_cents").notNull(),
    closingDay: integer("closing_day").notNull(),
    dueDay: integer("due_day").notNull(),
    status: text("status").notNull().$type<CreditCardStatus>().default("active"),
    color: text("color").notNull().default("#1B4DD1"),
    // Conta de controle interna (accounts.isControlAccount = true) onde as
    // compras deste cartão são lançadas — nunca uma conta real do usuário.
    controlAccountId: text("control_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    ...timestamps,
  },
  (table) => [index("credit_cards_user_id_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// Faturas
// ---------------------------------------------------------------------------

export const creditCardStatements = sqliteTable(
  "credit_card_statements",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    creditCardId: text("credit_card_id")
      .notNull()
      .references(() => creditCards.id, { onDelete: "restrict" }),
    referenceMonth: text("reference_month").notNull(), // formato 'YYYY-MM'
    periodStart: integer("period_start", { mode: "timestamp_ms" }).notNull(),
    periodEnd: integer("period_end", { mode: "timestamp_ms" }).notNull(),
    dueDate: integer("due_date", { mode: "timestamp_ms" }).notNull(),
    status: text("status").notNull().$type<StatementStatus>().default("open"),
    totalCents: integer("total_cents").notNull().default(0),
    paidCents: integer("paid_cents").notNull().default(0),
    closedAt: integer("closed_at", { mode: "timestamp_ms" }),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [
    index("statements_user_id_idx").on(table.userId),
    index("statements_credit_card_id_idx").on(table.creditCardId),
    uniqueIndex("statements_card_reference_month_unique").on(
      table.creditCardId,
      table.referenceMonth,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Despesas fixas recorrentes
// ---------------------------------------------------------------------------

export const fixedExpenses = sqliteTable(
  "fixed_expenses",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    // "expense" (padrão, dados existentes) ou "income" — receita fixa
    // reaproveita o mesmo mecanismo, nunca é no cartão.
    type: text("type").notNull().$type<FixedExpenseType>().default("expense"),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    // 1-31, clampado para o último dia do mês quando o mês é mais curto.
    dayOfMonth: integer("day_of_month").notNull(),
    paymentMethodId: text("payment_method_id")
      .notNull()
      .references(() => paymentMethods.id, { onDelete: "restrict" }),
    creditCardId: text("credit_card_id").references(() => creditCards.id, {
      onDelete: "restrict",
    }),
    accountId: text("account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    startMonth: text("start_month").notNull(), // 'YYYY-MM'
    endMonth: text("end_month"), // 'YYYY-MM', inclusive; null = sem data final
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [index("fixed_expenses_user_id_idx").on(table.userId)],
);

export const fixedExpenseSkips = sqliteTable(
  "fixed_expense_skips",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Diferente do resto do schema: cascade, não restrict — um registro de
    // "dispensei este mês" não tem sentido nenhum sem o modelo pai.
    fixedExpenseId: text("fixed_expense_id")
      .notNull()
      .references(() => fixedExpenses.id, { onDelete: "cascade" }),
    competencia: text("competencia").notNull(), // 'YYYY-MM'
    ...timestamps,
  },
  (table) => [
    uniqueIndex("fixed_expense_skips_fixed_expense_id_competencia_unique").on(
      table.fixedExpenseId,
      table.competencia,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Metas financeiras
// ---------------------------------------------------------------------------

export const goals = sqliteTable(
  "goals",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetCents: integer("target_cents").notNull(),
    targetMonth: text("target_month"), // 'YYYY-MM', opcional
    color: text("color").notNull().default("#1B4DD1"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [index("goals_user_id_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------------

export const transactions = sqliteTable(
  "transactions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    creditCardId: text("credit_card_id").references(() => creditCards.id, {
      onDelete: "restrict",
    }),
    statementId: text("statement_id").references(
      () => creditCardStatements.id,
      { onDelete: "restrict" },
    ),
    customPaymentMethodId: text("custom_payment_method_id").references(
      () => paymentMethods.id,
      { onDelete: "restrict" },
    ),
    type: text("type").notNull().$type<TransactionType>(),
    direction: text("direction").notNull().$type<Direction>(),
    paymentMethod: text("payment_method").$type<PaymentMethodKind>(),
    // Sempre positivo — o sentido (entrada/saída) vem de `direction`.
    amountCents: integer("amount_cents").notNull(),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
    description: text("description").notNull(),
    notes: text("notes"),
    // Liga as duas pontas de uma transferência (sempre exatamente 2 linhas).
    transferGroupId: text("transfer_group_id"),
    // Preenchidos só quando esta linha foi gerada a partir da confirmação
    // de uma despesa fixa recorrente — nunca tocados numa edição normal.
    fixedExpenseId: text("fixed_expense_id").references(() => fixedExpenses.id, {
      onDelete: "restrict",
    }),
    // 'YYYY-MM' — guardado explicitamente no momento da geração, nunca
    // recalculado a partir de `occurredAt` (editar a data depois não pode
    // fazer a competência "sumir" e voltar a aparecer como pendente).
    competencia: text("competencia"),
    // Liga as N parcelas de uma compra parcelada no cartão (cada parcela é
    // uma linha independente, uma por fatura futura — nunca uma só linha
    // com valor total).
    installmentGroupId: text("installment_group_id"),
    installmentNumber: integer("installment_number"),
    installmentTotal: integer("installment_total"),
    // Preenchido só num aporte/resgate de meta (sempre `type:'transfer'`,
    // uma linha só, sem `transferGroupId` — não é transferência entre 2
    // contas, é só o marcador de "esse dinheiro foi separado pra essa
    // meta"). `direction` já diz se foi aporte (outflow) ou resgate (inflow).
    goalId: text("goal_id").references(() => goals.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("transactions_user_id_occurred_at_idx").on(
      table.userId,
      table.occurredAt,
    ),
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_category_id_idx").on(table.categoryId),
    index("transactions_statement_id_idx").on(table.statementId),
    index("transactions_transfer_group_id_idx").on(table.transferGroupId),
    index("transactions_fixed_expense_id_idx").on(table.fixedExpenseId),
    index("transactions_installment_group_id_idx").on(table.installmentGroupId),
    index("transactions_goal_id_idx").on(table.goalId),
  ],
);

// ---------------------------------------------------------------------------
// Orçamentos
// ---------------------------------------------------------------------------

export const budgets = sqliteTable(
  "budgets",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1-12
    limitCents: integer("limit_cents").notNull(),
    ...timestamps,
  },
  (table) => [
    index("budgets_user_id_idx").on(table.userId),
    uniqueIndex("budgets_user_category_year_month_unique").on(
      table.userId,
      table.categoryId,
      table.year,
      table.month,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Regras de sugestão de categoria
// ---------------------------------------------------------------------------

export const categoryRules = sqliteTable(
  "category_rules",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    pattern: text("pattern").notNull(),
    normalizedPattern: text("normalized_pattern").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    confidence: real("confidence").notNull().default(0.5),
    source: text("source").notNull().$type<CategoryRuleSource>(),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    useCount: integer("use_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("category_rules_user_id_idx").on(table.userId),
    index("category_rules_normalized_pattern_idx").on(
      table.normalizedPattern,
    ),
  ],
);
