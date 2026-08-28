# Changelog

Todas as alterações relevantes deste projeto são documentadas neste arquivo.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e o
versionamento [SemVer](https://semver.org/lang/pt-BR/).

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
