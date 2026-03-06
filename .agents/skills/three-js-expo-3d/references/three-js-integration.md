# Three.js Integration Notes

## Official Sources

- Repository: [mrdoob/three.js](https://github.com/mrdoob/three.js)
- Docs: [threejs.org/docs](https://threejs.org/docs/)
- Manual: [threejs.org/manual](https://threejs.org/manual/)
- Examples: [threejs.org/examples](https://threejs.org/examples/)

## What To Reuse From Three.js

- Scene graph, cameras, materials, lights, and render loop concepts
- Math primitives for 3D transforms
- Example patterns for particles, postprocessing, and interaction

For app work in this repo, prefer learning from the official docs and examples, then applying them through React-friendly bindings instead of hand-writing a renderer unless needed.

## Recommended Stack By Surface

### Expo Native

- `three`
- `@react-three/fiber/native`
- likely `expo-gl`
- optional asset helpers depending on textures/models

Use this path for true native 3D scenes. Keep the first version geometry-only until the render path is stable.

### Expo Web

- `three`
- `@react-three/fiber`

Use this path for web-only interactive hero sections, onboarding scenes, or rich previews.

## Project-Specific Guidance

- This repo already has strong 2D tooling: Reanimated, Moti, SVG, Skia, and chart components.
- `three.js` should be an escalation path, not a default.
- The best current candidates are immersive exercise visuals, especially breathing or grounding scenes.
- Therapist admin surfaces are usually poor candidates because clarity and speed matter more than 3D depth.

## Scene Design Heuristics

- Start with one mesh and one light.
- Prefer procedural primitives before loading models.
- Use subtle camera motion; avoid high-motion loops in therapeutic contexts.
- Respect reduced-motion preferences where possible.
- Keep transparent overlays and text outside the canvas when readability matters.

## Performance Checklist

- Cap geometry complexity.
- Compress textures and avoid unnecessary large PNGs.
- Avoid per-frame React state churn; keep animation in the render loop.
- Dispose resources on unmount if working below fiber abstractions.
- Test on low-end Android before expanding scope.

## When Not To Use Three.js

- The request is just for a nicer background
- The effect can be done with gradients, SVG, or Skia in under half the complexity
- The screen is primarily text, forms, or data entry
- The interaction needs high accessibility/readability above all else
