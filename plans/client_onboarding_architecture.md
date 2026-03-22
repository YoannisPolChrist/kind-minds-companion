# Architektur-Plan: Klienten-Onboarding (Einladungen & Manuelle Erstellung)

## Ziel
Es soll zwei Wege geben, wie ein Klient ins System kommt:
1. **Self-Service per Einladungslink:** Der Klient registriert sich selbst, lädt ein Profilbild hoch, gibt sein Geburtsdatum und weitere Daten ein.
2. **Manuelle Erstellung durch den Therapeuten:** Der Therapeut legt eine "Offline-Akte" für den Klienten an, pflegt dieselben Daten (Name, Geburtsdatum, evtl. Bild) und kann diese Akte später an einen echten Account übergeben (verknüpfen).

---

## 1. Datenmodell-Anpassungen (Firestore)

### Collection: `users`
Neue Felder für Klienten-Profile:
- `birthDate` (String oder Timestamp)
- `profilePictureUrl` (String, URL zum Firebase Storage)
- `therapistId` (String, Verweis auf den Therapeuten)
- `isOfflineProfile` (Boolean, `true` wenn der Therapeut es manuell angelegt hat und noch kein echter Firebase-Auth-Nutzer dahintersteckt)
- `linkedAuthUid` (String, optional, für die spätere Verknüpfung)

### Collection: `invitations` (Neu)
Um Einladungscodes sicher zu verwalten:
- `id` (Dokumenten-ID, z.B. ein 6-stelliger Code wie "X7B9A2" oder eine UUID für Links)
- `therapistId` (String)
- `targetOfflineProfileId` (String, optional - falls der Code dazu dient, ein manuell angelegtes Profil zu übernehmen)
- `status` ('pending', 'used', 'expired')
- `createdAt` (Timestamp)

---

## 2. Workflows (Ablauf)

### Methode 1: Einladungslink (Self-Service)
1. **Generierung:** Therapeut klickt im Dashboard auf "Einladungslink erstellen". Es wird ein Dokument in `invitations` angelegt und ein Deep Link (oder ein 6-stelliger Code) erzeugt.
2. **Versand:** Therapeut teilt den Link/Code via WhatsApp, Mail etc.
3. **Registrierung:** Klient öffnet die App. Bei der Registrierung gibt er den Code ein (oder der Link übergibt den Code automatisch).
4. **Onboarding-Screen:** Nach der Auth-Registrierung kommt der Klient auf einen "Profil vervollständigen"-Screen:
   - Profilbild hochladen (Speicherung in Firebase Storage `/profile_pictures/{uid}`)
   - Geburtsdatum und Bio-Daten eingeben.
5. **Verknüpfung:** Das `users`-Dokument des Klienten speichert die `therapistId` aus der Einladung. Der Klient hat nun seinen eigenen, personalisierten Bereich.

### Methode 2: Manuelle Erstellung ("Offline-Akte")
1. **Anlage:** Therapeut klickt auf "Neuen Klient manuell anlegen". Er füllt ein Formular aus (Vorname, Nachname, Geburtsdatum, optional Profilbild-Upload).
2. **Speicherung:** Es wird ein Dokument in `users` angelegt. Wichtig: Dieses Dokument hat keine Firebase-Auth-UID, sondern eine generierte ID, und bekommt das Feld `isOfflineProfile: true` und `therapistId: uid_des_therapeuten`.
3. **Nutzung:** Der Therapeut kann diesem "Offline-Klienten" ganz normal Übungen zuweisen und Notizen machen.
4. **Spätere Übergabe (Optional):** Möchte der Klient später doch die App nutzen, generiert der Therapeut einen speziellen Einladungscode für *genau dieses* Offline-Profil (`targetOfflineProfileId`). Wenn der Klient sich registriert, übernimmt er die Historie und das Profil.

---

## 3. UI/UX Anpassungen

- **Therapeuten-Dashboard:**
  - Button 1: "Einladungslink generieren" (Zeigt Modal mit Link/Code zum Kopieren).
  - Button 2: "Klient manuell anlegen" (Öffnet ausführliches Formular inkl. Geburtsdatum und Profilbild).
- **Klienten-App (Auth-Flow):**
  - Neues Feld bei Registrierung: "Einladungscode (Optional)".
  - Neuer Screen nach erfolgreicher Registrierung: "Profil einrichten" (Bild, Geburtstag).
- **Klienten-App (Dashboard/Settings):**
  - Möglichkeit, das Profilbild und die Daten später in den Einstellungen zu ändern.

---

## 4. Benötigte Firebase-Regeln (Storage)
Damit Profilbilder hochgeladen werden können, müssen die Storage-Regeln (`storage.rules`) angepasst werden:
- `allow write: if request.auth.uid == userId;`
- `allow read: if true;` (oder eingeschränkt auf den Therapeuten).