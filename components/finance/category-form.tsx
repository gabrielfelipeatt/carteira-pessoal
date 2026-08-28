"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveCategory } from "@/lib/actions/categories";
import {
  categoryFormSchema,
  categoryKindOptions,
  type CategoryFormInput,
} from "@/lib/validation/categories";
import { accountColorOptions } from "@/lib/validation/accounts";
import { cn } from "@/lib/utils";
import type { categories as categoriesTable } from "@/db/schema";

type Category = typeof categoriesTable.$inferSelect;

export function CategoryForm({
  open,
  onOpenChange,
  category,
  parentOptions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
  parentOptions: Category[];
  onSaved?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category
      ? {
          id: category.id,
          name: category.name,
          kind: category.kind,
          parentId: category.parentId,
          color: category.color,
          icon: category.icon ?? "",
          isActive: category.isActive,
          rollupToParentBudget: category.rollupToParentBudget,
        }
      : {
          name: "",
          kind: "expense",
          parentId: null,
          color: accountColorOptions[0],
          icon: "",
          isActive: true,
          rollupToParentBudget: true,
        },
  });

  const kind = watch("kind");
  const eligibleParents = parentOptions.filter(
    (option) =>
      option.kind === kind && !option.parentId && option.id !== category?.id,
  );

  async function onSubmit(values: CategoryFormInput) {
    try {
      await saveCategory(values);
      toast.success(category ? "Categoria atualizada." : "Categoria criada.");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar categoria.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {category ? "Editar categoria" : "Nova categoria"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              className="h-11"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-kind">Tipo</Label>
            <Select
              value={kind}
              onValueChange={(value) => {
                setValue("kind", value as CategoryFormInput["kind"]);
                setValue("parentId", null);
              }}
            >
              <SelectTrigger id="category-kind" className="h-11 w-full">
                <SelectValue>
                  {(selected: CategoryFormInput["kind"] | null) =>
                    categoryKindOptions.find((option) => option.value === selected)
                      ?.label ?? "Selecione"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoryKindOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-parent">Categoria-pai (opcional)</Label>
            <Select
              value={watch("parentId") ?? "none"}
              onValueChange={(value) =>
                setValue("parentId", value === "none" ? null : value)
              }
            >
              <SelectTrigger id="category-parent" className="h-11 w-full">
                <SelectValue>
                  {(selected: string | null) =>
                    selected && selected !== "none"
                      ? (eligibleParents.find((option) => option.id === selected)
                          ?.name ?? "Selecione")
                      : "Nenhuma (categoria principal)"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (categoria principal)</SelectItem>
                {eligibleParents.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {accountColorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cor ${color}`}
                  aria-pressed={watch("color") === color}
                  onClick={() => setValue("color", color)}
                  className={cn(
                    "size-9 rounded-full border-2 transition-transform",
                    watch("color") === color
                      ? "scale-110 border-foreground"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <Label htmlFor="category-active" className="text-sm">
              Ativa
            </Label>
            <Switch
              id="category-active"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-11 mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando…" : "Salvar categoria"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
