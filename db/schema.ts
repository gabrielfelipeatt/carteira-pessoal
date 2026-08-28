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
