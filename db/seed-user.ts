/**
 * Cria a única conta da Carteira Pessoal, lendo as credenciais de `user.txt`
 * (na raiz do projeto, nunca commitado — veja .gitignore).
 *
 * Formato esperado do user.txt:
 *   login: seu@email.com
 *   senha: sua-senha
 *   nome: Seu Nome        (opcional)
 *
 * Uso (uma única vez, após a primeira migration):
 *   pnpm run create-user
 *
 * Roda com sua própria instância local do Better Auth (sem `disableSignUp`),
 * já que a instância principal em lib/auth/auth.ts bloqueia cadastro público
 * por HTTP de propósito — este script grava a conta direto no banco.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { user } from "./auth-schema";

function parseUserFile(path: string) {
  const raw = readFileSync(path, "utf-8");
  const fields = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*(\w+)\s*:\s*(.+?)\s*$/);
    if (!match) continue;
    fields.set(match[1].toLowerCase(), match[2]);
  }

  const email = fields.get("login") ?? fields.get("email");
  const password = fields.get("senha") ?? fields.get("password");
  const name = fields.get("nome") ?? fields.get("name") ?? email?.split("@")[0] ?? "Usuário";

  if (!email || !password) {
    throw new Error(
      "user.txt precisa ter as linhas 'login: ...' e 'senha: ...' (veja o cabeçalho deste arquivo).",
    );
  }

  return { email, password, name };
}

async function main() {
  const existing = await db.select({ id: user.id }).from(user).limit(1);
  if (existing.length > 0) {
    console.log(
      "Já existe um usuário cadastrado — nada a fazer (app é de usuário único).",
    );
    return;
  }

  const userFilePath = resolve(process.cwd(), "user.txt");
  const { email, password, name } = parseUserFile(userFilePath);

  const seedAuth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "sqlite" }),
    emailAndPassword: { enabled: true },
  });

  await seedAuth.api.signUpEmail({ body: { email, password, name } });

  console.log(`Usuário criado com sucesso: ${email}`);
  console.log(
    "Lembrete de segurança: user.txt continua com a senha em texto puro — mantenha-o local e nunca o commite.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Falha ao criar o usuário:", error);
    process.exit(1);
  });
