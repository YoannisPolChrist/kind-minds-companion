---
description: Universeller Workflow für die automatische Ausführung von Agenten-Befehlen (npx, npm, git etc.)
---

// turbo-all

Dieser Workflow dient als generischer Container für Befehle, die der Agent im Laufe seiner Arbeit selbstständig ausführen muss. 

Schritte:
1. Der Agent identifiziert einen notwendigen Terminal-Befehl (z. B. `npx`, `npm install`, `git`, Dateioperationen).
2. Der Agent führt diesen Befehl aus und setzt dabei `SafeToAutoRun` auf `true`, da dieser Workflow die Erlaubnis dazu erteilt.
3. Der Agent wertet die Ausgabe aus und setzt seine eigentliche Aufgabe nahtlos fort.
