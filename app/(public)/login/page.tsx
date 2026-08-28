import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Carteira Pessoal
        </h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Entre para acessar sua carteira.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
