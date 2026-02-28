---
description: Automatischer Expo Build (EAS oder lokaler Export)
---

// turbo-all

Dieser Workflow startet den Build-Prozess für die App automatisch. Da `expo build` veraltet ist und durch EAS (Expo Application Services) ersetzt wurde, führt dieser Workflow standardmäßig einen lokalen Web-Export oder einen EAS Build aus.

**Beispielaufrufe durch Benutzer:**
`/build android` (Führt `eas build --platform android` aus)
`/build ios` (Führt `eas build --platform ios` aus)
`/build web` (Führt `npx expo export -p web` aus)

Schritte:
1. Der Agent liest die Zielplattform des Benutzers (android, ios, web oder all).
2. Der Agent führt den entsprechenden Build-Befehl (`eas build` oder `npx expo export`) automatisch aus.
3. Der Agent überwacht den Fortschritt und teilt dem Benutzer das Ergebnis mit.
