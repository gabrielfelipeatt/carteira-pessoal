"use client";

import { ArrowLeftRight, Scale } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function OutrosSheet({
  open,
  onOpenChange,
  onSelectTransfer,
  onSelectAdjustment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTransfer: () => void;
  onSelectAdjustment: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="font-heading">Outros</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4 pb-6">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSelectTransfer();
            }}
            className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-accent"
          >
            <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
            Transferência entre contas
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSelectAdjustment();
            }}
            className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-accent"
          >
            <Scale className="size-4 text-muted-foreground" aria-hidden />
            Ajuste de saldo
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
