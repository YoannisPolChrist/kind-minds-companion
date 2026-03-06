# Victory Native XL Notes

## Repo highlights

- The GitHub repo `victory-native-xl` is the source monorepo; the published package name is still `victory-native`.
- Core code lives in `lib/src/`.
- The most useful examples live in `example/app/`.
- The docs worth reading first are:
  - `website/docs/getting-started.mdx`
  - `website/docs/cartesian/chart-gestures.mdx`
  - `website/docs/cartesian/guides/basic-bar-chart.md`
  - `website/docs/polar/pie/pie-charts.md`

## Required runtime setup

- Install peer dependencies:
  - `@shopify/react-native-skia`
  - `react-native-gesture-handler`
  - `react-native-reanimated`
- Keep `react-native-reanimated/plugin` in `babel.config.js`.
- Import `react-native-gesture-handler` before `expo-router/entry` in `index.js`.

## API mapping for this app

- `react-native-chart-kit` line or bar charts -> `CartesianChart`
- `react-native-chart-kit` pie charts -> `PolarChart` + `Pie.Chart`
- Tooltip/press interactions -> `useChartPressState`
- Zoom and pan -> `useChartTransformState`
- Web charts can stay on `@nivo/*`; do not force a cross-platform abstraction if the web implementation is already good.

## Project-specific targets

- `components/charts/InteractiveChart.native.tsx`
  - Best first migration target for exercise block charts.
  - Current block types:
    - `bar_chart`
    - `pie_chart`
    - `line_chart`
    - `spider_chart`
- `components/dashboard/MoodChart.tsx`
  - Good candidate for a later line-chart migration if native SVG maintenance becomes painful.
- `components/therapist/ExerciseBuilder.tsx`
  - Still uses `react-native-chart-kit` previews; migrate only if the block renderer is stable.

## Practical guidance

- Prefer a fixed-height wrapper `View` around `CartesianChart` or `PolarChart`.
- Start without axes unless labels materially improve the screen. Axes require a Skia font object.
- Use `domainPadding` on bar charts, otherwise edge bars get clipped.
- Keep radar/spider charts on the old implementation unless you are ready to design a custom polar solution; there is no direct radar replacement in the repo examples comparable to the current web `@nivo/radar` usage.
- When migrating, preserve the input/editing UX first and treat the chart renderer as replaceable.
