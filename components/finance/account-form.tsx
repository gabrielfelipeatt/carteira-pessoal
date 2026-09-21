"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MoneyInput } from "@/components/finance/money-input";
import { cn } from "@/lib/utils";
import { removeAccount, saveAccount } from "@/lib/actions/accounts";
import {
  accountColorOptions,
  accountFormSchema,
  accountTypeOptions,
  type AccountFormInput,
} from "@/lib/validation/accounts";
import type { accounts as accountsTable } from "@/db/schema";

type Account = typeof accountsTable.$inferSelect;

export function AccountForm({
  open,
  onOpenChange,
  account,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
  onSaved?: () => void;
}) {
  const [colorValue, setColorValue] = useState(
    account?.color ?? accountColorOptions[0],
  );
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!account) return;
    setDeleting(true);
    try {
      const result = await removeAccount(account.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Conta excluída.");
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir conta.");
    } finally {
      setDeleting(false);
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormInput>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: account
      ? {
          id: account.id,
          name: account.name,
          institution: account.institution ?? "",
          type: account.type,
          lastDigits: account.lastDigits ?? "",
          initialBalance: (account.initialBalanceCents / 100)
            .toFixed(2)
            .replace(".", ","),
          color: account.color,
          isActive: account.isActive,
        }
      : {
          name: "",
          institution: "",
          type: "corrente",
          lastDigits: "",
          initialBalance: "0,00",
          color: accountColorOptions[0],
          isActive: true,
        },
  });

  async function onSubmit(values: AccountFormInput) {
    try {
      await saveAccount({ ...values, color: colorValue });
      toast.success(account ? "Conta atualizada." : "Conta criada.");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar conta.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {account ? "Editar conta" : "Nova conta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-name">Nome</Label>
            <Input
              id="account-name"
              className="h-11"
              placeholder="Ex: Conta corrente, Carteira..."
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-institution">Instituição (opcional)</Label>
            <Input
              id="account-institution"
              className="h-11"
              placeholder="Ex: Nubank, Itaú..."
              {...register("institution")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-type">Tipo</Label>
            <Select
              value={watch("type")}
              onValueChange={(value) =>
                setValue("type", value as AccountFormInput["type"])
              }
            >
              <SelectTrigger id="account-type" className="h-11 w-full">
                <SelectValue>
                  {(selected: AccountFormInput["type"] | null) =>
                    accountTypeOptions.find((option) => option.value === selected)
                      ?.label ?? "Selecione"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accountTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-last-digits">Últimos dígitos (opcional)</Label>
            <Input
              id="account-last-digits"
              className="h-11"
              placeholder="1234"
              maxLength={8}
              {...register("lastDigits")}
            />
          </div>

          <MoneyInput
            label="Saldo inicial"
            error={errors.initialBalance?.message}
            {...register("initialBalance")}
          />

          <div className="flex flex-col gap-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {accountColorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cor ${color}`}
                  aria-pressed={colorValue === color}
                  onClick={() => setColorValue(color)}
                  className={cn(
                    "size-9 rounded-full border-2 transition-transform",
                    colorValue === color
                      ? "scale-110 border-foreground"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Button type="submit" size="lg" className="h-11 mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar conta"}
          </Button>
        </form>

        {account ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 text-destructive hover:text-destructive"
                >
                  Excluir conta
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir esta conta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Só é possível excluir uma conta sem lançamentos. Essa ação
                  não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
