import { notFound } from "next/navigation";
import { getCreditCard } from "@/lib/actions/credit-cards";
import { listStatementsForCard } from "@/lib/actions/statements";
import { listAccounts } from "@/lib/actions/accounts";
import { CardDetailView } from "./card-detail-view";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await getCreditCard(id);
  if (!card) {
    notFound();
  }

  const [statements, accounts] = await Promise.all([
    listStatementsForCard(id),
    listAccounts(),
  ]);

  return <CardDetailView card={card} statements={statements} accounts={accounts} />;
}
