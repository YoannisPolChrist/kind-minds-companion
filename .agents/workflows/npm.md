---
description: Automatisches Ausführen von allgemeinen npm-Befehlen durch Agenten
---

// turbo-all

Dieser Workflow berechtigt den Agenten, beliebige `npm` Befehle (wie `npm install`, `npm run build`, `npm update` etc.) im Laufe seiner Arbeit selbstständig auszuführen. 

**Beispielaufrufe durch Benutzer:**
`/npm install axios`
`/npm run dev`

Schritte:
1. Der Benutzer sendet einen `/npm` Befehl ODER der Agent identifiziert selbstständig einen notwendigen `npm` Befehl (z.B. um ein Paket zu installieren).
2. Der Agent führt den Terminal-Befehl aus und setzt dabei explizit `SafeToAutoRun` auf `true`.
3. Der Agent wertet die Ausgabe aus, meldet das Ergebnis und setzt seine Aufgabe fort.
