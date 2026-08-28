import { listAccounts } from "@/lib/actions/accounts";
import { listCategories } from "@/lib/actions/categories";
import { listPaymentMethods } from "@/lib/actions/payment-methods";
import { currentYearMonth, monthRange, utcDateToLocalDateString } from "@/lib/finance/dates";
import { RelatoriosView } from "./relatorios-view";

export default async function RelatoriosPage() {
  const [accounts, categories, paymentMethods] = await Promise.all([
    listAccounts(),
    listCategories(),
    listPaymentMethods(),
  ]);

  const { from, to } = monthRange(currentYearMonth());

  return (
    <RelatoriosView
      initialFilters={{
        from: utcDateToLocalDateString(from),
        to: utcDateToLocalDateString(to),
      }}
      accounts={accounts}
      categories={categories}
      paymentMethods={paymentMethods}
    />
  );
}
