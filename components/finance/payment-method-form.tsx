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
import { savePaymentMethod } from "@/lib/actions/payment-methods";
import {
  paymentMethodFormSchema,
  type PaymentMethodFormInput,
} from "@/lib/validation/payment-methods";
import type { paymentMethods as paymentMethodsTable } from "@/db/schema";

type PaymentMethod = typeof paymentMethodsTable.$inferSelect;

const kindOptions: { value: PaymentMethodFormInput["kind"]; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "transferencia", label: "Transferência bancária" },
  { value: "outro", label: "Outro" },
];

export function PaymentMethodForm({
  open,
  onOpenChange,
  paymentMethod,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod?: PaymentMethod;
  onSaved?: () => void;
}) {
  const isSystem = paymentMethod?.isSystem ?? false;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodFormInput>({
    resolver: zodResolver(paymentMethodFormSchema),
    defaultValues: paymentMethod
      ? {
          id: paymentMethod.id,
          name: paymentMethod.name,
          kind: paymentMethod.kind,
          isActive: paymentMethod.isActive,
        }
      : { name: "", kind: "outro", isActive: true },
  });

  async function onSubmit(values: PaymentMethodFormInput) {
    try {
      await savePaymentMethod(values);
      toast.success(paymentMethod ? "Forma de pagamento atualizada." : "Forma de pagamento criada.");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar forma de pagamento.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {paymentMethod ? "Editar forma de pagamento" : "Nova forma de pagamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-method-name">Nome</Label>
            <Input
              id="payment-method-name"
              className="h-11"
              disabled={isSystem}
              placeholder="Ex: Vale-alimentação"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-method-kind">Categoria de meio</Label>
            <Select
              value={watch("kind")}
              onValueChange={(value) =>
                setValue("kind", value as PaymentMethodFormInput["kind"])
              }
              disabled={isSystem}
            >
              <SelectTrigger id="payment-method-kind" className="h-11 w-full">
                <SelectValue>
                  {(selected: PaymentMethodFormInput["kind"] | null) =>
                    kindOptions.find((option) => option.value === selected)?.label ??
                    "Selecione"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {kindOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <Label htmlFor="payment-method-active" className="text-sm">
              Ativa
            </Label>
            <Switch
              id="payment-method-active"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
          </div>

          {isSystem ? (
            <p className="text-xs text-muted-foreground">
              Meios padrão do sistema não podem ser renomeados — apenas
              ativados ou pausados.
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="h-11 mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
