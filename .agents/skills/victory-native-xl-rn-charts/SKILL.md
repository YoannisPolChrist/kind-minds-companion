---
name: victory-native-xl-rn-charts
description: Analyze, migrate, and implement React Native charts in this project with FormidableLabs victory-native-xl (published as `victory-native`). Use when replacing `react-native-chart-kit` or manual `react-native-svg` charts on iOS/Android, wiring Skia/Reanimated/Gesture Handler, or mapping exercise and dashboard chart UIs to `CartesianChart`, `PolarChart`, `Pie`, `Line`, `Bar`, or `useChartPressState`.
---

# Victory Native XL RN Charts

Use `victory-native` as the native chart engine in this repo. Keep the web implementation on `@nivo/*` unless there is a strong reason to unify platforms.

Read [references/migration-notes.md](references/migration-notes.md) before touching chart code. It contains the repo analysis, dependency setup, and project-specific migration targets.

## Workflow

1. Confirm whether the target is native-only or shared web/native.
2. For native work, prefer `victory-native` primitives over `react-native-chart-kit`.
3. Use:
   - `CartesianChart` for line and bar charts
   - `PolarChart` with `Pie.Chart` for pie or donut charts
   - `useChartPressState` only when a tooltip or scrub interaction is required
4. Wrap charts in a fixed-height `View`; do not rely on intrinsic height.
5. Add or preserve peer setup:
   - `@shopify/react-native-skia`
   - `react-native-gesture-handler`
   - `react-native-reanimated`
   - `react-native-reanimated/plugin` in Babel
   - `react-native-gesture-handler` imported before `expo-router/entry`
6. Preserve existing form/input behavior first. Treat chart rendering as the migration unit.

## Project rules

- Start with [components/charts/InteractiveChart.native.tsx](components/charts/InteractiveChart.native.tsx) for exercise-block work.
- Treat [components/dashboard/MoodChart.tsx](components/dashboard/MoodChart.tsx) as a second-wave migration target.
- Leave web chart rendering in [components/charts/InteractiveChart.web.tsx](components/charts/InteractiveChart.web.tsx) on `@nivo/*` unless the task explicitly asks for parity.
- Keep `spider_chart` on the legacy implementation unless you are intentionally designing a custom polar/radar renderer.

## Implementation patterns

- For simple native line charts, combine `Line` with `Scatter`.
- For bar charts, remember `chartBounds` and `domainPadding`.
- For pie or donut charts, prefer `PolarChart` + `Pie.Chart` and pass `labelKey`, `valueKey`, and `colorKey`.
- Add axes only when needed; they require a Skia font object.

## Validation

- Run the skill validator after edits.
- Run TypeScript or the smallest relevant verification command after chart migrations.
