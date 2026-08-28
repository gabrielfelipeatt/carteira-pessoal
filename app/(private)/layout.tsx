import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { AppFrame } from "@/components/app-shell/app-frame";
import { TopBar } from "@/components/app-shell/top-bar";
import { BottomNav } from "@/components/app-shell/bottom-nav";

export default async function PrivateLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Defesa em profundidade: o middleware já redireciona por cookie, mas a
  // autorização real desta camada de renderização é conferida aqui de novo.
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppFrame>
      <TopBar />
      <main className="flex-1 overflow-y-auto px-5 py-6">{children}</main>
      <BottomNav />
    </AppFrame>
  );
}
