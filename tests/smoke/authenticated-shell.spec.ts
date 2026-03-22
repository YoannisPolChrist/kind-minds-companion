import { test } from "@playwright/test";
import { loginAsClient } from "./helpers/session";

const hasClientCreds = Boolean(process.env.E2E_CLIENT_EMAIL && process.env.E2E_CLIENT_PASSWORD);

test.describe("authenticated smoke", () => {
  test.skip(!hasClientCreds, "Set E2E_CLIENT_EMAIL and E2E_CLIENT_PASSWORD to run authenticated smoke tests.");

  test("client can sign in and reach the shell", async ({ page }) => {
    await loginAsClient(page);
  });
});
