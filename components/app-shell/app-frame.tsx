import type { ReactNode } from "react";

/**
 * Moldura de aplicativo: no mobile ocupa a tela inteira; em telas largas fica
 * centralizada como um cartão no formato de app, sobre uma textura discreta
 * de grade — para nunca parecer um painel administrativo genérico.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-background md:flex md:items-center md:justify-center md:p-8"
      style={{
        backgroundImage:
          "linear-gradient(color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-background md:min-h-[calc(100vh-4rem)] md:overflow-hidden md:rounded-[2rem] md:border md:border-border md:shadow-2xl">
        {children}
      </div>
    </div>
  );
}
