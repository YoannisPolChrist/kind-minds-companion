---
name: three-js-expo-3d
description: Plan and implement `three.js`-based 3D or immersive visuals for this Expo/React Native app. Use when a task truly benefits from 3D scenes, particle systems, breathing or meditation visuals, spatial storytelling, or web/native canvas experiences. Do not use for ordinary UI, forms, lists, or 2D charts already better served by the existing stack.
---

# Three.js Expo 3D

Use this skill when a feature in this repo needs real 3D rendering, spatial motion, or a canvas-driven visual effect that would be awkward or brittle in plain React Native views, SVG, or Skia.

Read [references/three-js-integration.md](references/three-js-integration.md) before adding dependencies or proposing a scene architecture.

## Decision Rule

1. Confirm the user-facing reason for 3D.
2. Prefer the current stack first:
   - Standard UI: React Native views
   - Motion polish: Reanimated/Moti
   - 2D illustration or custom drawing: Skia/SVG
   - Charts: existing chart components, especially `victory-native`
3. Use `three.js` only when at least one of these is true:
   - The feature is explicitly a 3D scene or object
   - The experience needs depth, camera movement, or lighting
   - A breathing, grounding, or meditation exercise materially benefits from a spatial visual
   - A web landing, preview, or hero section needs an interactive 3D canvas
4. If 3D is justified, choose the thinnest viable integration:
   - Expo native: prefer `@react-three/fiber/native` over raw imperative `three.js`
   - Expo web: prefer `@react-three/fiber` over manual renderer plumbing
   - Drop to lower-level `three.js` APIs only when fiber abstractions block the task

## Project Guardrails

- Do not replace existing charts, forms, or document/media previews with `three.js`.
- Do not add 3D as decoration if a gradient, SVG, or Skia animation achieves the same outcome.
- Keep scenes isolated behind dedicated components; avoid leaking renderer state across screens.
- Lazy-load heavy 3D code paths and assets.
- Keep texture and model sizes small enough for mobile.
- Treat battery, thermal cost, and reduced-motion settings as first-class constraints.

## Implementation Workflow

1. Identify the target surface:
   - Full screen exercise
   - Embedded card or hero section
   - Web-only feature
2. Decide runtime:
   - If the experience must run on native, design for Expo-compatible WebGL/fiber first.
   - If it is web-only, keep the implementation web-scoped instead of forcing native parity.
3. Build a minimal proof of concept:
   - One scene
   - One camera
   - One interaction model
   - Placeholder geometry before loading external assets
4. Wire app state into the scene only after the visual loop works.
5. Add cleanup:
   - Unmount renderer cleanly
   - Cancel animation loops
   - Dispose of geometries, materials, and textures when relevant
6. Verify performance on the smallest supported device class before expanding scope.

## Good Fits In This Repo

- Calm breathing orb or particle field for a guided exercise
- Interactive 3D grounding or focus visualization
- Spatial stepper or therapy journey visual when 2D becomes unreadable
- Web showcase or immersive onboarding moment if specifically requested

## Bad Fits In This Repo

- Replacing ordinary metric cards or modals
- Rebuilding existing chart blocks as 3D
- Using 3D just to make a static screen look "cool"
- Heavy GL scenes inside scroll-heavy therapist CRUD views

## Dependency Guidance

- Prefer adding `three` together with `@react-three/fiber` or `@react-three/fiber/native`, not raw `three` alone, unless there is a clear reason.
- For Expo native, expect related setup such as `expo-gl` and asset loading support.
- Keep dependency additions scoped to the feature request; do not preinstall `three.js` speculatively.

## Output Expectations

When using this skill:

- State why `three.js` is warranted.
- Name the chosen runtime path: web, native, or both.
- Keep the first implementation small and reviewable.
- Add the smallest relevant verification step after changes.
