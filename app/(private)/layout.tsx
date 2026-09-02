import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { AppFrame } from "@/components/app-shell/app-frame";
import { TopBar } from "@/components/app-shell/top-bar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";

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
    <AppFrame sidebar={<SidebarNav />}>
      <TopBar />
      <main className="flex-1 overflow-y-auto px-5 py-6 lg:mx-auto lg:w-full lg:max-w-5xl">
        {children}
      </main>
      <BottomNav />
    </AppFrame>
  );
}
