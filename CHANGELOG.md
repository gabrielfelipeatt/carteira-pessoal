# Changelog

Todas as alterações relevantes deste projeto são documentadas neste arquivo.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e o
versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [0.8.0] - 2026-08-31

### Adicionado
- Os cards "Entradas" e "Saídas" do dashboard agora são links pra
  `/relatorios`, já filtrados por tipo (receita/despesa) e pelo mês
  exibido — dá pra clicar e ver a tabela detalhada e os gráficos por trás
  do valor. `/relatorios` passa a ler filtros iniciais pela URL
  (`tipo`, `de`, `ate`), então também é deep-linkável.

## [0.7.1] - 2026-08-31

### Alterado
- Favicon próprio (`app/icon.svg`) no lugar do ícone padrão do Next.js —
  uma carteira nas mesmas cores já usadas no app (azul cobalto, marfim,
  âmbar). Convenção nativa do App Router, sem precisar mexer em
  `layout.tsx`; `favicon.ico` padrão mantido como reserva para navegadores
  muito antigos.

## [0.7.0] - 2026-08-31

### Adicionado
- Metas financeiras (`/metas`, no menu "Mais"): objetivo de economia com
  nome, valor-alvo, mês-alvo opcional e cor própria. Progresso nunca é um
  contador armazenado — é sempre a soma assinada dos aportes/resgates
  vinculados (`lib/actions/goals.ts`). Aporte/resgate é uma transação de
  uma linha só (`type:'transfer'`, sem `transferGroupId`), mesmo padrão
  já usado no pagamento de fatura — por isso nunca conta como
  receita/despesa nos relatórios/orçamentos. Resgate nunca pode exceder o
  progresso atual da meta. Remover uma meta é bloqueado se ela já tiver
  histórico (mesma regra de despesas fixas); pausar continua possível.
  Um aporte/resgate aparece no histórico de lançamentos com ícone
  próprio e só pode ser removido (não editado) — mesmo tratamento que
  pagamento de fatura já recebe.
- `lib/finance/goals.ts` (novo, lógica pura): `computeGoalStatus` — status
  ("no prazo"/"atrasada"/"concluída") sempre derivado na leitura, nunca
  armazenado, mesmo princípio do status "vencida" de fatura.

## [0.6.0] - 2026-08-31

### Adicionado
- Parcelamento de compra no cartão de crédito: ao marcar "Parcelar
  compra" numa despesa no cartão, gera N lançamentos independentes — um
  por fatura futura (criada sob demanda, como já acontecia para uma
  compra normal), cada um com a fração exata do valor (a sobra da divisão
  vai pra última parcela) e o mesmo dia do mês da compra original,
  clampado corretamente em mês curto. Exibido como "Parcela N/total" no
  histórico de lançamentos. Cada parcela é removida individualmente (sem
  afetar as outras); parcela em fatura já fechada não pode ser removida,
  mesma regra que já existia para compra avulsa. Só disponível pra
  lançamento novo — uma edição nunca divide retroativamente.
- `lib/finance/installments.ts` (novo, lógica pura): `splitIntoInstallments`
  e `resolveInstallmentDates` — este último compõe as funções já
  existentes `nextYearMonth`/`resolveOccurrenceDateString` em vez de
  somar meses via aritmética de `Date`, que quebra em mês curto.

## [0.5.0] - 2026-08-31

### Adicionado
- Avisos no dashboard (Início): faturas a vencer/vencidas (próximos 5
  dias, ou já vencidas) e lançamentos fixos pendentes, combinados num
  único feed ordenado por urgência (`lib/finance/reminders.ts`). Sem
  tabela nova nem cron — reaproveita `computeEffectiveStatus`/
  `computeStatementOwedCents` (faturas) e `listPendingFixedExpenseOccurrences`
  (lançamentos fixos), ambos já existentes.
