import { expect, test } from "@playwright/test";
import { readTestCredentials } from "./helpers/user-credentials";

test.describe("Autenticação", () => {
  test("visitante anônimo é redirecionado para /login em toda rota privada", async ({
    page,
  }) => {
    for (const path of ["/", "/lancamentos", "/cartoes", "/relatorios", "/orcamentos", "/categorias", "/configuracoes"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("login com credenciais válidas leva ao dashboard, e logout invalida a sessão", async ({
    page,
  }) => {
    const { email, password } = readTestCredentials();

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();

    // Logout via o menu "Mais"
    await page.getByRole("button", { name: "Mais" }).click();
    await page.getByRole("button", { name: "Sair" }).click();

    await expect(page).toHaveURL(/\/login/);

    // Sessão realmente invalidada — não basta o cookie sumir no cliente
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login com senha errada mostra erro e não navega", async ({ page }) => {
    const { email } = readTestCredentials();

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("senha-incorreta-xyz");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "inválidos" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
