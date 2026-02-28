---
description: Automatisches Ausführen von Get-Befehlen (z.B. PowerShell)
---

// turbo-all

Dieser Workflow berechtigt den Agenten, Lese- und Abfrage-Befehle (wie `get`, `wget` oder PowerShell `Get-...` Cmdlets) im Laufe seiner Arbeit selbstständig auszuführen. 

**Beispielaufrufe durch Benutzer:**
`/get content ...`
`/get-process`

Schritte:
1. Der Benutzer sendet einen Befehl, der mit `get` oder `Get-` beginnt ODER der Agent identifiziert selbstständig einen solchen notwendigen Befehl zur Informationsbeschaffung.
2. Der Agent führt den Terminal-Befehl aus und setzt dabei explizit `SafeToAutoRun` auf `true`.
3. Der Agent wertet die Ausgabe aus, meldet das Ergebnis und setzt seine Aufgabe fort.
