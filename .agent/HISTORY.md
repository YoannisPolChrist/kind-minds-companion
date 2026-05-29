# Change History - Prozesskompass

## 2026-05-21: Prozesskompass Feature Complete

Implemented the visual Prozesskompass (Process Compass) treatment pathway editor and navigation elements.

### Added Files
- [Prozesskompass.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/pages/therapist/Prozesskompass.tsx): Canvas editor featuring panning/zooming, SVG connection routing, multi-type interactive nodes (exercises, anamnesis, appointments, and custom shapes), properties inspector sidebar, automatic background Firestore persistence, and a global search/filter client list dashboard.

### Modified Files
- [firestore.rules](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/firestore.rules): Declared collection access rules for the `process_boards` collection.
- [RouterTree.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/RouterTree.tsx): Registered the two paths `/therapist/prozesskompass` and `/therapist/client/:id/prozesskompass` mapping to the editor.
- [shellConfig.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/components/layout/shellConfig.tsx): Incorporated "Prozesskompass" to the primary navigation bar list for therapists.
- [ClientDetail.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/pages/therapist/ClientDetail.tsx): Added a quick link card to open the client's compass board directly.

## 2026-05-22: Drag-to-Resize, Border Customizer, Inline Module Editors, and Firebase Deployment

Implemented drag-to-resize canvas nodes, dynamic board boundaries, CSS border customization, interactive fullscreen inline block-catalogue editors for Exercises/Tasks/Reflections, and deployed to production.

### Added Files
- [ClientProzesskompass.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/pages/ClientProzesskompass.tsx): Client visual board with dynamic bounds, resizing matching visual math, and customized inline borders.

### Modified Files
- [Prozesskompass.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/pages/therapist/Prozesskompass.tsx): Refactored dimension models, added bottom-right drag-resize anchors with 10px snap, custom border inputs in inspector (style, width, colors), dynamic border inline styling, and full-screen inline editors for Exercises, Tasks, and Reflections.
- [firestore.rules](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/firestore.rules): Configured collection access rules for two new collections: `client_tasks` and `client_reflections` to enable therapists/clients to write live inline updates.

## 2026-05-22: Prozesskompass Canvas Visual Previews & Chronological Timeline Chaining

Implemented chronological timeline chaining engine, bottom-left glassmorphic category filter toolbar, premium visual card designs (Anamnese metrics, Retro notepad journals, Emerald calendar appointments, interactive task checklists), and direct Firestore syncing.

### Modified Files
- [TherapistProzesskompass.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/process/TherapistProzesskompass.tsx): Added the "Zeitstrahl generieren" action button in the header and wired data states/toggle handlers to `<ProcessCanvas />`.
- [ClientProzesskompass.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/process/ClientProzesskompass.tsx): Added states and fetched client journal notes from Firestore, and passed them down with the baseline and task toggle callback to `<ProcessCanvas />`.

## 2026-05-22: Prozesskompass Whiteboard Post-it Note Redesign

Implemented a realistic physical whiteboard feeling for the Process Compass canvas, styling standard cards as small pastel post-it notes, streamlining overlap and collision spacing, and updating check-in nodes.

### Modified Files
- [ProcessCanvas.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/process/ProcessCanvas.tsx):
  - Standardized standard node styling with post-it aesthetic (uniform `120x120px` bounds, soft pastel colors, thin borders, disabled resize handles except for custom shapes).
  - Added a custom `checkin` node renderer showing mood emojis, notes, and mood/energy level sliders compact enough to fit the `120x120px` card.
  - Standardized SVG connection lines to thin solid black (`#1A1A1A`) arrows.
- [useProcessData.ts](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/process/useProcessData.ts):
  - Enforced `120x120px` size writes to Firestore and timeline generation.
  - Modified the collision solver (`findFreePosition`) to check occupancy in a `140px` clearance grid to perfectly accommodate `120px` card spacing and prevent overlays.
  - Adjusted timeline auto-chaining spacing to `180px` horizontally and wave heights to make cards cohesive.
- [types.ts](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/process/types.ts): Registered `checkin` as a valid node type.

## 2026-05-29: Whiteboard Snapshots, Deletion Modal, Shift-Marquee, and Notification Toggle

Implemented dynamic high-fidelity card snapshots representing true contents, a premium deletion confirmation modal, canvas interaction segregation (Standard pan vs. Shift-marquee), email notification toggle, and a z-index protected unified close button.

### Modified Files
- [ProcessCanvas.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/process/ProcessCanvas.tsx):
  - Redesigned visual card templates into high-fidelity snapshots: spiral-bound appointments, handwriting textured yellow note post-its, checklist tasks, messaging speech-bubble reflections, and color gradient anamnese baseline scales.
  - Implemented canvas standard panning on left-drag and marquee selection drawing on Shift + left-drag.
  - Added visual instruction badge above zoom buttons to guide user.
- [TherapistProzesskompass.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/process/TherapistProzesskompass.tsx):
  - Added a premium confirmation modal for card/connection deletion.
  - Intercepted delete/backspace keys and inspector sidebar actions to trigger the modal.
- [ProcessInspector.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/process/ProcessInspector.tsx):
  - Added client email notification toggle switch which calls the Firestore-writing callback.
- [NodeContentModal.tsx](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/process/NodeContentModal.tsx):
  - Equipped all modal views (including interactive full-screen exercises) with a high z-index (`z-[110]`) unified `X` close button to ensure escape action is never obscured.
- [useProcessData.ts](file:///C:/Users/psjoh/Desktop/Personal/Coding/Apps/kind-minds-companion-main/src/process/useProcessData.ts):
  - Implemented the trigger notification callback mapping database document creation to the `notifications` Firestore collection.

