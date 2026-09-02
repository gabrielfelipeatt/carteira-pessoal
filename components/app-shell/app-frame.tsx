import type { ReactNode } from "react";

/**
 * Moldura de aplicativo: no mobile ocupa a tela inteira; em telas médias fica
 * centralizada como um cartão no formato de app, sobre uma textura discreta
 * de grade — para nunca parecer um painel administrativo genérico. A partir
 * de `lg:` (1024px+) essa moldura de cartão dá lugar a uma barra lateral
 * fixa + conteúdo em largura cheia, um layout pensado para computador.
 */
export function AppFrame({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-background md:flex md:items-center md:justify-center md:p-8 lg:flex lg:items-stretch lg:justify-start lg:p-0"
      style={{
        backgroundImage:
          "linear-gradient(color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {sidebar}
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-background md:min-h-[calc(100vh-4rem)] md:overflow-hidden md:rounded-[2rem] md:border md:border-border md:shadow-2xl lg:mx-0 lg:max-w-none lg:min-h-screen lg:flex-1 lg:overflow-visible lg:rounded-none lg:border-0 lg:border-l lg:border-border lg:shadow-none">
        {children}
      </div>
    </div>
  );
}
