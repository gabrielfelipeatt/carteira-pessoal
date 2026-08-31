import { listGoals } from "@/lib/actions/goals";
import { listAccounts } from "@/lib/actions/accounts";
import { MetasView } from "./metas-view";

export default async function MetasPage() {
  const [goals, accounts] = await Promise.all([listGoals(), listAccounts()]);

  return <MetasView goals={goals} accounts={accounts} />;
}
