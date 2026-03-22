import { expect, test } from "@playwright/test";

test("public auth routes boot the shared web shell", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("body")).toContainText(/kind minds/i, { timeout: 30000 });
  await expect(page.getByRole("heading", { name: /willkommen zurueck|willkommen zurück/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /einloggen/i })).toBeVisible();

  await page.goto("/register");
  await expect(page.locator("body")).toContainText(/kind minds/i, { timeout: 30000 });
  await expect(page.getByRole("button", { name: /konto erstellen|registrieren/i })).toBeVisible();
});
