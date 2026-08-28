import { listCategories } from "@/lib/actions/categories";
import { listPaymentMethods } from "@/lib/actions/payment-methods";
import { CategoriasView } from "./categorias-view";

export default async function CategoriasPage() {
  const [categories, paymentMethods] = await Promise.all([
    listCategories(),
    listPaymentMethods(),
  ]);

  return <CategoriasView categories={categories} paymentMethods={paymentMethods} />;
}
