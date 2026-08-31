import { listAccounts } from "@/lib/actions/accounts";
import { listCategories } from "@/lib/actions/categories";
import { listPaymentMethods } from "@/lib/actions/payment-methods";
import { currentYearMonth, monthRange, utcDateToLocalDateString } from "@/lib/finance/dates";
import { RelatoriosView } from "./relatorios-view";

const validTypes = ["income", "expense", "transfer", "adjustment"] as const;

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; de?: string; ate?: string }>;
}) {
  const { tipo, de, ate } = await searchParams;
  const [accounts, categories, paymentMethods] = await Promise.all([
    listAccounts(),
    listCategories(),
    listPaymentMethods(),
  ]);

  const { from, to } = monthRange(currentYearMonth());
  const type = validTypes.find((t) => t === tipo);

  return (
    <RelatoriosView
      initialFilters={{
        from: de && /^\d{4}-\d{2}-\d{2}$/.test(de) ? de : utcDateToLocalDateString(from),
        to: ate && /^\d{4}-\d{2}-\d{2}$/.test(ate) ? ate : utcDateToLocalDateString(to),
        type,
      }}
      accounts={accounts}
      categories={categories}
      paymentMethods={paymentMethods}
    />
  );
}
