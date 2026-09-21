import { listAccounts } from "@/lib/actions/accounts";
import { listCreditCards } from "@/lib/actions/credit-cards";
import { ImportarView } from "./importar-view";

export default async function ImportarPage() {
  const [accounts, creditCards] = await Promise.all([listAccounts(), listCreditCards()]);

  return <ImportarView accounts={accounts} creditCards={creditCards} />;
}
