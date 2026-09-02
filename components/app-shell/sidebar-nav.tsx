"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignOut } from "./use-sign-out";
import { primaryNavItems, moreMenuItems } from "./nav-items";

const navItems = [...primaryNavItems, ...moreMenuItems];

export function SidebarNav() {
  const pathname = usePathname();
  const signOut = useSignOut();

  return (
    <aside
      aria-label="Navegação principal"
      className="hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64"
    >
      <div className="px-5 py-6">
        <span className="font-heading text-lg font-semibold tracking-tight">
          Carteira Pessoal
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4.5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-sidebar-accent"
        >
          <LogOut className="size-4.5" aria-hidden />
          Sair
        </button>
      </div>
    </aside>
  );
}
