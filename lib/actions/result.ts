/**
 * Em produção o Next.js apaga a mensagem de qualquer erro lançado por uma
 * server action (o cliente só recebe um texto genérico com um "digest").
 * Por isso uma regra de negócio esperada ("esta meta tem aportes e não pode
 * ser removida") nunca pode ser um `throw` — precisa voltar como resultado,
 * senão o usuário vê "Minified React error #441" em vez do motivo.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Erro de regra de negócio, seguro para mostrar ao usuário. */
export class UserFacingError extends Error {}

export async function toResult(run: () => Promise<void>): Promise<ActionResult> {
  try {
    await run();
    return { ok: true };
  } catch (error) {
    if (error instanceof UserFacingError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
