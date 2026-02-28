---
description: Automatisches Ausführen von npx expo Befehlen durch Agenten
---

// turbo-all

Wenn der Agent während seiner Arbeit entscheidet, dass ein `npx expo` oder `eas` Befehl zur Lösung der aktuellen Aufgabe nötig ist, berechtigt dieser Workflow zur automatischen Ausführung.

Schritte:
1. Der Agent bereitet den notwendigen `npx expo` (oder `eas`) Befehl vor (z. B. `npx expo start`, `npx expo install`, etc.).
2. Der Agent führt den Terminal-Befehl aus und setzt dabei explizit `SafeToAutoRun` auf `true`.
3. Der Agent wertet die Ausgabe aus und setzt seine Aufgabe fort.
