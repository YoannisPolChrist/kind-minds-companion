# Web-first workspace

- `src/` is the active product surface for the therapy companion.
- `app/` stays in the repository as a parked Expo/native path while the web experience is consolidated.
- New browser-facing UI work should live in `src/` and avoid introducing new `expo` or `react-native` dependencies into the web path unless there is no practical browser-native option.
- User-facing copy should remain valid UTF-8. Do not normalize intended German UI text or emojis to ASCII fallbacks like `ae`, `oe`, `ue`, or placeholder symbols.
- Web scripts in `package.json` are the default developer entry points: `npm run start`, `npm run dev`, `npm run build`, `npm run preview`.
- Legacy Expo scripts remain available as parked workflows: `npm run legacy:expo`, `npm run legacy:expo:android`, `npm run legacy:expo:web`.
