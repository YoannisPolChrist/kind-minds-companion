---
description: Führt npx Befehle automatisch aus
---

// turbo-all

Führe den vom Benutzer angegebenen npx-Befehl aus.

**Beispielaufruf durch Benutzer:**
`/npx create-expo-app my-app`
`/npx expo start -c`
`/npx tailwindcss init`

Schritte:
1. Extrahiere den Befehl und die Argumente, die der Benutzer übergeben hat (alles nach `/npx`).
2. Führe den Befehl aus.
3. Melde dem Benutzer, ob der Befehl erfolgreich war, und zeige (falls sinnvoll) das Ergebnis des Befehls.
