# Carteira Pessoal

Carteira financeira pessoal privada, de usuário único, com experiência de
aplicativo móvel. Ver [`.claude/plans` / PRD] para a especificação completa.

Stack: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui,
Drizzle ORM + Turso (libSQL), Better Auth (e-mail/senha, usuário único), Zod,
Vitest + Playwright.

Todos os lançamentos são preenchidos manualmente — o app não recebe upload de
arquivos/extratos.

## Funcionalidades implementadas

- **Contas**: corrente, poupança, dinheiro, investimento, outra — saldo
  sempre derivado das transações (nunca um contador solto)
- **Lançamentos**: receita, despesa, transferência (grupo atômico de 2
  pontas) e ajuste de saldo, com edição e remoção
- **Cartões de crédito**: ciclo de fatura calculado a partir do dia de
  fechamento/vencimento, fechamento explícito, pagamento total/parcial,
  limite disponível sempre derivado — compra no crédito nunca afeta uma
  conta real (usa uma conta de controle interna por cartão), só o pagamento
  da fatura afeta o saldo real. Compra parcelada gera N lançamentos
  independentes, um por fatura futura (criada sob demanda), com o dia do
  mês original preservado e clampado em mês curto — nunca uma linha só
  com o valor total
- **Categorias e formas de pagamento**: estrutura sugerida do PRD ou
  personalizada, com subcategorias
- **Dashboard mensal**: saldo consolidado, entradas/saídas, resultado,
  comparação com o mês anterior, gastos por categoria
- **Relatórios**: filtros por período/conta/categoria/tipo/forma de
  pagamento, gráficos de gastos por categoria, receitas/despesas no tempo e
  evolução do saldo — todos com alternativa em tabela acessível
- **Orçamentos**: limite mensal por categoria, com rollup automático de
  subcategorias na categoria-pai e status normal/atenção/acima do limite
- **Lançamentos fixos recorrentes (despesas e receitas)**: cadastro único
  (conta de luz, água, internet, salário...) com dia do mês e data final
  opcional; cada competência pendente é calculada em tempo real (sem cron)
  e só vira lançamento com confirmação explícita — também dá para
  dispensar um mês específico sem afetar os seguintes
- **Avisos no dashboard**: faturas a vencer/vencidas (próximos 5 dias) e
  lançamentos fixos pendentes, num só feed ordenado por urgência —
  calculado em tempo real a partir de dados já existentes (sem tabela ou
  cron novos), sem notificação push/e-mail (fora do escopo)
- **Metas financeiras**: objetivo de economia com valor-alvo e mês-alvo
  opcional; progresso sempre derivado da soma de aportes/resgates (nunca
  um contador solto) — aporte/resgate é sempre uma transferência
  (`type:'transfer'`), nunca conta como receita/despesa nos relatórios,
  mesma regra que já protege pagamento de fatura

## Pré-requisitos

