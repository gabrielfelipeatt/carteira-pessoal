"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/components/app-shell/use-sign-out";

export function SignOutButton() {
  const signOut = useSignOut();

  return (
    <Button
      variant="outline"
      className="h-11 justify-start gap-2 text-destructive hover:text-destructive"
      onClick={signOut}
    >
      <LogOut className="size-4" aria-hidden />
      Sair
    </Button>
  );
}
