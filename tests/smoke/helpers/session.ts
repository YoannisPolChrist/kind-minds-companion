import { expect, Page } from "@playwright/test";

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required env var ${name} for authenticated smoke tests.`);
  }
  return value;
}

export async function loginAsClient(page: Page) {
  const email = requireEnv(process.env.E2E_CLIENT_EMAIL, "E2E_CLIENT_EMAIL");
  const password = requireEnv(process.env.E2E_CLIENT_PASSWORD, "E2E_CLIENT_PASSWORD");

  await page.goto("/login");
  await page.getByPlaceholder(/name@beispiel\.de/i).fill(email);
  await page.getByPlaceholder(/passwort eingeben/i).fill(password);
  await page.getByRole("button", { name: /einloggen/i }).click();

  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /abmelden/i })).toBeVisible();
}
