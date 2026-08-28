import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Checagem rápida de cookie, só para UX (redireciona antes de renderizar a
// rota privada). A autorização de verdade acontece em cada server action via
// `requireSession()` — nunca confiar só nisto aqui.
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/lancamentos/:path*",
    "/cartoes/:path*",
    "/relatorios/:path*",
    "/orcamentos/:path*",
    "/categorias/:path*",
    "/configuracoes/:path*",
  ],
};
