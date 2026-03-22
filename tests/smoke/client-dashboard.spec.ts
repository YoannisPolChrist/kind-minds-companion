import { expect, test } from "@playwright/test";
import { loginAsClient } from "./helpers/session";

const hasClientCreds = Boolean(process.env.E2E_CLIENT_EMAIL && process.env.E2E_CLIENT_PASSWORD);

test.describe("client dashboard smoke", () => {
  test.skip(!hasClientCreds, "Set E2E_CLIENT_EMAIL and E2E_CLIENT_PASSWORD to run dashboard smoke tests.");

  test("shows check-in CTA and next appointment summary", async ({ page }) => {
    await loginAsClient(page);

    await expect(page.locator("main")).toContainText(/dashboard/i);
    await expect(page.getByRole("button", { name: /check-in/i })).toBeVisible();
    await expect(page.getByText(/nächster termin|next appointment/i)).toBeVisible();
  });
});
