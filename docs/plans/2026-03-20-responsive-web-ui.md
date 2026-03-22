# Responsive Web UI Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the authenticated web app in line with the web-first spec by widening page containers, improving grid breakpoints, fixing hero action rows/Settings layout, and restoring readable UTF-8 strings on the Check-in screen.

**Architecture:** Factor shared layout primitives (`PageContainer`, optional `HeroHeaderActions`) so every page relies on the same width and spacing rules, update Tailwind grid classes where data density is lacking, and source emotion metadata from the existing `constants/emotions` module to remove duplicated mojibake arrays.

**Tech Stack:** Vite + React + TypeScript, TailwindCSS, Framer Motion.

---

### Task 1: Align all authenticated page containers with the AppShell width

**Files:**
- Create: `src/shared/layout/PageContainer.tsx`
- Modify: `src/pages/Dashboard.tsx:291`, `src/pages/Checkin.tsx:204`, `src/pages/Notes.tsx:464`, `src/pages/ExercisesOverview.tsx:499`, `src/pages/Resources.tsx:292`, `src/pages/Settings.tsx:191`, `src/pages/History.tsx` (audit others with legacy wrappers)
- Test: `npm run lint`, manual viewport spot-check at 390/768/1024/1440

**Step 1: Scaffold shared container**

```tsx
// src/shared/layout/PageContainer.tsx
import type { ReactNode } from "react";
import clsx from "clsx";

export function PageContainer({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx("mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10", className)}>
      {children}
    </div>
  );
}
```

**Step 2: Replace ad-hoc wrappers**

- Swap every `div` using `mx-auto max-w-5xl/max-w-6xl ...` with `<PageContainer>` so hero sections, grids, and headers align with the shell.
- Ensure gradient headers wrap an inner `<PageContainer className="pt-12 pb-6">` instead of duplicating padding logic.

**Step 3: Verify spacing**

Run `npm run lint` and use responsive devtools to confirm header + body columns line up at 390/768/1024/1440 with no new horizontal scroll.

---

### Task 2: Update Resources/Exercises grids for md/lg/xl breakpoints

**Files:**
- Modify: `src/pages/Resources.tsx:292-334`, `src/pages/ExercisesOverview.tsx:499-681`, `src/components/motion/FloatingEmoji.tsx` (if card widths need tightening)
- Test: `npm run lint`, responsive manual checks (focus 768 & 1024 widths)

**Step 1: Resources layout**

- Adjust the list container to `grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- Reduce `max-w` padding if necessary via the new `PageContainer`.
- Keep skeleton/empty states in sync with new grid classes.

**Step 2: Exercises layout**

- Update the results grid to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, lowering card padding if cards become too tall.
- Ensure filter tabs/search stay inside `PageContainer` so they stretch with the wider viewport.

**Step 3: Visual regression sweep**

- Reload both pages at 390/768/1024/1440; confirm cards fill available columns without clipping shadows or text.
- Capture before/after screenshots if needed for design review.

---

### Task 3: Fix hero action row wrapping and Settings dual-column layout

**Files:**
- Modify: `src/pages/Notes.tsx:468-476`, `src/pages/Resources.tsx:281-288`, `src/pages/Settings.tsx:202-387`
- Optional shared helper: extend `src/shared/layout/PageContainer.tsx` or add `HeroHeaderActions` component if reuse emerges.
- Test: `npm run lint`, resize tests at 390/768.

**Step 1: Hero action rows**

- Wrap hero CTAs (`Zurück`, “Neue Notiz”, etc.) in a flex container that uses `flex-wrap`, `gap-3`, and `sm:flex-nowrap`.
- On mobile, stack buttons using `flex-col` or `grid` to prevent overlap; on ≥640 px retain horizontal layout.
- Consider extracting a small `HeroActionRow` helper if both Notes and Resources share identical markup.

**Step 2: Settings layout**

- Promote hero grid and main content grid to `lg:grid-cols-*` so ≥1024 px shows dual columns before the existing `xl` rules.
- Keep sticky sidebar behaviors by using `lg:sticky lg:top-24` on the nav card.
- Verify buttons and cards keep adequate spacing once wrapped in `PageContainer`.

**Step 3: Regression pass**

- On 390 px ensure hero CTAs now wrap gracefully and Settings stack vertically without overflow.
- On 1024 px confirm Settings shows two columns (profile/calendar + nav rail) as intended.

---

### Task 4: Replace mojibake/emojis in Check-in with UTF-8 strings

**Files:**
- Modify: `src/pages/Checkin.tsx:24-190`, `src/pages/Checkin.tsx:370-386`
- Reference: `constants/emotions.ts` (consider reusing exported presets)
- Test: `npm run lint`, manual Check-in run verifying emoji render

**Step 1: Reuse canonical emotion presets**

- Import `EMOTION_PRESETS` (and helpers) from `constants/emotions` if possible; otherwise rebuild the local array with real UTF-8 emoji literals and German strings.
- Ensure the data structure still matches component expectations (`id`, `score`, `emoji`, `color`, `label`).

**Step 2: Fix prompt copy**

- Replace mojibake strings such as `âœï¸` with actual characters (`✏️`), and convert any `ae/oe/ue` placeholders back to umlauts if localization allows.
- Keep Tailwind-safe text (`tracking`, uppercase) consistent.

**Step 3: Manual verification**

- Reload the Check-in page, pick multiple emotions, and confirm emoji render correctly.
- Save a Check-in to ensure Firestore payload still serializes.

---

**Suggested Sequencing**
1. Task 1 (shared container) – unblock every other layout tweak.
2. Task 2 (grid density) – benefits from the widened container.
3. Task 3 (hero/Settings) – builds on the new layout primitives.
4. Task 4 (Check-in text) – independent; run in parallel if desired.

Shared components introduced: `PageContainer` (mandatory) and optional `HeroActionRow` if hero CTAs converge. Both live under `src/shared/layout`.
