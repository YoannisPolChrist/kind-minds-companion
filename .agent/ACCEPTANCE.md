# Acceptance Sign-Off - Prozesskompass

## Verification Checklists

### Code Changes
- [x] Database rules declared and secure.
- [x] Routing mapped correctly for both direct links and selection list.
- [x] Sidebar link added with proper icon and translation keys.
- [x] Complete interactive canvas page built with standard toolbars, connectors, and parameters inspector.

### Build Check
- [x] Production build running `npm run build` compiled successfully without type errors or bundler issues.

## 2026-05-22 - Prozesskompass Check-in Insight Integration

### Supervisor Review
- [x] Compared the requested scope with the current Prozesskompass board: preserved the whiteboard canvas, draggable tiles, palette, connectors, inspector, and client/therapist routes.
- [x] Added deterministic Check-in insight tiles instead of AI-based analysis, using existing mood, energy, note, and date fields.
- [x] Applied the warmer process-compass visual language to the board shell without replacing the existing board model.

### Verification
- [x] `npm run build` completed successfully.
- [x] `npm run test:modules` completed successfully with 59 passing tests.
- [x] Local route smoke check completed without browser console errors; authenticated board rendering still requires a real logged-in Firebase session.

## 2026-05-22 - Prozesskompass Board Data Expansion

### Supervisor Review
- [x] Preserved Gemini/current board work in `Prozesskompass.tsx` and `ClientProzesskompass.tsx`; changes are additive through the shared insight component plus prop wiring.
- [x] Expanded the insight strip to combine Check-in data with live board data: completion rate, open process tiles, exercises, tasks, answered reflections, anamnesis count, and frequent Check-in tags.
- [x] Kept the deterministic/no-AI interpretation model intact.

### Verification
- [x] `npm run build` completed successfully.
- [x] `npm run test:modules` completed successfully with 59 passing tests.
- [x] Website `npm run build` completed and synced the updated Companion app into `dist/Prozessbegleitung`.

## 2026-05-22 - Structured Anamnesis Baseline

### Supervisor Review
- [x] Added a structured baseline panel that detects likely anamnesis/intake resources by file title/original name and lets the therapist store start values in the existing `process_boards` document.
- [x] Kept the design deterministic and privacy-conscious: no AI content extraction, no automatic diagnosis, no new Firestore collection or rules.
- [x] Client view reads the saved baseline and can see the start context without edit permissions.
- [x] Insight tiles now compare baseline energy with current Check-in energy when both values exist.

### Verification
- [x] `npm run build` completed successfully.
- [x] `npm run test:modules` completed successfully with 59 passing tests.
- [x] Website `npm run build` completed and synced the updated Companion app into `dist/Prozessbegleitung`.

## 2026-05-22 - Structured Anamnesis JSON Bridge

### Supervisor Review
- [x] Companion baseline import now accepts the structured JSON exported by the website Anamnese form and maps the known field names directly.
- [x] Mapped `ziel`, `current_resource`, `next_need`, and the eight process scale fields into the Prozesskompass baseline.
- [x] Kept the flow deterministic and local to the therapist action: JSON import fills and saves baseline values without AI parsing.

### Verification
- [x] `npm run build` completed successfully.
- [x] `npm run test:modules` completed successfully with 59 passing tests.
- [x] Website `npm run test` completed successfully with 23 passing tests.
- [x] Website `npm run build` completed and synced the updated Companion app into `dist/Prozessbegleitung`.

## 2026-05-22 - Prozesskompass Enhancements (Resize, Borders, and Inline Editors)

### Supervisor Review
- [x] Added dynamic canvas layout math (`getNodeDimensions`, `getNodeCenter`, `getNodeRadius`) to support fully resizable whiteboard nodes.
- [x] Implemented bottom-right resizing handles for selected nodes, enforcing a clean **10px grid snap** and **min-w: 120px, min-h: 80px** bounds. Persisted in Firestore.
- [x] Added a visual Border Customizer to the Therapist's Inspector Sidebar with style, thickness, and color picker tools. Inline border attributes are rendered on the canvas and synced live to the client companion board.
- [x] Built premium full-screen glassmorphic Inline Module Editors for Exercises, Tasks, and Reflections, with complete layout and Firestore collection syncing.
- [x] Verified and deployed the compiled application successfully.

