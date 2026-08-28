"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      className="h-11 justify-start gap-2 text-destructive hover:text-destructive"
      onClick={handleSignOut}
    >
      <LogOut className="size-4" aria-hidden />
      Sair
    </Button>
  );
}
