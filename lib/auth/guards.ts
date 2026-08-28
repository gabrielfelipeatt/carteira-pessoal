import { getServerSession } from "@/lib/auth/session";

export class UnauthorizedError extends Error {
  constructor() {
    super("Sessão ausente ou inválida.");
    this.name = "UnauthorizedError";
  }
}

/**
 * Toda server action/query de dados financeiros deve chamar isto primeiro.
 * Nunca confiar apenas no `proxy.ts` (que só faz uma checagem rápida de
 * cookie para redirecionar a UI) — esta é a fonte real de autorização.
 */
export async function requireSession() {
  const session = await getServerSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export async function requireUserId() {
  const session = await requireSession();
  return session.user.id;
}