### Verification
- [x] Production build `npm run build` completed successfully in 19.04s.
- [x] Firebase deployment `npx firebase deploy` succeeded perfectly for hosting configurations, static compiled bundles, and secure Firestore collection rules.

## 2026-05-22 - Prozesskompass Canvas Visual Previews & Chronological Timeline Chaining

### Supervisor Review
- [x] Integrated `baseline`, `clientNotes`, `clientTasks`, and `clientReflections` data states and handlers to `<ProcessCanvas />` for both Therapist and Client views.
- [x] Implemented chronological auto-placement and auto-chaining (`handleGenerateTimeline` in `useProcessData.ts`) compiling all events (Anamnese, tasks, notes, check-ins, sessions), sorting them, oscillating Y coordinates (organic wave), grid-snapping, and chaining them sequentially.
- [x] Placed bottom-left glassmorphic toolbar with hover and fade effects to toggle specific categories (Termine, Tagebuch, Aufgaben, Übungen) and automatically hide their connections.
- [x] Rendered custom premium visual cards for Anamnese (goals, resources capsules, and metrics progress tracking), Journal (Tagebuch lined background, left red margin, serif font, excerpt), Appointment (emerald header calendar sheet), and Task (checklist checkbox with instant Firestore sync, due dates, overdue badges).

### Verification
- [x] Production build `npm run build` completed successfully in 41.46s with zero TypeScript/Vite compilation errors.

## 2026-05-22 - Prozesskompass Whiteboard Post-it Note Redesign

### Supervisor Review
- [x] Verified that standard cards render as uniform `120x120px` squares/circles with pastel themes and thin borders.
- [x] Confirmed that resizable handle drag is disabled on standard cards (and enabled only on custom shapes) to protect post-it note proportions.
- [x] Verified check-in cards now display mood emojis, notes, and mood/energy level sliders formatted beautifully inside the compact card constraints.
- [x] Confirmed overlap check collision solver (`findFreePosition`) uses `140px` clearance grid logic to ensure nodes do not overlap when adding them or syncing check-ins.
- [x] Verified connection lines and arrow markers use thin (`1.5px`) solid black (`#1A1A1A`) strokes.

### Verification
- [x] Production build `npm run build` completed successfully.
- [x] Firebase deployment `npx firebase deploy --only hosting` succeeded, and files are synced/published to production.

## 2026-05-29 - Whiteboard Snapshots, Multi-Deletion Warning Modal, Shift-Marquee, and Email Notification Toggle

### Supervisor Review
- [x] **High-Fidelity Visual Card Snapshots**: Completely redesigned visual canvas cards to look like gorgeous, live miniature snapshots reflecting their content in detail:
  - **Appointment**: Ring-binder notebook page with silver spiral rings, binder holes, bold day number, month label, and styled time stamp pill.
  - **Note**: Yellow textured sticky post-it note with a silver paperclip, writing lines, serif handwriting font, and a folded bottom-right page corner.
  - **Task**: Checklist card displaying title, description, and status check bubbles (with strike-through line on completion) and due date alarms.
  - **Reflection**: Conversation speech-bubble thread showcasing therapist prompts and client responses side-by-side.
  - **Anamnese**: Miniature dashboard displaying energy, regulation, and resilience metrics as beautiful multi-color gradient progress bars.
- [x] **Premium Deletion Confirmation Modal**: Built a premium glassmorphic warning modal with pulsating icons, listing the titles of all selected cards as badges, and intercepting keyboard deletion events as well as inspector actions.
- [x] **Email Notification Toggle**: Integrated a premium toggle inside the Inspector sidebar to trigger client notifications, writing directly to Firestore's `notifications` collection to prompt the Resend email function.
- [x] **Unified Modal Close Button**: Added a standard close `X` button in the top-right corner of all exercise modal views using `z-[110]` to float cleanly above high-z-index interactive content.
- [x] **Shift-Marquee Selection vs Panning**: Disentangled canvas interactions. Left-clicking and dragging empty canvas now pans by default, and holding `Shift` while dragging draws the marquee selection rectangle. Added an instructional badge above zoom controls.

### Verification
- [x] Production build `npm run build` compiled successfully in 39.47s with zero TypeScript/Vite errors.
- [x] All 59 unit modules tests (`npm run test:modules`) passed perfectly.
- [x] Clean synchronization script execution copied updated build artifacts to the website workspace.

