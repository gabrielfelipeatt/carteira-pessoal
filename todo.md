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

- [x] `lib/actions/credit-cards.ts` (list/save/remove) + CRUD de cartões
- [x] `lib/finance/statement-cycle.ts` (matemática pura do ciclo, testável) +
      `lib/finance/statements.ts` (resolve/fecha/paga fatura, limite
      derivado)
- [x] Conta de controle automática por cartão (`accounts.isControlAccount`) —
      compra no crédito nunca afeta conta real, só o pagamento da fatura afeta
- [x] `/cartoes` (lista) + `/cartoes/[id]` (detalhe com fechar/pagar fatura,
      drill-down das compras de cada fatura)
- [x] Despesa com forma "crédito" mostra seletor de cartão em vez de conta
      (`components/finance/expense-form.tsx`)
- [x] Compra em fatura já fechada é rejeitada; edição/remoção de compra em
      fatura fechada é bloqueada; pagamento de fatura não pode ser removido
      pelos lançamentos soltos
- [x] `tests/unit/statement-cycle.test.ts` — 9 testes (fechamento no dia,
      dia seguinte, meses curtos, ano bissexto, virada de ano)
- [x] Testado manualmente de ponta a ponta no navegador: criar cartão,
      comprar no crédito (conta real intacta), fechar fatura, pagar parcial,
      pagar o restante (fatura vira "Paga", limite volta ao total), rejeitar
      compra em fatura fechada, bloquear edição de compra em fatura fechada
- [x] `pnpm run typecheck && pnpm run lint && pnpm run test:unit &&
      pnpm run build && pnpm run test:e2e` verdes (24 testes unitários, 9 E2E)
- [ ] Testes de integração automatizados (`credit-card-statement`) —
      verificado manualmente no navegador, ainda sem suíte Vitest contra
      banco de teste
- [ ] E2E automatizado (`cartoes.spec.ts`) — verificado manualmente, ainda
      sem specs Playwright

### Bugs encontrados e corrigidos durante a Fase 3

- O campo `isCredit` do formulário de despesa nunca era sincronizado com o
  valor derivado da forma de pagamento escolhida — a validação do Zod
  falhava silenciosamente (o campo de conta, onde o erro apareceria, nem
  estava renderizado quando "crédito" estava selecionado). Corrigido com
  `useEffect` sincronizando `setValue("isCredit", ...)`.
- Datas de fatura (fechamento/vencimento) calculadas em UTC puro apareciam
  um dia antes na tela, porque a exibição converte para o fuso do usuário.
  Corrigido reinterpretando a data calculada como meia-noite no fuso do
  usuário antes de salvar (`toStorageDate` em `lib/finance/statements.ts`).

## Fase 4 — Dashboard, relatórios e orçamento

