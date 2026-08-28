import { listCreditCards } from "@/lib/actions/credit-cards";
import { CartoesView } from "./cartoes-view";

export default async function CartoesPage() {
  const cards = await listCreditCards();
  return <CartoesView cards={cards} />;
}
