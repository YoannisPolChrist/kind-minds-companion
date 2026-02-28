---
description: Automatisches Ausführen von allgemeinen Git-Befehlen durch Agenten
---

// turbo-all

Dieser Workflow berechtigt den Agenten, beliebige `git` Befehle (wie `git fetch`, `git log`, `git checkout`, `git branch`, `git cherry-pick` etc.) im Laufe seiner Arbeit selbstständig auszuführen. 

**Beispielaufrufe durch Benutzer:**
`/git checkout main`
`/git pull origin main`

Schritte:
1. Der Benutzer sendet einen `/git` Befehl ODER der Agent identifiziert selbstständig einen notwendigen `git` Befehl.
2. Der Agent führt den Terminal-Befehl aus und setzt dabei explizit `SafeToAutoRun` auf `true`.
3. Der Agent wertet die Ausgabe aus, meldet das Ergebnis und setzt seine Aufgabe fort.
