import { listAccounts } from "@/lib/actions/accounts";
import { listCategories } from "@/lib/actions/categories";
import { listPaymentMethods } from "@/lib/actions/payment-methods";
import { listCreditCards } from "@/lib/actions/credit-cards";
import { listTransactions } from "@/lib/actions/transactions";
import { LancamentosView } from "./lancamentos-view";

export default async function LancamentosPage() {
  const [accounts, categories, paymentMethods, creditCards, transactions] = await Promise.all([
    listAccounts(),
    listCategories(),
    listPaymentMethods(),
    listCreditCards(),
    listTransactions(),
  ]);

  return (
    <LancamentosView
      accounts={accounts}
      categories={categories}
      paymentMethods={paymentMethods}
      creditCards={creditCards}
      transactions={transactions}
    />
  );
}
