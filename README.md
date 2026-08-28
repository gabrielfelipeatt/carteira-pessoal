# Carteira Pessoal

Carteira financeira pessoal privada, de usuário único, com experiência de
aplicativo móvel. Ver [`.claude/plans` / PRD] para a especificação completa.

Stack: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui,
Drizzle ORM + Turso (libSQL), Better Auth (e-mail/senha, usuário único), Zod,
Vitest + Playwright.

Todos os lançamentos são preenchidos manualmente — o app não recebe upload de
arquivos/extratos.

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

## Limitações conhecidas

- Sem importação de extratos, Open Finance, recorrências, parcelamento de
  cartão, metas financeiras, exportação CSV/OFX, notificações de vencimento
  ou tema escuro (fora do escopo da v1 — ver `todo.md`).
- Usuário único: o app não foi desenhado para múltiplas contas/pessoas na
  mesma carteira.