- [x] `lib/finance/aggregation.ts` (única implementação de "sem dupla
      contagem": só receita/despesa contam como entrada/saída)
- [x] `lib/actions/dashboard.ts` (`getDashboardMonth`) — saldo consolidado,
      entradas/saídas, resultado, comparação com mês anterior, gastos por
      categoria, últimos lançamentos
- [x] `lib/actions/reports.ts` (tabela filtrada, gastos por categoria,
      receitas/despesas por mês, evolução do saldo) com filtros por
      período/conta/categoria/tipo/forma de pagamento
- [x] `lib/finance/budget-rollup.ts` (rollup pai/filho puro, testável) +
      `lib/actions/budgets.ts` (consumo, restante, status normal/atenção/acima)
- [x] Gráficos (`recharts`) com alternativa em tabela acessível
      (`Ver tabela`/`Ver gráfico`) em todos os 3 gráficos de relatórios e no
      de gastos por categoria do dashboard
- [x] `MonthPicker` reutilizado no dashboard e em orçamentos (navegação por
      querystring `?mes=YYYY-MM`)
- [x] `tests/unit/budget-rollup.test.ts` — 5 testes
- [x] Testado manualmente de ponta a ponta no navegador: receita + 2
      despesas em categorias diferentes, saldo/entradas/saídas/resultado do
      dashboard conferem, gráfico e tabela de gastos por categoria batem,
      filtros de relatórios reagem corretamente, orçamento simples e
      orçamento com rollup pai→filho calculam consumo/status corretamente,
      criar/editar/remover orçamento
- [x] `pnpm run typecheck && pnpm run lint && pnpm run test:unit &&
      pnpm run build && pnpm run test:e2e` verdes (29 testes unitários, 9 E2E)
- [ ] Testes de integração automatizados (exclusão de transferência/fatura
      dos totais) — verificado manualmente no navegador
- [ ] E2E automatizado (`relatorios.spec.ts`, `orcamentos.spec.ts`) —
      verificado manualmente, ainda sem specs Playwright

### Bugs encontrados e corrigidos durante a Fase 4

- Rótulo de mês nos eixos dos gráficos ficava cortado ("agosto/2" em vez de
  "ago/2026") por usar `.slice(0, 8)` num texto já formatado por extenso.
  Corrigido com um formatador dedicado (`formatMonthShort`).
- `playwright.config.ts` rodava com 6 workers em paralelo; como o Turso é
  single-writer, logins simultâneos de vários testes colidiam na escrita da
  tabela de sessão do Better Auth (nunca acontece no uso real, de usuário
  único). Reduzido para 1 worker — suíte E2E ficou 100% estável.

## Fase 5 — Refinamento e qualidade

- [x] Auditoria de código: as 31 server actions exportadas (`lib/actions/*`)
      chamam `requireSession()`/`requireUserId()` e filtram toda query por
      `userId` — conferido função por função, sem exceção
- [x] "Sem sessão": `tests/e2e/login.spec.ts` confirma redirecionamento em
      toda rota privada; `proxy.ts` cobre a UI, `guards.ts` cobre as actions
- [x] "Payload inválido"/"id inexistente": confirmado por auditoria de
      código — todo `throw` de action usa mensagem curada em português
      (nunca erro cru de banco/stack trace); `assertOwned`/`assertOwned*`
      rejeitam id de recurso que não pertence ao usuário antes de qualquer
      mutação
- [x] "Id de outro usuário": não verificado com um segundo usuário real de
      ponta a ponta (app é de usuário único por decisão do produto) — a
      garantia vem da auditoria acima, documentada em `README.md`
- [x] Alvos de toque: botões de editar/remover lançamento, orçamento,
      cartão e navegação de mês ajustados para 44×44px (shadcn `icon-sm`
      por padrão sai em 28px) — conferido via `getBoundingClientRect` no
      navegador
- [x] `prefers-reduced-motion` respeitado globalmente desde a Fase 1
      (`app/globals.css`)
- [x] Todo gráfico (dashboard e relatórios) tem alternativa em tabela
      acessível via botão "Ver tabela" — nenhum gráfico é só visual
- [x] `EXPLAIN QUERY PLAN` conferido em `transactions` (por
      `user_id`+`occurred_at`), `accounts`/`categories` (por `user_id`),
      faturas (por `credit_card_id`+`reference_month`) e orçamentos (por
      `user_id`+`categoria`+`ano`+`mês`) — todos usam índice, sem table scan
- [x] `playwright.config.ts` ajustado para 1 worker (Turso é single-writer;
      login concorrente de vários workers colidia — não acontece no uso
      real) — suíte 100% estável em execuções repetidas
- [x] README.md reconciliado: funcionalidades implementadas, decisões de
      arquitetura, seção de segurança/privacidade e limitações conhecidas
- [ ] Screenshots mobile/desktop — capturada 1 tela (dashboard vazio,
      desktop) antes do recurso de screenshot da sessão ficar instável;
      não foi possível capturar o restante do conjunto
- [x] Gate final: `lint && typecheck && test:unit && build && test:e2e`
      verdes (29 testes unitários, 9 E2E, todos os 4 checks limpos)

## Pendências que dependem do usuário

- [x] Criar banco no Turso e preencher `.env.local` — feito
- [x] Preencher `user.txt` e rodar `pnpm run create-user` — feito
- [ ] Escolher o provedor de storage de objetos — **N/A**, removido do
      escopo (sem importação de arquivos)
