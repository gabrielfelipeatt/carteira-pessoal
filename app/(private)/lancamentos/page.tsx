import { listAccounts } from "@/lib/actions/accounts";
import { listCategories } from "@/lib/actions/categories";
import { listPaymentMethods } from "@/lib/actions/payment-methods";
import { listCreditCards } from "@/lib/actions/credit-cards";
import { listTransactions } from "@/lib/actions/transactions";
import { listPendingFixedExpenseOccurrences } from "@/lib/actions/fixed-expenses";
import { LancamentosView } from "./lancamentos-view";

export default async function LancamentosPage() {
  const [accounts, categories, paymentMethods, creditCards, transactions, pendingFixedExpenses] =
    await Promise.all([
      listAccounts(),
      listCategories(),
      listPaymentMethods(),
      listCreditCards(),
      listTransactions(),
      listPendingFixedExpenseOccurrences(),
    ]);

  return (
    <LancamentosView
      accounts={accounts}
      categories={categories}
      paymentMethods={paymentMethods}
      creditCards={creditCards}
      transactions={transactions}
      pendingFixedExpensesCount={pendingFixedExpenses.length}
    />
  );
}
