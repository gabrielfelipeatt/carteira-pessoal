"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { categories as categoriesTable, CategoryKind } from "@/db/schema";

type Category = typeof categoriesTable.$inferSelect;

export function CategorySelect({
  id,
  label,
  kind,
  categories,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  kind: CategoryKind;
  categories: Category[];
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
}) {
  const roots = categories.filter(
    (category) => category.kind === kind && !category.parentId && category.isActive,
  );
  const childrenByParent = new Map<string, Category[]>();
  for (const category of categories) {
    if (category.kind !== kind || !category.parentId || !category.isActive) continue;
    const list = childrenByParent.get(category.parentId) ?? [];
    list.push(category);
    childrenByParent.set(category.parentId, list);
  }

  const labelById = new Map<string, string>();
  for (const root of roots) {
    const children = childrenByParent.get(root.id) ?? [];
    labelById.set(root.id, children.length > 0 ? `${root.name} (geral)` : root.name);
    for (const child of children) {
      labelById.set(child.id, child.name);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(String(next))}>
        <SelectTrigger id={id} className="h-11 w-full" aria-invalid={!!error}>
          <SelectValue>
            {(selected: string | null) =>
              selected ? (labelById.get(selected) ?? selected) : "Selecione uma categoria"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {roots.map((root) => {
            const children = childrenByParent.get(root.id) ?? [];
            if (children.length === 0) {
              return (
                <SelectItem key={root.id} value={root.id}>
                  {root.name}
                </SelectItem>
              );
            }
            return (
              <SelectGroup key={root.id}>
                <SelectLabel>{root.name}</SelectLabel>
                <SelectItem value={root.id}>{root.name} (geral)</SelectItem>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id} className="pl-6">
                    {child.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
