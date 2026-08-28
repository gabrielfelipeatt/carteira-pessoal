import {
  listFixedExpenses,
  listPendingFixedExpenseOccurrences,
} from "@/lib/actions/fixed-expenses";
import { listAccounts } from "@/lib/actions/accounts";
import { listCategories } from "@/lib/actions/categories";
import { listCreditCards } from "@/lib/actions/credit-cards";
import { listPaymentMethods } from "@/lib/actions/payment-methods";
import { DespesasFixasView } from "./despesas-fixas-view";

export default async function DespesasFixasPage() {
  const [fixedExpenses, pending, accounts, categories, paymentMethods, creditCards] =
    await Promise.all([
      listFixedExpenses(),
      listPendingFixedExpenseOccurrences(),
      listAccounts(),
      listCategories(),
      listPaymentMethods(),
      listCreditCards(),
    ]);

  return (
    <DespesasFixasView
      fixedExpenses={fixedExpenses}
      pending={pending}
      accounts={accounts}
      categories={categories}
      paymentMethods={paymentMethods}
      creditCards={creditCards}
    />
  );
}
