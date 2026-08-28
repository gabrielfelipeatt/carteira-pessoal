import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL é obrigatório (ex: libsql://<db>.turso.io)"),
  TURSO_AUTH_TOKEN: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET precisa ter pelo menos 32 caracteres"),
  BETTER_AUTH_URL: z.string().url(),
  APP_TIMEZONE: z.string().default("America/Sao_Paulo"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Variáveis de ambiente inválidas ou ausentes:\n${issues}\n\nVerifique seu arquivo .env.local (veja .env.example).`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
