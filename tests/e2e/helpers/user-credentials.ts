import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Lê as credenciais reais de `user.txt` (nunca commitado) para os testes E2E
 * de login. Este app não usa seeds/fixtures de conta fictícia — o único
 * usuário é o mesmo criado por `db/seed-user.ts`.
 */
export function readTestCredentials() {
  const path = resolve(process.cwd(), "user.txt");
  const raw = readFileSync(path, "utf-8");
  const fields = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*(\w+)\s*:\s*(.+?)\s*$/);
    if (!match) continue;
    fields.set(match[1].toLowerCase(), match[2]);
  }

  const email = fields.get("login") ?? fields.get("email");
  const password = fields.get("senha") ?? fields.get("password");

  if (!email || !password) {
    throw new Error(
      "user.txt precisa existir com 'login:' e 'senha:' para rodar os testes E2E de autenticação.",
    );
  }

  return { email, password };
}
