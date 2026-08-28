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
import { MoneyInput } from "@/components/finance/money-input";
import { accountColorOptions } from "@/lib/validation/accounts";
import { cn } from "@/lib/utils";
import { saveCreditCard } from "@/lib/actions/credit-cards";
import {
  creditCardFormSchema,
  type CreditCardFormInput,
} from "@/lib/validation/credit-cards";
import type { creditCards as creditCardsTable } from "@/db/schema";

type CreditCard = typeof creditCardsTable.$inferSelect;

export function CreditCardForm({
  open,
  onOpenChange,
  card,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard;
  onSaved?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreditCardFormInput>({
    resolver: zodResolver(creditCardFormSchema),
    defaultValues: card
      ? {
          id: card.id,
          nickname: card.nickname,
          issuer: card.issuer ?? "",
          brand: card.brand ?? "",
          lastDigits: card.lastDigits ?? "",
          limit: (card.limitCents / 100).toFixed(2).replace(".", ","),
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          color: card.color,
          status: card.status,
        }
      : {
          nickname: "",
          issuer: "",
          brand: "",
          lastDigits: "",
          limit: "",
          closingDay: 1,
          dueDay: 10,
          color: accountColorOptions[0],
          status: "active",
        },
  });

  async function onSubmit(values: CreditCardFormInput) {
    try {
      await saveCreditCard(values);
      toast.success(card ? "Cartão atualizado." : "Cartão criado.");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar cartão.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {card ? "Editar cartão" : "Novo cartão"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-nickname">Apelido</Label>
            <Input
              id="card-nickname"
              className="h-11"
              placeholder="Ex: Nubank Roxinho"
              aria-invalid={!!errors.nickname}
              {...register("nickname")}
            />
            {errors.nickname ? (
              <p className="text-sm text-destructive">{errors.nickname.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-issuer">Emissor (opcional)</Label>
            <Input id="card-issuer" className="h-11" {...register("issuer")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-brand">Bandeira (opcional)</Label>
            <Input
              id="card-brand"
              className="h-11"
              placeholder="Visa, Mastercard..."
              {...register("brand")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-last-digits">Últimos dígitos (opcional)</Label>
            <Input id="card-last-digits" className="h-11" maxLength={8} {...register("lastDigits")} />
          </div>

          <MoneyInput
            label="Limite total"
            error={errors.limit?.message}
            {...register("limit")}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="card-closing-day">Dia de fechamento</Label>
              <Input
                id="card-closing-day"
                type="number"
                min={1}
                max={31}
                className="h-11"
                aria-invalid={!!errors.closingDay}
                {...register("closingDay", { valueAsNumber: true })}
              />
              {errors.closingDay ? (
                <p className="text-sm text-destructive">{errors.closingDay.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="card-due-day">Dia de vencimento</Label>
              <Input
                id="card-due-day"
                type="number"
                min={1}
                max={31}
                className="h-11"
                aria-invalid={!!errors.dueDay}
                {...register("dueDay", { valueAsNumber: true })}
              />
              {errors.dueDay ? (
                <p className="text-sm text-destructive">{errors.dueDay.message}</p>
              ) : null}
            </div>
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
            <Label htmlFor="card-active" className="text-sm">
              Ativo
            </Label>
            <Switch
              id="card-active"
              checked={watch("status") === "active"}
              onCheckedChange={(checked) =>
                setValue("status", checked ? "active" : "inactive")
              }
            />
          </div>

          <Button type="submit" size="lg" className="h-11 mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar cartão"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
