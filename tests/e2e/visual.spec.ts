import { expect, test } from "@playwright/test";
import { readTestCredentials } from "./helpers/user-credentials";

test.describe("Visual — shell e telas vazias", () => {
  test("tela de login", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveScreenshot("login.png");
  });

  test("dashboard vazio (shell + bottom nav / moldura de app)", async ({
    page,
  }) => {
    const { email, password } = readTestCredentials();

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL("/");

    await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-empty.png");
  });
});