- Removido o aviso duplicado de despesas fixas pendentes que ficava em
  `/lancamentos` — o dashboard passa a ser o único lugar de avisos; a
  seção "Pendentes" dentro de `/despesas-fixas` continua normalmente (ali
  é ação, não aviso).

### Corrigido
- Uma fatura **aberta** com vencimento já passado aparecia nos avisos
  como "vence hoje" em vez de vencida — `computeEffectiveStatus` só marca
  "vencida" para faturas já fechadas, nunca abertas. O rótulo do aviso
  agora se baseia direto em quantos dias já passaram do vencimento, não
  no status armazenado.

## [0.4.0] - 2026-08-31

### Adicionado
- Receita fixa recorrente: `/despesas-fixas` (renomeado para "Lançamentos
  fixos" na interface) agora aceita tanto despesas quanto receitas
  (salário, aluguel recebido...). Generaliza a tabela `fixedExpenses`
  (adiciona coluna `type`) em vez de duplicar o mecanismo — a lógica de
  cálculo de competências pendentes já era agnóstica de tipo. A
  confirmação de uma ocorrência de receita abre o formulário de receita
  pré-preenchido, mesmo padrão já usado para despesa.

## [0.3.0] - 2026-08-28

### Adicionado
- Despesas fixas recorrentes (`/despesas-fixas`, acessível pelo menu
  "Mais"): cadastre uma conta recorrente (luz, água, internet...) uma
  única vez — descrição, categoria, forma de pagamento, valor sugerido,
  dia do mês, mês inicial e, opcionalmente, mês final — e confirme o
  lançamento de cada mês manualmente, sem digitar tudo de novo. Nenhum
  lançamento é criado sozinho: cada competência pendente é calculada em
  tempo real (sem cron/job em background) e exige clique explícito em
  "Confirmar" (abre o formulário de despesa pré-preenchido e editável) ou
  "Dispensar" (pula aquele mês sem gerar lançamento nem desativar o
  cadastro). `/lancamentos` mostra um aviso quando há despesas fixas
  pendentes no mês.
- Suporta despesa fixa paga tanto por conta (débito/pix/boleto/etc.)
  quanto por cartão de crédito — nesse caso reaproveita a mesma resolução
  de fatura/conta de controle das despesas manuais, sem duplicar lógica.

## [0.2.1] - 2026-08-28

### Corrigido
- Fatura com pagamento parcial mostrava o valor total original como número
  principal (ex.: R$ 256,01), mesmo já tendo sido pago parte dele — dava a
  impressão de que o pagamento não tinha efeito. Agora o número principal do
  cabeçalho é o saldo restante, com o total original como legenda ("de R$
  256,01") só quando já houve algum pagamento.
- O pagamento de fatura não aparecia no histórico de lançamentos do cartão
  (`listStatementTransactions` filtrava só `type = 'expense'`, excluindo o
  `transfer` do pagamento). Agora compras e pagamentos aparecem juntos,
  visualmente distintos.

## [0.2.0] - 2026-08-28

### Alterado
- Pagamento de fatura de cartão (total ou parcial) agora pode ser registrado
  mesmo com a fatura ainda **aberta** (adiantamento), não só depois de
  fechada. O valor devido de uma fatura aberta é calculado em tempo real a
  partir das compras já lançadas no ciclo (`computeStatementOwedCents`), já
  que `totalCents` só é apurado no fechamento explícito.
- `closeStatement` agora fecha a fatura diretamente como "Paga" quando um
  adiantamento feito enquanto ela estava aberta já cobre o total apurado no
  fechamento, em vez de deixá-la como "Fechada" aguardando mais uma ação.
- `computeAvailableCreditCents` corrigido: adiantamentos pagos numa fatura
  aberta agora aumentam corretamente o limite disponível (antes eram
  somados como se fossem gasto novo, reduzindo o limite por engano).
- `components/finance/statement-panel.tsx`: os botões "Fechar fatura" e
  "Pagar fatura" agora aparecem juntos para uma fatura aberta com saldo
  devedor, em vez de mutuamente exclusivos.
