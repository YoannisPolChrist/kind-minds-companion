# Six Agent Improvement Plans

This document turns the six analysis tracks into concrete implementation plans. Each agent owns one lane, but the work is intentionally sequenced so we do not refactor the same area twice.

## Shared execution order

1. Agent 3 secures Firebase, secrets, and environment targeting first.
2. Agent 2 establishes the structural boundaries for auth, routing, and shared data access.
3. Agent 4 reduces bootstrap and bundle weight on top of the new structure.
4. Agent 1 refactors the web shell and dashboard surfaces once navigation and loading boundaries are stable.
5. Agent 5 improves the product flows on the stabilized shell and data layer.
6. Agent 6 adds regression protection and repo hygiene around the new baseline.

## Agent 1 - UX / Web Shell / Responsive Workspace

### Mission
Replace the current hero-style client and therapist entry surfaces with a consistent web-first workspace shell that behaves well on desktop, tablet, and mobile.

### Primary files
- `src/components/layout/AppShell.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/therapist/TherapistHeroHeader.tsx`
- `src/pages/therapist/TherapistDashboard.tsx`
- `src/pages/Settings.tsx`

### Work packages
1. Extract `AppShell` into smaller layout parts:
   - desktop sidebar
   - top header
   - mobile bottom navigation
   - role-aware quick actions
2. Redesign the client dashboard as a browser workspace:
   - remove random full-bleed scenic hero
   - promote check-in, offene Aufgaben, and next appointment into top-level work panels
   - normalize card widths, spacing, and typography
3. Redesign the therapist dashboard as an operational workspace:
   - replace the scenic hero header with structured summary blocks
   - widen the main work cards for realistic therapist usage
   - surface quick actions for clients, templates, resources, and coordination
4. Rework mobile navigation so it matches the real client flows instead of collapsing too much behind one tab.
5. Clean up duplicated sign-out/profile blocks and role labels inside the shell.

### Dependencies
- Wait for Agent 2 to define the shell and routing boundaries.
- Coordinate with Agent 4 before introducing heavy motion or shared header media.

### Acceptance criteria
- Client and therapist shells share one coherent navigation model.
- Mobile, tablet, and desktop layouts feel like browser workspaces rather than stretched phone screens.
- The dashboard above-the-fold area always shows the most important next actions without relying on decorative hero imagery.

## Agent 2 - Architecture / Routing / Source of Truth

### Mission
Establish one authoritative web architecture for auth, routing, and domain data so future feature work is not split between `src/` and legacy Expo-era paths.

### Primary files
- `src/App.tsx`
- `src/RouterTree.tsx`
- `src/hooks/useAuth.ts`
- `contexts/AuthContext.tsx`
- `stores/authStore.ts`
- `tsconfig.json`
- `modules/`
- `services/`
- `utils/`

### Work packages
1. Define one auth/profile source of truth for the web app:
   - either migrate the useful Zustand behavior into `src/`
   - or retire the legacy auth store and keep only the web hook path
2. Replace the current wrapped-route pattern in `RouterTree` with nested route groups:
   - public routes
   - client routes
   - therapist routes
   - per-role layout routes
3. Create a web-native service/domain layer under `src/` and stop pages from querying Firestore inline.
4. Port or replace any still-needed logic from root `modules/`, `services/`, and `utils/` so `src/` no longer depends on excluded legacy files.
5. Tighten `tsconfig.json` and import boundaries so the active web code path is fully type-checked.
6. Document the status of the parked legacy Expo path so contributors stop treating it as active product code.

### Dependencies
- Agent 3 must define the final auth/profile contract and invite rules before auth cleanup lands.
- Agent 6 depends on this work for stronger type-checking and CI.

### Acceptance criteria
- Web auth, profile loading, onboarding flags, and session behavior come from one path only.
- Routes are grouped by persona and no longer wrap every page manually.
- Active web code no longer depends on excluded legacy directories for core behavior.

## Agent 3 - Firebase / Security / Deploy Safety

### Mission
Remove the current production and security hazards so local work, staging, and production are separated and the app stops leaking credentials or overexposing data.

### Primary files
- `functions/src/index.ts`
- `src/lib/firebaseApp.ts`
- `utils/firebase.ts`
- `storage.rules`
- `firestore.rules`
- calendar connection files under `src/` and `functions/`
- Firebase config files in repo root

### Work packages
1. Secret hygiene:
   - remove committed third-party keys from source
   - move secrets to env, Functions config, or Secret Manager
   - rotate any leaked keys immediately
2. Environment hardening:
   - remove silent production fallback config
   - fail fast when required env is missing
   - add explicit staging versus production project settings
3. Rules hardening:
   - restrict storage access by actual therapist-client relationship
   - tighten invitation reads
   - align file access with Firestore ownership rules
4. Invite and account provisioning hardening:
   - replace clear-text password persistence with one-time invite setup
   - validate onboarding/account creation server-side
5. Deployment safety:
   - parameterize Functions base URLs
   - add project-target sanity checks before deploys
   - document staging and production deploy flow

### Dependencies
- This plan should start first because other agents depend on safe auth and environment behavior.

