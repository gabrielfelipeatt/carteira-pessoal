import { forwardRef, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DateFieldProps = Omit<ComponentProps<typeof Input>, "type"> & {
  label: string;
  error?: string;
};

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  function DateField({ label, error, id, className, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>{label}</Label>
        <Input
          ref={ref}
          id={inputId}
          type="date"
          aria-invalid={!!error}
          className={"h-11 " + (className ?? "")}
          {...props}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  },
);
