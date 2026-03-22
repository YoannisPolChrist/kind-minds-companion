# Android Release Checklist

## Ziel
- Eine einheitliche Expo-App fuer Browser und Android ausliefern.
- Therapeuten- und Klienten-Login laufen ueber dasselbe Rollenmodell.

## Vor dem ersten Preview-APK
- `npm install` im Projekt ausfuehren.
- `npm run doctor` ohne blockierende Expo-Fehler durchlaufen lassen.
- Firebase-Umgebungsvariablen fuer lokale Entwicklung und EAS pruefen.
- `google-services.json` und Android-Package-Namen gegen das Zielprojekt pruefen.
- Push-, Kalender- und Medienberechtigungen auf Android-Geraeten testen.

## Produkt-Check
- Login als Therapeut und Klient auf Browser und Android pruefen.
- Journal-Sichtbarkeit pruefen:
  - private Klienteneintraege nur fuer den Klienten sichtbar
  - private Therapeuten-Journal-Eintraege nur fuer den Therapeuten sichtbar
  - freigegebene Therapeuten-Journal-Eintraege beim Klienten sichtbar
  - Session Notes nie beim Klienten sichtbar
- Aufgabenfluss pruefen:
  - Aufgabe wird vom Therapeuten zugewiesen
  - Aufgabe erscheint beim Klienten
  - Bearbeitung und Abschluss synchronisieren
- Offline-Profil-Merge pruefen:
  - Uebungen, Check-ins, Journal und Ressourcen wandern auf den echten Account

## Build und Verteilung
- Preview-APK mit `npm run build:android:preview` erzeugen.
- APK auf mindestens einem Android-Testgeraet installieren.
- App-Name, Icon, Splash, Berechtigungen und Deep Links final abnehmen.
- Danach EAS-Release-Profil fuer interne Tests bzw. Play Store vorbereiten.
