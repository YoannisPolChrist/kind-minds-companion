# Testing Workflow

This repo now has a small verification baseline for the active web app in `src/`.

## What to run

- `npm run test:modules`
  - Fast unit coverage for the existing module helpers.
- `npm run test:smoke`
  - Playwright smoke coverage for the public auth route bootstrap.
- `npm run verify:web`
  - Module tests, web build, and smoke tests in one command.

## Authenticated smoke tests

`tests/smoke/authenticated-shell.spec.ts` is opt-in and skips itself unless these env vars are present:

- `E2E_CLIENT_EMAIL`
- `E2E_CLIENT_PASSWORD`

That keeps CI stable while still giving us a path to test a real signed-in session locally.

## Why the default smoke is intentionally narrow

The current app still holds the public routes behind a shared auth/bootstrap loading shell in a clean environment. Because of that, the default smoke test verifies that `/login` and `/register` boot the shared shell reliably instead of pretending the full auth form is already stable under automated startup.

Once the auth/bootstrap path is split more cleanly, expand the public smoke suite to assert the actual login and register controls again.

## Playwright server behavior

The Playwright config lives at `tests/playwright.config.ts`.

- By default it starts the local Vite server on `127.0.0.1:4173`.
- If `PLAYWRIGHT_BASE_URL` is set, it uses that URL instead and does not start a local server.

## Active versus legacy code paths

The smoke and CI checks are intentionally focused on the active web app under `src/`.

- `src/` is the product path we currently verify.
- Root-level Expo-era directories such as `app/`, `components/`, `contexts/`, `hooks/`, `modules/`, `services/`, and `utils/` still exist, but they are not treated as the primary verified surface for this workflow.

As we migrate more shared logic into `src/`, the smoke coverage should grow with it instead of expanding the legacy surface.
