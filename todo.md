# Todo — Carteira Pessoal

Checklist verificável por fase. Ver o plano completo em
`C:\Users\gabriel.lima\.claude\plans\prd-carteira-delegated-rain.md`.

## Fase 0 — Preparação

- [x] Projeto Next.js (TypeScript estrito, Tailwind, App Router) via pnpm
- [x] git inicializado, `.gitignore` protegendo `user.txt` e `.env*`
- [x] shadcn/ui inicializado + componentes base instalados
- [x] Identidade visual ("caderno de conciliação"): tokens de cor, fontes
      serif/mono, textura de grade — em `app/globals.css`
- [x] `db/schema.ts` completo (8 tabelas de negócio + tabelas do Better Auth)
- [x] `drizzle.config.ts` + primeira migration gerada e aplicada no Turso
- [x] `lib/env.ts` (Zod, falha rápido) + `lib/db/client.ts`
- [x] `.env.example` documentado, `.env.local` preenchido com Turso real
- [x] `vitest.config.ts` (projetos unit/integration) + `playwright.config.ts`
      (mobile-390 funcional + tablet-768/desktop-1440 visual)
- [x] Scripts: `lint`, `typecheck`, `test:unit`, `test:integration`,
      `test:e2e`, `db:generate`, `db:migrate`, `db:studio`, `create-user`
- [x] `pnpm run typecheck && pnpm run lint && pnpm run build` verdes

## Fase 1 — Fundação visual e shell privado

- [x] Better Auth (e-mail/senha, sem cadastro público) — `lib/auth/auth.ts`
- [x] `db/seed-user.ts` lê `user.txt` e cria a única conta (testado e ok)
- [x] Sessão de longa duração (1 ano, renovada a cada uso) — fica logado até
      clicar em "Sair"
- [x] `proxy.ts` redireciona não-autenticados para `/login`
- [x] `lib/auth/guards.ts` (`requireSession`) — autorização real por action
- [x] `/login` funcional (testado no navegador: entrar e sair funcionam)
- [x] Shell privado: `AppFrame`, `TopBar`, `BottomNav` (5 destinos + "Mais")
- [x] Stubs de todas as rotas privadas com padrão vazio/carregando/erro
- [x] `MoneyInput`, `MoneyText`, `EmptyState`/`LoadingState`/`ErrorState`
- [x] Testado manualmente: mobile 390px (bottom nav) e desktop 1440px
      (moldura centralizada de 480px)
- [x] `tests/e2e/login.spec.ts` automatizado (Playwright) — 3 testes, todos
      passando
- [x] `tests/e2e/visual.spec.ts` com baseline de screenshots 390/768/1440px
      — 9/9 testes E2E passando

## Fase 2 — Contas, categorias e lançamentos manuais

- [x] `lib/actions/accounts.ts` (list/save/remove) + CRUD de contas — com
      exclusão bloqueada se houver lançamentos
- [x] Estrutura de categorias sugerida (`lib/finance/default-categories.ts`)
      + `seedDefaultCategories()`, inserida sob ação do usuário na tela
      `/categorias` (configuração, não dado fictício)
- [x] Formas de pagamento padrão (`isSystem=true`) + customizadas —
      `lib/actions/payment-methods.ts` + `seedSystemPaymentMethods()`
- [x] `lib/actions/transactions.ts` (receita/despesa/ajuste, CRUD completo)
- [x] `lib/finance/transfers.ts` (grupo de 2 pontas, transação de banco,
      create/update/remove atômicos)
- [x] `/lancamentos`: botões Receita/Despesa distintos + "Outros"
      (Transferência/Ajuste via sheet)
- [x] `accounts.currentBalanceCents` derivado das transações
      (`lib/finance/balances.ts`)
- [x] `lib/finance/dates.ts` (conversão UTC ↔ fuso do usuário)
- [x] `lib/finance/money.ts` (`parseBrlToCents`/`formatCentsToBRL`)
- [x] Testado manualmente de ponta a ponta no navegador: criar 2 contas,
      registrar receita/despesa/transferência/ajuste, editar, remover
      (inclusive removendo as 2 pontas de uma transferência atomicamente),
      excluir conta — todos os saldos derivados conferem
- [x] `tests/unit/money.test.ts`, `tests/unit/dates.test.ts` — 15/15 testes
- [x] `pnpm run typecheck && pnpm run lint && pnpm run build` verdes
- [ ] Sugestão de categoria (`category_rules`) — adiado; não bloqueia o
      CRUD principal, mas ainda não implementado
- [ ] Testes de integração automatizados (`accounts-crud`, `transfer-group`)
      — verificado manualmente no navegador, mas ainda sem suíte Vitest
      contra um banco de teste
- [ ] E2E automatizado (`accounts.spec.ts`, `receita-despesa.spec.ts`,
      `outros.spec.ts`) — verificado manualmente, ainda sem specs Playwright

### Bugs encontrados e corrigidos durante a Fase 2

- Base UI `<Select.Value>` não resolve o rótulo automaticamente a partir do
  `value` (diferente do Radix) — precisa de `children` como função
  `(value) => label`. Corrigido em todos os selects do app.
- Diálogos (Dialog/Sheet) sempre montados com `open={bool}` podem "grudar"
  visíveis mesmo depois de fechados, se outro diálogo abrir logo em
  seguida. Corrigido renderizando cada diálogo condicionalmente
  (`{condição && <Dialog open ... />}`) em vez de sempre montado.

## Fase 3 — Cartões e faturas

- [ ] `lib/actions/credit-cards.ts` + CRUD de cartões
- [ ] `lib/finance/statements.ts` (ciclo, fechamento, pagamento, limite
      derivado)
- [ ] `/cartoes` (lista + detalhe com fechar/pagar fatura)
- [ ] Despesa com forma "crédito" vinculada a cartão/fatura
- [ ] Testes: `statement-cycle`, `credit-card-statement`
- [ ] E2E: `cartoes.spec.ts` (confirma que pagamento nunca duplica despesa)

## Fase 4 — Dashboard, relatórios e orçamento

- [ ] `lib/finance/aggregation.ts` (exclusão única de transferência/pagamento
      de fatura)
- [ ] `lib/actions/dashboard.ts` (`dashboard.month`)
- [ ] `lib/actions/reports.ts` (`reports.query` com filtros)
- [ ] `lib/finance/budgets.ts` (rollup pai/filho)
- [ ] Gráficos com alternativa textual/tabular acessível
- [ ] Testes: `budget-rollup`, integração de exclusão de transferência/fatura
- [ ] E2E: `relatorios.spec.ts`, `orcamentos.spec.ts`

## Fase 5 — Refinamento e qualidade

- [ ] Varredura completa Vitest + Playwright
- [ ] Testes de segurança: sem sessão, id de outro usuário, payload inválido
- [ ] Auditoria de acessibilidade (alt textual de gráfico, toque ≥44px,
      `prefers-reduced-motion`)
- [ ] `EXPLAIN QUERY PLAN` nas queries `(userId, occurredAt)`
- [ ] Screenshots mobile/desktop + lista final de limitações conhecidas
- [ ] Gate final: `lint && typecheck && test:unit && test:integration &&
      build && test:e2e` verdes

## Pendências que dependem do usuário

- [x] Criar banco no Turso e preencher `.env.local` — feito
- [x] Preencher `user.txt` e rodar `pnpm run create-user` — feito
- [ ] Escolher o provedor de storage de objetos — **N/A**, removido do
      escopo (sem importação de arquivos)