- Node.js 22+
- pnpm (`npm install -g pnpm` se ainda não tiver)
- Uma conta e um banco no [Turso](https://turso.tech) (plano gratuito atende)

## Configuração inicial

1. **Instale as dependências**

   ```bash
   pnpm install
   ```

2. **Crie o banco no Turso** (se ainda não tiver um)

   ```bash
   turso db create carteira-pessoal
   turso db show carteira-pessoal --url
   turso db tokens create carteira-pessoal
   ```

3. **Configure o ambiente**

   Copie `.env.example` para `.env.local` e preencha `DATABASE_URL` e
   `TURSO_AUTH_TOKEN` com os valores do passo anterior. Gere um
   `BETTER_AUTH_SECRET` aleatório:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Aplique as migrations**

   ```bash
   pnpm run db:migrate
   ```

5. **Crie sua conta de usuário único**

   Crie um arquivo `user.txt` na raiz do projeto (nunca commitado — está no
   `.gitignore`) com este formato:

   ```
   login: seu@email.com
   senha: sua-senha
   nome: Seu Nome
   ```

   Depois rode:

   ```bash
   pnpm run create-user
   ```

   Esse script é idempotente — rodá-lo de novo com um usuário já existente
   não faz nada. Não há tela de cadastro público: essa é a única forma de
   criar a conta.

6. **Suba o servidor de desenvolvimento**

   ```bash
   pnpm run dev
   ```

   Acesse http://localhost:3000 e entre com as credenciais do `user.txt`.

## Scripts

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm lint` | ESLint |
| `pnpm run typecheck` | TypeScript (`tsc --noEmit`) |
| `pnpm run test:unit` | Testes unitários (Vitest) |
| `pnpm run test:integration` | Testes de integração (Vitest) |
| `pnpm run test:e2e` | Testes E2E (Playwright, 390/768/1440px) |
| `pnpm run db:generate` | Gera uma nova migration a partir de `db/schema.ts` |
| `pnpm run db:migrate` | Aplica migrations pendentes no Turso |
| `pnpm run db:studio` | Abre o Drizzle Studio |
| `pnpm run create-user` | Cria a única conta a partir de `user.txt` |

## Decisões de arquitetura

- **Banco**: Turso (libSQL/SQLite), sempre remoto — mesmo em desenvolvimento.
  Dinheiro é armazenado em centavos inteiros (`integer`), nunca `float`.
  Datas/horários de negócio são armazenados em epoch ms UTC.
- **Autenticação**: Better Auth, e-mail/senha, sem OAuth e sem cadastro
  público. A tabela `user` do Better Auth é a única fonte de verdade sobre o
  usuário — não existe uma tabela `users` própria da aplicação.
- **Autorização**: `proxy.ts` (antigo `middleware.ts`) só faz uma checagem
  rápida de cookie para redirecionar a UI. A autorização de verdade é feita
  em `lib/auth/guards.ts` (`requireSession()`), chamada por toda
  server action/query antes de tocar no banco.
- **Sem importação de arquivos**: por decisão do usuário, não há upload de
  extratos (CSV/PDF) nem storage de objetos — todo lançamento é manual.
- **Regra de não duplicidade**: pagar uma fatura de cartão é sempre
  `type: 'transfer'`, nunca uma nova despesa — ver `lib/finance/statements.ts`.
  Transferências entre contas próprias nunca contam como entrada/saída nos
  relatórios/dashboard — ver `lib/finance/aggregation.ts`.

## Segurança e privacidade

- Toda leitura/escrita de dados financeiros passa por `requireSession()` /
  `requireUserId()` (`lib/auth/guards.ts`) e filtra explicitamente por
  `userId` no banco — auditado manualmente em todas as 43 server actions do
  projeto (`lib/actions/*.ts`), sem exceção.
- `proxy.ts` só faz uma checagem rápida de cookie para redirecionar a UI de
  visitantes anônimos (confirmado por `tests/e2e/login.spec.ts`); a
  autorização real está na camada de dados, não no roteamento.
- Mensagens de erro voltadas ao usuário são sempre textos curados em
  português (ex: "Conta não encontrada.") — nunca stack trace ou erro cru do
  banco.
- Índices conferidos com `EXPLAIN QUERY PLAN` nos caminhos mais usados
  (`transactions` por `user_id`+`occurred_at`, `accounts`/`categories` por
  `user_id`, faturas por cartão+mês, orçamentos por usuário+categoria+mês) —
  todos usam índice, nenhum table scan.
- Alvos de toque de ações primárias (editar/remover lançamento, navegar
  mês) em 44×44px conforme o PRD; `prefers-reduced-motion` respeitado
  globalmente (`app/globals.css`).

## Limitações conhecidas

- Sem importação de extratos, Open Finance, exportação CSV/OFX ou tema
  escuro (fora do escopo da v1 — ver `todo.md`). Os avisos
  de vencimento existem dentro do app (ver acima), mas só como push/e-mail
  é que continuam fora de escopo.
- Usuário único: o app não foi desenhado para múltiplas contas/pessoas na
  mesma carteira. Por isso, o isolamento por usuário foi verificado por
  auditoria de código (todo `select`/`update`/`delete` filtra por `userId`)
  em vez de um teste automatizado com dois usuários reais.
- Testes de integração automatizados (Vitest contra um banco de teste) e
  specs Playwright de `accounts`/`receita-despesa`/`outros`/`cartoes`/
  `relatorios`/`orcamentos` ainda não existem — a cobertura desses fluxos
  hoje é: testes unitários das regras de negócio puras (dinheiro, datas,
  ciclo de fatura, rollup de orçamento, despesas fixas, lembretes,
  parcelamento, metas — 60 testes) + verificação manual extensiva no
  navegador, documentada fase a
  fase em `todo.md`.
- `pnpm run test:e2e` roda com 1 worker (não paralelo): o Turso é
  single-writer e logins simultâneos de vários workers colidem na escrita
  da sessão — nunca acontece no uso real, de usuário único.
