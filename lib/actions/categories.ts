"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { categories, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth/guards";
import {
  categoryFormSchema,
  type CategoryFormInput,
} from "@/lib/validation/categories";
import { defaultCategoryGroups } from "@/lib/finance/default-categories";

export async function listCategories() {
  const userId = await requireUserId();
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId));
  return rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

async function assertNoCycle(
  userId: string,
  categoryId: string,
  parentId: string,
) {
  let current: string | null = parentId;
  const visited = new Set<string>();

  while (current) {
    if (current === categoryId) {
      throw new Error("Uma categoria não pode ser subcategoria de si mesma.");
    }
    if (visited.has(current)) break; // proteção extra contra ciclo pré-existente
    visited.add(current);

    const [parent] = await db
      .select({ parentId: categories.parentId })
      .from(categories)
      .where(and(eq(categories.id, current), eq(categories.userId, userId)));

    current = parent?.parentId ?? null;
  }
}

export async function saveCategory(input: CategoryFormInput) {
  const userId = await requireUserId();
  const parsed = categoryFormSchema.parse(input);

  if (parsed.parentId) {
    if (parsed.id && parsed.parentId === parsed.id) {
      throw new Error("Uma categoria não pode ser sua própria categoria-pai.");
    }
    if (parsed.id) {
      await assertNoCycle(userId, parsed.id, parsed.parentId);
    }
    const [parent] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, parsed.parentId), eq(categories.userId, userId)),
      );
    if (!parent) {
      throw new Error("Categoria-pai não encontrada.");
    }
  }

  const values = {
    userId,
    name: parsed.name,
    kind: parsed.kind,
    parentId: parsed.parentId || null,
    color: parsed.color,
    icon: parsed.icon || null,
    isActive: parsed.isActive,
    rollupToParentBudget: parsed.rollupToParentBudget,
  };

  if (parsed.id) {
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, parsed.id), eq(categories.userId, userId)));
    if (!existing) {
      throw new Error("Categoria não encontrada.");
    }
    await db
      .update(categories)
      .set(values)
      .where(and(eq(categories.id, parsed.id), eq(categories.userId, userId)));
  } else {
    await db.insert(categories).values(values);
  }

  revalidatePath("/categorias");
  revalidatePath("/lancamentos");
}

export async function removeCategory(categoryId: string) {
  const userId = await requireUserId();

  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  if (!existing) {
    throw new Error("Categoria não encontrada.");
  }

  const [child] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, categoryId))
    .limit(1);
  if (child) {
    throw new Error(
      "Esta categoria tem subcategorias. Remova ou mova as subcategorias antes.",
    );
  }

  const [linkedTransaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.categoryId, categoryId))
    .limit(1);
  if (linkedTransaction) {
    throw new Error(
      "Esta categoria tem lançamentos e não pode ser removida. Você pode desativá-la em vez disso.",
    );
  }

  await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

  revalidatePath("/categorias");
  revalidatePath("/lancamentos");
}

/** Insere a estrutura sugerida do PRD para o usuário — só configuração, nunca dado financeiro. */
export async function seedDefaultCategories() {
  const userId = await requireUserId();

  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("Você já tem categorias cadastradas.");
  }

  for (const group of defaultCategoryGroups) {
    const [parent] = await db
      .insert(categories)
      .values({
        userId,
        name: group.name,
        kind: group.kind,
        color: group.color,
        isActive: true,
        rollupToParentBudget: true,
      })
      .returning({ id: categories.id });

    if (group.subcategories.length > 0) {
      await db.insert(categories).values(
        group.subcategories.map((name) => ({
          userId,
          parentId: parent.id,
          name,
          kind: group.kind,
          color: group.color,
          isActive: true,
          rollupToParentBudget: true,
        })),
      );
    }
  }

  revalidatePath("/categorias");
  revalidatePath("/lancamentos");
}