### Acceptance criteria
- No live secrets remain committed in app or functions code.
- Local and staging builds cannot accidentally point to production by omission.
- Therapist-client access rules are explicit and regression-tested.
- Invite and account setup no longer rely on persisted passwords.

## Agent 4 - Performance / Bundle Strategy / Web Bootstrap

### Mission
Make the web app cheaper to load and easier to scale by shrinking the startup path, reducing heavy shared chunks, and removing unnecessary native-era baggage.

### Primary files
- `package.json`
- `vite.config.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/hooks/useAuth.ts`
- `src/components/motion/`
- `src/components/charts/`
- `src/lib/firebaseDb.ts`
- `src/pages/Notes.tsx`

### Work packages
1. Split the bootstrap path:
   - defer auth SDK loading
   - keep public/login shells minimal
   - avoid mounting heavy shell code before authenticated routes
2. Reduce motion cost:
   - remove global motion wrappers where CSS can handle the job
   - lazy-load only the premium animated components that truly matter
3. Consolidate charting:
   - choose one web-first chart stack
   - remove overlapping chart and rendering libraries
   - load charts per route, not as broad shared chunks
4. Clean Firestore loading:
   - standardize on Lite reads where possible
   - dynamically load the full SDK only for write-heavy or editor-heavy flows
5. Shrink dependency sprawl:
   - identify Expo and React Native dependencies that are no longer needed for the web build
   - move legacy-only dependencies behind the parked native path or remove them
6. Rework manual chunk strategy to match route groups instead of one large therapist bucket.

### Dependencies
- Agent 2 should first define the route/layout split so code splitting aligns with real app boundaries.
- Coordinate with Agent 1 before removing motion used for key shell interactions.

### Acceptance criteria
- Logged-out and light client flows avoid downloading therapist, motion, and full Firestore code unnecessarily.
- Chart-heavy paths load their own bundles lazily.
- The default web build no longer resolves broad native-era dependencies without a reason.

## Agent 5 - Product Workflow / Client-Therapist Glue

### Mission
Fix the broken and incomplete core therapy workflows so client and therapist actions connect cleanly end to end.

### Primary files
- `src/pages/Notes.tsx`
- `src/pages/Checkin.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/onboarding/ClientOnboarding.tsx`
- `src/pages/therapist/TherapistClients.tsx`
- `src/pages/therapist/TherapistTemplates.tsx`
- `src/pages/therapist/TherapistDashboard.tsx`

### Work packages
1. Repair the diary flow first:
   - fix the undefined Firestore client usage in `Notes`
   - keep success feedback consistent with the rest of the app
   - improve the editor flow only after save/update/delete are stable
2. Rework check-in flow:
   - support morning and evening slot visibility properly
   - reduce friction for quick check-ins
   - preserve the right home-screen CTA state after completion
3. Expand onboarding and first-use guidance:
   - explain tasks, exercises, resources, and scheduling
   - make fallback states useful when a target is missing
4. Fix therapist-client setup flow:
   - replace password-based client creation with invite-based setup
   - surface onboarding, calendar, and setup status in therapist client views
5. Connect therapist actions to client outcomes:
   - allow explicit exercise assignment
   - confirm that assigned work appears under client offene Aufgaben
   - add toasts and visible status feedback on both sides
6. Improve appointment and calendar empty states so clients always know what to do next.

### Dependencies
- Agent 3 must secure the invite/account provisioning path first.
- Agent 1 should stabilize shell/navigation before major onboarding polish lands.

### Acceptance criteria
- Diary, check-in, onboarding, and therapist assignment flows all complete without dead ends.
- Therapist actions create visible downstream results in the client experience.
- Setup and calendar status are visible instead of implicit.

## Agent 6 - Quality / Tooling / Regression Safety

### Mission
Give the project enough automated confidence that we can keep shipping web-first changes without rediscovering the same regressions.

### Primary files
- `package.json`
- `tests/`
- `tsconfig.json`
- root scripts and docs
- CI configuration to be added

### Work packages
1. Introduce baseline code quality tooling:
   - lint command
   - formatting command or documented formatter standard
   - consistent script names for build, test, and verification
2. Convert the current ad-hoc screenshot scripts into real Playwright smoke tests:
   - login
   - client dashboard
   - therapist dashboard
   - check-in
   - notes
3. Add a lightweight CI pipeline:
   - install
   - lint
   - type-check
   - module tests
   - key Playwright smoke tests
4. Tighten type coverage for the active web path after Agent 2 ports the last shared logic into `src/`.
5. Create repo hygiene rules:
   - document legacy frozen paths
   - keep screenshots and generated artifacts out of the repo root
   - consolidate duplicate utility scripts

### Dependencies
- Agent 2 must finish the active code-path boundary work before final type coverage enforcement.
- Agent 1 and Agent 5 should provide the core smoke scenarios that must remain stable.

### Acceptance criteria
- We can run one command or CI workflow and learn whether the main web product still works.
- Playwright covers the most business-critical authenticated flows.
- The active web code path is type-checked and easier to change safely.

## Recommended start sequence

Start implementation planning in this order:

1. Agent 3
2. Agent 2
3. Agent 5
4. Agent 1
5. Agent 4
6. Agent 6

That order gets the riskiest production issues under control first, fixes the broken client flow early, and only then spends time on broader polish and tooling hardening.
