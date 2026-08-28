import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MoneyInputProps = Omit<ComponentProps<typeof Input>, "type"> & {
  label: string;
  error?: string;
};

/**
 * Campo de valor monetário: aceita vírgula ou ponto, texto livre — a
 * normalização para centavos acontece no servidor (nunca confiar no
 * cliente para essa conversão). O rótulo é sempre visível, nunca só
 * placeholder.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput({ label, error, id, className, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>{label}</Label>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
          >
            R$
          </span>
          <Input
            ref={ref}
            id={inputId}
            inputMode="decimal"
            placeholder="0,00"
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              "h-11 pl-9 font-mono tabular-nums text-right",
              className,
            )}
            {...props}
          />
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
