# QA Workflow Upgrades Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand automated QA coverage and CI workflow signals so the Client Shell, Reliability, Visual System, and Calendar Connect releases block on realistic Playwright scenarios, lint/type checks, and documented workflows.

**Architecture:** Use Playwright with shared helpers to cover dashboard, check-in, diary, upload, and calendar flows, port the manual capture routines into reusable CI-safe helpers, and enhance `npm run verify:web` plus GitHub Actions with secrets, lint/tsc, and artifact uploads. Finish by updating the architecture/testing docs to reflect the new workflow.

**Tech Stack:** Playwright (TypeScript), Node 22, npm scripts, GitHub Actions, Markdown documentation.

---

### Task 1: Client dashboard + check-in CTA smoke spec

**Files:**
- Create: `tests/smoke/helpers/session.ts`
- Create: `tests/smoke/client-dashboard.spec.ts`
- Modify: `tests/smoke/authenticated-shell.spec.ts:3-8` (reuse env parsing)

**Step 1: Write the failing test**

```ts
// tests/smoke/client-dashboard.spec.ts
import { expect, test } from "@playwright/test";
import { loginAsClient } from "./helpers/session";

test("client dashboard shows check-in + next appointment cards", async ({ page }) => {
  await loginAsClient(page);
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /check-in/i })).toBeVisible();
  await expect(page.getByText(/nächster termin/i)).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/smoke/client-dashboard.spec.ts --headed`

Expected: Type error / runtime failure because `loginAsClient` does not exist, selectors unresolved.

**Step 3: Write minimal implementation**

```ts
// tests/smoke/helpers/session.ts
import { Page } from "@playwright/test";

const clientEmail = process.env.E2E_CLIENT_EMAIL!;
const clientPassword = process.env.E2E_CLIENT_PASSWORD!;

export async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder(/name@beispiel.de/i).fill(clientEmail);
  await page.getByPlaceholder(/passwort eingeben/i).fill(clientPassword);
  await page.getByRole("button", { name: /einloggen/i }).click();
  await page.waitForURL(/dashboard/);
}
```

