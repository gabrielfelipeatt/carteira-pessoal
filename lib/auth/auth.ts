import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";

// Carteira Pessoal é um app de usuário único, self-hosted.
// Não há login social nem cadastro público — a única conta é criada
// por `db/seed-user.ts`, que lê as credenciais de `user.txt` (gitignored)
// e chama `auth.api.signUpEmail` diretamente, uma única vez.
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // sign-up só é permitido via chamada direta do seed-user.ts no servidor
  },
  session: {
    // Sessão de longa duração, renovada a cada uso: na prática, o usuário
    // continua logado indefinidamente até clicar em "Sair" (não há fluxo de
    // cadastro/recuperação por e-mail que dependa de expiração curta aqui).
    expiresIn: 60 * 60 * 24 * 365, // 1 ano
    updateAge: 60 * 60 * 24, // renova a cada 24h de uso, adiando a expiração
  },
});
