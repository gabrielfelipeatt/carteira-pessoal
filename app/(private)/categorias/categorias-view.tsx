"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Tags, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/finance/states";
import { CategoryForm } from "@/components/finance/category-form";
import { PaymentMethodForm } from "@/components/finance/payment-method-form";
import { seedDefaultCategories } from "@/lib/actions/categories";
import { seedSystemPaymentMethods } from "@/lib/actions/payment-methods";
import type { categories as categoriesTable, paymentMethods as paymentMethodsTable } from "@/db/schema";

type Category = typeof categoriesTable.$inferSelect;
type PaymentMethod = typeof paymentMethodsTable.$inferSelect;

export function CategoriasView({
  categories,
  paymentMethods,
}: {
  categories: Category[];
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const [categoryDialog, setCategoryDialog] = useState<
    { open: false } | { open: true; category?: Category }
  >({ open: false });
  const [methodDialog, setMethodDialog] = useState<
    { open: false } | { open: true; method?: PaymentMethod }
  >({ open: false });
  const [seeding, setSeeding] = useState<"categories" | "methods" | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleSeedCategories() {
    setSeeding("categories");
    try {
      await seedDefaultCategories();
      toast.success("Estrutura sugerida criada.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar categorias.");
    } finally {
      setSeeding(null);
    }
  }

  async function handleSeedMethods() {
    setSeeding("methods");
    try {
      await seedSystemPaymentMethods();
      toast.success("Formas de pagamento padrão criadas.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar formas de pagamento.");
    } finally {
      setSeeding(null);
    }
  }

  const roots = categories.filter((category) => !category.parentId);
  const childrenByParent = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const list = childrenByParent.get(category.parentId) ?? [];
    list.push(category);
    childrenByParent.set(category.parentId, list);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Categorias
        </h1>
        <p className="text-sm text-muted-foreground">
          Organize receitas e despesas por categoria e subcategoria.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-muted-foreground">
            Categorias
          </h2>
          {categories.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => setCategoryDialog({ open: true })}
            >
              <Plus className="size-4" aria-hidden />
              Nova
            </Button>
          ) : null}
        </div>

        {categories.length === 0 ? (
          <EmptyState
            icon={<Tags className="size-8 text-muted-foreground" aria-hidden />}
            title="Nenhuma categoria criada"
            description="Use a estrutura sugerida ou crie suas próprias categorias e subcategorias."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  className="h-11"
                  disabled={seeding === "categories"}
                  onClick={handleSeedCategories}
                >
                  {seeding === "categories" ? "Criando…" : "Usar estrutura sugerida"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11"
                  onClick={() => setCategoryDialog({ open: true })}
                >
                  Criar categoria
                </Button>
              </div>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {roots.map((root) => (
              <li key={root.id}>
                <button
                  type="button"
                  onClick={() => setCategoryDialog({ open: true, category: root })}
                  className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: root.color }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {root.name}
                    {!root.isActive ? (
                      <span className="ml-2 text-xs text-muted-foreground">(inativa)</span>
                    ) : null}
                  </span>
                </button>
                {(childrenByParent.get(root.id) ?? []).map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setCategoryDialog({ open: true, category: child })}
                    className="flex min-h-[48px] w-full items-center gap-3 border-t border-border/60 bg-muted/30 py-2.5 pr-4 pl-9 text-left hover:bg-accent"
                  >
                    <span className="flex-1 truncate text-sm text-foreground">
                      {child.name}
                      {!child.isActive ? (
                        <span className="ml-2 text-xs text-muted-foreground">(inativa)</span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-muted-foreground">
            Formas de pagamento
          </h2>
          {paymentMethods.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => setMethodDialog({ open: true })}
            >
              <Plus className="size-4" aria-hidden />
              Nova
            </Button>
          ) : null}
        </div>

        {paymentMethods.length === 0 ? (
          <EmptyState
            icon={<Wallet className="size-8 text-muted-foreground" aria-hidden />}
            title="Nenhuma forma de pagamento"
            description="Pix, boleto, dinheiro, débito, crédito, transferência ou um meio personalizado."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  className="h-11"
                  disabled={seeding === "methods"}
                  onClick={handleSeedMethods}
                >
                  {seeding === "methods" ? "Criando…" : "Usar padrões"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11"
                  onClick={() => setMethodDialog({ open: true })}
                >
                  Criar forma personalizada
                </Button>
              </div>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {paymentMethods.map((method) => (
              <li key={method.id}>
                <button
                  type="button"
                  onClick={() => setMethodDialog({ open: true, method })}
                  className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent"
                >
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {method.name}
                    {!method.isActive ? (
                      <span className="ml-2 text-xs text-muted-foreground">(pausada)</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {categoryDialog.open ? (
        <CategoryForm
          open
          category={categoryDialog.category}
          parentOptions={categories}
          onOpenChange={(open) => !open && setCategoryDialog({ open: false })}
          onSaved={refresh}
        />
      ) : null}

      {methodDialog.open ? (
        <PaymentMethodForm
          open
          paymentMethod={methodDialog.method}
          onOpenChange={(open) => !open && setMethodDialog({ open: false })}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}
