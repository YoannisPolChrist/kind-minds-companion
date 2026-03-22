# GitHub benchmark and adoption plan

Verified on 2026-03-12 against the current Expo + Firebase + Expo Router architecture in this repository.

## Comparison matrix

| repo | license | maintenance_status | stack_match | best_fit_area | adoptability | risk | current_app_mapping | recommended_action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `wataru-maeda/react-native-boilerplate` | MIT | active | strong | foundation, data | high | low | auth-session, notifications, offline-cache | foundation: adopt pattern; data: borrow structure; clinical-workflow: reject |
| `roninoss/create-expo-stack` | MIT | active | strong | foundation, data | high | low | auth-session, offline-cache | foundation: adopt pattern; data: borrow structure; clinical-workflow: reject |
| `margelo/react-native-nitro-sqlite` | MIT | active | medium | data | high | medium | checkins, history, resources, offline-cache | foundation: reject; data: adopt pattern; clinical-workflow: reject |
| `instamobile/react-native-firebase` | MIT | moderate | medium | foundation, data | medium | medium | notifications, auth-session, resources | foundation: borrow structure; data: borrow structure; clinical-workflow: reject |
| `hppanpaliya/MindfulMe` | MIT | stale | low | clinical-workflow, reference-only | low | medium | checkins, history, resources, templates | foundation: reject; data: reject; clinical-workflow: borrow UX only |
| `leokhoa/nomie` | NONE | stale | low | clinical-workflow, reference-only | reference-only | high | checkins, history | foundation: reject; data: reject; clinical-workflow: reject |
| `nandorojo/expo-firestore-offline-persistence` | MIT | deprecated | medium | reference-only, data | reference-only | high | offline-cache, checkins, history | foundation: reject; data: reject; clinical-workflow: reject |
| `barthap/with-rn-firebase` | NONE | deprecated | medium | reference-only, foundation | reference-only | high | auth-session, notifications | foundation: reject; data: reject; clinical-workflow: reject |

## Ranked shortlist

1. `wataru-maeda/react-native-boilerplate`
   - Best direct stack match for app-shell hardening, Expo Router conventions, CI shape, and environment handling.
2. `roninoss/create-expo-stack`
   - Best reference for up-to-date Expo/Firebase setup decisions and scaffold-time dependency choices.
3. `margelo/react-native-nitro-sqlite`
   - Best route to a stronger offline read layer for `checkins`, `history`, `resources`, and `modules/shared`.
4. `instamobile/react-native-firebase`
   - Good Firebase auth, Firestore, and push-notification patterns, but should stay at structure level because the app shell is older.
5. `hppanpaliya/MindfulMe`
   - Keep only as a UX grouping reference for mental-health workflows and dashboard packaging.

## Excluded repos

- `leokhoa/nomie`
  - Rejected because GitHub metadata does not expose a clear MIT/Apache license and the repository is very stale.
- `nandorojo/expo-firestore-offline-persistence`
  - Rejected because the README says the repository is no longer maintained.
- `barthap/with-rn-firebase`
  - Rejected because the README marks it as deprecated and the repository metadata does not expose a clear MIT/Apache license.

## Track recommendations

### Foundation

- Adopt patterns from `wataru-maeda/react-native-boilerplate` for environment handling, test shape, and deployment guardrails.
- Adopt setup conventions from `roninoss/create-expo-stack` for current Expo/Firebase defaults and generator-grade dependency choices.
- Borrow Firebase structure only from `instamobile/react-native-firebase`; do not mirror its older navigation model.
- Reject foundation adoption for the remaining repos.

### Data

- Adopt a local repository/cache pattern inspired by `margelo/react-native-nitro-sqlite` for cold-start reads in `checkins`, `history`, and `resources`.
- Borrow data-boundary structure from `wataru-maeda/react-native-boilerplate` and `roninoss/create-expo-stack`.
- Borrow Firebase persistence shape from `instamobile/react-native-firebase` where it fits the existing Firestore services.
- Reject data adoption for Nomie and the deprecated Expo/Firebase helper repos.

### Clinical workflow

- Keep `MindfulMe` as UX-only inspiration for mental well-being grouping and screen packaging.
- Reject direct clinical-workflow adoption from the remaining repos because they either focus on infrastructure or fail license/maintenance requirements.

## 90-day adoption order

### Days 1-30

- Run the offline/read cache spike first.
- Target modules: `modules/checkins`, `modules/history`, `modules/resources`, `modules/shared`.
- Main references: `margelo/react-native-nitro-sqlite`, `wataru-maeda/react-native-boilerplate`.

### Days 31-60

- Run the notification and inbox consistency spike next.
- Target modules: `functions`, `app/(app)`, `modules/checkins`, `modules/resources`, `services`.
- Main references: `instamobile/react-native-firebase`, `hppanpaliya/MindfulMe`.

### Days 61-90

- Run the app-shell hardening spike last so it can absorb lessons from the first two spikes.
- Target modules: `app`, `src`, `functions`, `tests`, `utils`.
- Main references: `wataru-maeda/react-native-boilerplate`, `roninoss/create-expo-stack`, `instamobile/react-native-firebase`.

## Implementation spikes

### 1. Offline/read cache spike

- Goal: prove cold-start reads for `checkins` and `history` without network, then extend the same repository/cache boundary to `resources`.
- Acceptance:
  - cold-start reads succeed for `checkins` and `history`
  - `resources` reuses the same invalidation shape
  - current Vite web build remains green

### 2. Notification and inbox consistency spike

- Goal: make one notification event land consistently in app inbox state plus its fallback delivery channel.
- Acceptance:
  - one event produces the expected in-app inbox record
  - fallback path resolves to push or email correctly
  - deep links keep `therapieprozessunterstuetzung.web.app` as canonical target

### 3. App-shell hardening spike

- Goal: harden config, testability, and Expo/Firebase ergonomics without changing the product direction.
- Acceptance:
  - environment handling is explicit across local, preview, and production flows
  - Firebase deploy flow stays intact
  - shared test-harness patterns become reusable for module tests

## Source links

- [wataru-maeda/react-native-boilerplate](https://github.com/wataru-maeda/react-native-boilerplate)
- [roninoss/create-expo-stack](https://github.com/roninoss/create-expo-stack)
- [instamobile/react-native-firebase](https://github.com/instamobile/react-native-firebase)
- [margelo/react-native-nitro-sqlite](https://github.com/margelo/react-native-nitro-sqlite)
- [leokhoa/nomie](https://github.com/leokhoa/nomie)
- [hppanpaliya/MindfulMe](https://github.com/hppanpaliya/MindfulMe)
- [nandorojo/expo-firestore-offline-persistence](https://github.com/nandorojo/expo-firestore-offline-persistence)
- [barthap/with-rn-firebase](https://github.com/barthap/with-rn-firebase)