Also import/export helpers from `tests/smoke/authenticated-shell.spec.ts` instead of duplicating env reads.

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/smoke/client-dashboard.spec.ts --reporter=list`

Expected: PASS, selectors resolved, CTA visible.

**Step 5: Commit**

```bash
git add tests/smoke/helpers/session.ts tests/smoke/client-dashboard.spec.ts tests/smoke/authenticated-shell.spec.ts
git commit -m "test: add client dashboard smoke coverage"
```

---

### Task 2: Check-in completion + diary flow smoke spec

**Files:**
- Create: `tests/smoke/checkin-diary.spec.ts`
- Modify: `tests/smoke/helpers/session.ts:1-30` (add `completeClientCheckin`)
- Modify: `tests/smoke/fixtures/test-data.ts` (optional helper for seeded text)

**Step 1: Write the failing test**

```ts
test("client can submit a check-in and open diary entry", async ({ page }) => {
  await loginAsClient(page);
  await completeClientCheckin(page, { mood: 6, note: "Smoke entry" });
  await page.getByRole("link", { name: /tagebuch|notizen/i }).click();
  await expect(page.getByText("Smoke entry")).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/smoke/checkin-diary.spec.ts`

Expected: FAIL because `completeClientCheckin` is missing and diary assertion cannot find data.

**Step 3: Write minimal implementation**

```ts
export async function completeClientCheckin(page: Page, payload: { mood: number; note: string }) {
  await page.getByRole("button", { name: /check-in starten/i }).click();
  await page.getByLabel(/wie fühlst du dich/i).fill(String(payload.mood));
  await page.getByLabel(/notiz/i).fill(payload.note);
  await page.getByRole("button", { name: /absenden/i }).click();
  await expect(page.getByText(/danke für dein check-in/i)).toBeVisible();
}
```

Add a `tests/smoke/fixtures/test-data.ts` export with deterministic note strings (timestamp suffix) to avoid collisions.

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/smoke/checkin-diary.spec.ts --reporter=list`

Expected: PASS.

**Step 5: Commit**

```bash
git add tests/smoke/checkin-diary.spec.ts tests/smoke/helpers/session.ts tests/smoke/fixtures/test-data.ts
git commit -m "test: cover check-in completion and diary flow"
```

---

### Task 3: Therapist dashboard + upload + calendar smoke spec

**Files:**
- Create: `tests/smoke/therapist-workflows.spec.ts`
- Modify: `tests/smoke/helpers/session.ts:31-80` (add `loginAsTherapist`, `uploadClientFile`, `assertCalendarLink`)
- Modify: `tests/smoke/fixtures/test-files/placeholder.pdf`

**Step 1: Write the failing test**

```ts
test("therapist can upload a file and see calendar link", async ({ page }) => {
  await loginAsTherapist(page);
  await expect(page.getByRole("heading", { name: /therapist dashboard/i })).toBeVisible();
  await uploadClientFile(page, "fixtures/test-files/placeholder.pdf");
  await expect(page.getByText(/placeholder.pdf/i)).toBeVisible();
  await assertCalendarLink(page);
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/smoke/therapist-workflows.spec.ts`

Expected: FAIL because therapist helpers and fixtures are missing.

**Step 3: Write minimal implementation**

```ts
export async function loginAsTherapist(page: Page) { /* mirror client login with therapist env vars */ }

export async function uploadClientFile(page: Page, filePath: string) {
  await page.getByRole("button", { name: /datei hochladen/i }).click();
  await page.setInputFiles("input[type=file]", filePath);
  await expect(page.getByText(/upload erfolgreich/i)).toBeVisible();
}

export async function assertCalendarLink(page: Page) {
  await page.getByRole("button", { name: /kalender verbinden/i }).click();
  await expect(page.getByRole("link", { name: /google/i })).toHaveAttribute("href", /calendar.google.com/);
}
```

Place a tiny PDF under `tests/smoke/fixtures/test-files/`.

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/smoke/therapist-workflows.spec.ts --reporter=list`

Expected: PASS.

**Step 5: Commit**

```bash
git add tests/smoke/therapist-workflows.spec.ts tests/smoke/helpers/session.ts tests/smoke/fixtures/test-files/placeholder.pdf
git commit -m "test: add therapist upload and calendar smoke coverage"
```

---

### Task 4: Port manual capture scripts into Playwright visual/perf helper

**Files:**
- Create: `tests/smoke/helpers/visual.ts`
- Create: `tests/smoke/visual-system.spec.ts`
- Delete: `tests/capture_dashboards.js`, `tests/capture_logs*.js`, `tests/capture_perf.js`
- Modify: `package.json:13-21` (drop obsolete script references if any)

**Step 1: Write the failing test**

```ts
import { captureVisualState } from "./helpers/visual";

test("Visual System baseline", async ({ page }) => {
  await loginAsClient(page);
  await captureVisualState(page, { name: "client-dashboard" });
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/smoke/visual-system.spec.ts`

Expected: FAIL because `captureVisualState` is undefined and no tracing configured.

**Step 3: Write minimal implementation**

```ts
export async function captureVisualState(page: Page, opts: { name: string }) {
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `test-results/${opts.name}.png`, fullPage: true });
  const perf = await page.evaluate(() => performance.timing.loadEventEnd - performance.timing.navigationStart);
  console.log(`[perf] ${opts.name}: ${perf}ms`);
}
```

Wrap Playwright test with `test.info().attach` for screenshot + console log, delete old Node scripts.

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/smoke/visual-system.spec.ts --reporter=line`

Expected: PASS with screenshot artifacts.

**Step 5: Commit**

```bash
git add tests/smoke/helpers/visual.ts tests/smoke/visual-system.spec.ts package.json tests/capture_*.js
git commit -m "test: port visual capture scripts into Playwright"
```

---

### Task 5: Wire new suites into npm scripts and `verify:web`

**Files:**
- Modify: `package.json:13-21`
- Modify: `tests/playwright.config.ts:7-35`

**Step 1: Write the failing test**

Add the new spec globs to `test:smoke` and `verify:web` without updating config, causing Playwright to skip fixtures.

**Step 2: Run test to verify it fails**

Run: `npm run verify:web`

Expected: FAIL because new suites hit `process.env` keys not loaded by config or exceed default timeout.

**Step 3: Write minimal implementation**

Update `test:smoke` to `playwright test -c tests/playwright.config.ts --grep @smoke`, add `test:smoke:auth` for authenticated-only, and include them in `verify:web`. Adjust `tests/playwright.config.ts` to tag each spec via `test.describe.configure({ mode: "parallel", annotation: { type: "release", description: "Client Shell" }})` and bump timeout.

**Step 4: Run test to verify it passes**

Run: `npm run verify:web`

Expected: PASS with new suites in reporter output.

**Step 5: Commit**

```bash
git add package.json tests/playwright.config.ts
git commit -m "chore: wire new smoke suites into verify:web"
```

---

### Task 6: Inject secrets and authenticated smoke into GitHub Actions

**Files:**
- Modify: `.github/workflows/web-smoke.yml:18-37`
- Configure: GitHub repo secrets (`E2E_CLIENT_EMAIL`, `E2E_CLIENT_PASSWORD`, `E2E_THERAPIST_EMAIL`, `E2E_THERAPIST_PASSWORD`)

**Step 1: Write the failing test**

Update the workflow to add an `authenticated-smoke` step referencing the env vars before they exist.

**Step 2: Run test to verify it fails**

Trigger the workflow on a branch; expect failure due to missing secrets.

**Step 3: Write minimal implementation**

Set secrets in GitHub, add `env` block to the job, and insert a step:

```yaml
- name: Run authenticated smoke tests
  run: npm run test:smoke -- --grep @auth
  env:
    E2E_CLIENT_EMAIL: ${{ secrets.E2E_CLIENT_EMAIL }}
    ...
```

**Step 4: Run test to verify it passes**

Push to test branch, confirm workflow succeeds and fails when the suite fails.

**Step 5: Commit**

```bash
git add .github/workflows/web-smoke.yml
git commit -m "ci: run authenticated smoke suite with repo secrets"
```

---

### Task 7: Add lint/type-check, both smoke suites, and artifacts to CI

**Files:**
- Modify: `.github/workflows/web-smoke.yml:24-40`
- Modify: `package.json:13-21` (add `lint` and `typecheck` scripts)

**Step 1: Write the failing test**

Add steps for `npm run lint` and `npm run typecheck` before they exist.

**Step 2: Run test to verify it fails**

Trigger workflow, expect failure because scripts missing.

**Step 3: Write minimal implementation**

Add scripts:

```json
"lint": "eslint src --max-warnings=0",
"typecheck": "tsc --noEmit"
```

Update workflow to:

```yaml
- run: npm run lint
- run: npm run typecheck
- run: npm run test:smoke -- --grep @public
- run: npm run test:smoke -- --grep @auth
- uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report
```

**Step 4: Run test to verify it passes**

Trigger workflow, ensure artifacts available and failures block merges.

**Step 5: Commit**

```bash
git add package.json .github/workflows/web-smoke.yml
git commit -m "ci: add lint/typecheck and artifact uploads"
```

---

### Task 8: Update architecture + testing docs

**Files:**
- Modify: `ARCHITECTURE.md:5-33`
- Modify: `docs/testing-workflow.md:7-43`
- Modify: `docs/testing-workflow.md` (add release checklist section)

**Step 1: Write the failing test**

Add TODO markers to both docs noting that content is outdated (treat docs build as failing test).

**Step 2: Run test to verify it fails**

Run `rg TODO docs` to confirm reminders exist.

**Step 3: Write minimal implementation**

Update `ARCHITECTURE.md` to declare `src/` as canonical feature path and note parked Expo directories. Extend `docs/testing-workflow.md` with instructions for the new Playwright suites, required secrets, and a release checklist (Reliability, Client Shell, Visual System, Calendar Connect).

**Step 4: Run test to verify it passes**

Run `rg TODO docs` again (should return nothing) and `npm run lint` to ensure doc changes don't break tooling.

**Step 5: Commit**

```bash
git add ARCHITECTURE.md docs/testing-workflow.md
git commit -m "docs: align architecture and testing workflow with new QA process"
```

---

Plan complete and saved to `docs/plans/2026-03-20-qa-workflow-upgrades.md`. Two execution options:

1. Subagent-Driven (this session)
2. Parallel Session (separate)

Which approach?
