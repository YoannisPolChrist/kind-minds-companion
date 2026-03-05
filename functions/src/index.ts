import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { Expo } from "expo-server-sdk";
import { Resend } from "resend";

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();
const resend = new Resend("re_CUA2weaM_FhRyT7CzpA9RK6jE3vnC2aNL");

// ────────────────────────────────────────────────────────────
// Email HTML Template Builder
// ────────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background-color: #F5F4F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
  .wrapper { max-width: 600px; margin: 40px auto; padding: 20px; }
  .card { background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.06); }
  .header { background: linear-gradient(135deg, #1a2d3d 0%, #243842 100%); padding: 40px 40px 36px; }
  .header-logo { font-size: 14px; font-weight: 800; color: rgba(255,255,255,0.5); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
  .header-title { font-size: 28px; font-weight: 900; color: #ffffff; line-height: 1.2; }
  .header-subtitle { font-size: 15px; color: rgba(255,255,255,0.65); margin-top: 8px; font-weight: 500; }
  .body { padding: 40px; }
  .greeting { font-size: 17px; font-weight: 600; color: #1a2d3d; margin-bottom: 16px; }
  .message { font-size: 15px; line-height: 1.7; color: #4B5563; margin-bottom: 28px; }
  .cta-btn { display: inline-block; background: linear-gradient(135deg, #1a2d3d, #243842); color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 800; padding: 16px 32px; border-radius: 14px; letter-spacing: 0.3px; }
  .info-box { background: #F9F8F6; border: 1px solid #E8E6E1; border-radius: 16px; padding: 20px 24px; margin: 24px 0; }
  .info-box-label { font-size: 11px; font-weight: 700; color: #9CA3AF; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; }
  .info-box-value { font-size: 16px; font-weight: 700; color: #1a2d3d; }
  .divider { height: 1px; background: #F0EDE8; margin: 28px 0; }
  .footer { padding: 24px 40px; background: #F9F8F6; border-top: 1px solid #F0EDE8; text-align: center; }
  .footer p { font-size: 12px; color: #9CA3AF; line-height: 1.6; }
  .footer a { color: #6B7280; text-decoration: none; }
  .accent { color: #D4AF37; }
  .icon-circle { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 20px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    ${content}
  </div>
  <div class="footer">
    <p>Diese E-Mail wurde von <strong>Therapie-App</strong> gesendet.<br>
    Fragen? Antworte einfach auf diese E-Mail.<br>
    <br>
    &copy; 2025 johanneschrist.com &mdash; Alle Rechte vorbehalten.</p>
  </div>
</div>
</body>
</html>`;
}

function exerciseAssignedTemplate(exerciseName: string): string {
  return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">Neue Übung zugewiesen ✨</div>
      <div class="header-subtitle">Dein Therapeut hat etwas Neues für dich vorbereitet.</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">
        Dein Therapeut hat dir eine neue Übung zugewiesen. Öffne die App, um sie zu starten und deinen Fortschritt zu dokumentieren.
      </p>
      <div class="info-box">
        <div class="info-box-label">Übung</div>
        <div class="info-box-value">📋 ${exerciseName}</div>
      </div>
      <p class="message">
        Regelmäßiges Üben ist ein wichtiger Teil deines Therapieprozesses. Wir sind hier, um dich dabei zu unterstützen. 💙
      </p>
      <a href="https://therapieprozessunterstuetzung.web.app" class="cta-btn">Übung öffnen →</a>
      <div class="divider"></div>
      <p class="message" style="font-size:13px; color:#9CA3AF;">
        Falls du Fragen zu dieser Übung hast, wende dich direkt an deinen Therapeuten.
      </p>
    </div>
  `);
}

function resourceSharedTemplate(resourceTitle: string, resourceType: string): string {
  const emoji = resourceType === 'pdf' ? '📄' : '🔗';
  const typeLabel = resourceType === 'pdf' ? 'PDF-Dokument' : 'Link';
  return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">Neue Ressource geteilt ${emoji}</div>
      <div class="header-subtitle">Dein Therapeut hat dir etwas Nützliches bereitgestellt.</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">
        Dein Therapeut hat eine neue Ressource für dich in der App hinterlegt. Du findest sie im Bereich <em>Ressourcen</em>.
      </p>
      <div class="info-box">
        <div class="info-box-label">${typeLabel}</div>
        <div class="info-box-value">${emoji} ${resourceTitle}</div>
      </div>
      <a href="https://therapieprozessunterstuetzung.web.app" class="cta-btn">Ressourcen ansehen →</a>
    </div>
  `);
}

function checkinReminderTemplate(): string {
  return baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%);">
      <div class="header-logo" style="color:rgba(255,255,255,0.6);">Therapie-App</div>
      <div class="header-title">Dein täglicher Check-in wartet 🌅</div>
      <div class="header-subtitle">Wie geht es dir heute?</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">
        Du hast deinen heutigen Check-in noch nicht abgeschlossen. Nimm dir kurz einen Moment, um deine Stimmung zu reflektieren. Es dauert nur 30 Sekunden!
      </p>
      <p class="message">
        Deine täglichen Check-ins helfen dir und deinem Therapeuten, deinen Fortschritt besser nachzuvollziehen. 🌱
      </p>
      <a href="https://therapieprozessunterstuetzung.web.app" class="cta-btn" style="background: linear-gradient(135deg, #D4AF37, #AA7C11);">Check-in starten →</a>
    </div>
  `);
}

function generalTemplate(title: string, body: string): string {
  return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">${title}</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">${body}</p>
      <a href="https://therapieprozessunterstuetzung.web.app" class="cta-btn">App öffnen →</a>
    </div>
  `);
}

function passwordResetTemplate(resetLink: string): string {
  return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">Passwort zurücksetzen 🔑</div>
      <div class="header-subtitle">Erstelle ein neues Passwort für deinen Account.</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">
        Wir haben eine Anfrage erhalten, dein Passwort für die Therapie-App zurückzusetzen. Klicke auf den Button unten, um ein neues Passwort festzulegen.
      </p>
      <a href="${resetLink}" class="cta-btn">Passwort zurücksetzen →</a>
      <div class="divider"></div>
      <p class="message" style="font-size:13px; color:#9CA3AF;">
        Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail einfach ignorieren. Dein Passwort bleibt dann unverändert.
      </p>
    </div>
  `);
}

function welcomeTemplate(resetLink: string): string {
  return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">Willkommen! 👋</div>
      <div class="header-subtitle">Dein Therapeut hat einen Account für dich erstellt.</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">
        Dein Therapeut hat dich zur Therapie-App eingeladen. Um loszulegen, richte dir bitte ein eigenes, sicheres Passwort ein.
      </p>
      <a href="${resetLink}" class="cta-btn">Passwort festlegen →</a>
      <div class="divider"></div>
      <p class="message" style="font-size:13px; color:#9CA3AF;">
        Nachdem du dein Passwort vergeben hast, kannst du dich jederzeit mit deiner E-Mail-Adresse und dem neuen Passwort in der App anmelden.
      </p>
    </div>
  `);
}


function verifyEmailTemplate(verifyLink: string): string {
  return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">E-Mail bestätigen 📧</div>
      <div class="header-subtitle">Willkommen bei der Therapie-App!</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">
        Vielen Dank für deine Registrierung. Bitte bestätige deine E-Mail-Adresse über den untenstehenden Button, um deinen Account zu aktivieren und loszulegen.
      </p>
      <a href="${verifyLink}" class="cta-btn">E-Mail bestätigen →</a>
    </div>
  `);
}

// ────────────────────────────────────────────────────────────
// Cloud Function
// ────────────────────────────────────────────────────────────

export const onNotificationCreated = onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }

    const data = snapshot.data();
    const { userId, title, body, type, exerciseTitle, resourceTitle, resourceType } = data;

    if (!userId) {
      console.error("Missing userId in notification document");
      return;
    }

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        console.error(`User document not found for userId: ${userId}`);
        return;
      }

      const userData = userDoc.data();
      const lastActivePlatform = userData?.lastActivePlatform || "web";
      const pushToken = userData?.pushToken;
      const email = userData?.email;

      await snapshot.ref.update({ status: "processed", processedAt: admin.firestore.FieldValue.serverTimestamp() });

      // Push Notification (native app users)
      if (lastActivePlatform === "app" && pushToken && Expo.isExpoPushToken(pushToken)) {
        console.log(`Sending push notification to user ${userId}`);
        const messages = [];
        messages.push({
          to: pushToken,
          sound: "default",
          title: title || "Neue Benachrichtigung",
          body: body || "Du hast eine neue Benachrichtigung in der App.",
          data: { type, withSome: "data" },
        });

        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          try {
            await expo.sendPushNotificationsAsync(chunk);
          } catch (error) {
            console.error("Error sending chunk of push notifications", error);
          }
        }
      }
      // Email (web users or users without push token)
      else if (email) {
        console.log(`Sending email notification to user ${userId} (${email}), type: ${type}`);

        // Build the right template based on notification type
        let html: string;
        let subject: string;

        switch (type) {
          case "exercise_assigned":
            html = exerciseAssignedTemplate(exerciseTitle || title || "Neue Übung");
            subject = `📋 Neue Übung: ${exerciseTitle || title || "Neue Übung"}`;
            break;
          case "resource_shared":
            html = resourceSharedTemplate(resourceTitle || title || "Neue Ressource", resourceType || "link");
            subject = `📎 Neue Ressource: ${resourceTitle || title || "Neue Ressource"}`;
            break;
          case "checkin_reminder":
            html = checkinReminderTemplate();
            subject = "🌅 Dein täglicher Check-in wartet auf dich";
            break;
          default:
            html = generalTemplate(title || "Neue Benachrichtigung", body || "Du hast eine neue Benachrichtigung erhalten.");
            subject = title || "Neue Benachrichtigung von deiner Therapie-App";
        }

        try {
          const resendData = await resend.emails.send({
            from: "Therapie-App <noreply@johanneschrist.com>",
            to: [email],
            subject,
            html,
          });
          console.log(`Successfully sent email (type: ${type}). ID: ${resendData.data?.id}`);
        } catch (err) {
          console.error("Failed to send email with Resend:", err);
        }

        await db.collection("mail").add({
          to: email,
          type: type || "general",
          message: { subject, html },
          status: "sent-via-resend",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        console.warn(`User ${userId} has no pushToken and no email. Cannot send notification.`);
      }

    } catch (error) {
      console.error("Error processing notification:", error);
    }
  }
);

// ────────────────────────────────────────────────────────────
// When a user/client document is deleted, also remove their
// Firebase Auth account so the email address can be reused.
// ────────────────────────────────────────────────────────────

export const onClientDocumentDeleted = onDocumentDeleted(
  "users/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const deletedData = event.data?.data();

    console.log(`User doc deleted for userId: ${userId}. Cleaning up Auth account.`);

    // 1. Delete the Firebase Auth account so the email can be reused
    try {
      await admin.auth().deleteUser(userId);
      console.log(`Successfully deleted Firebase Auth account for userId: ${userId}`);
    } catch (authError: any) {
      if (authError.code === "auth/user-not-found") {
        console.log(`Auth account not found for userId: ${userId} – nothing to delete.`);
      } else {
        console.error(`Failed to delete Auth account for userId: ${userId}`, authError);
      }
    }

    // 2. Clean up any open invitations linked to this user's email
    const email = deletedData?.email;
    if (email) {
      try {
        const invitationsSnap = await db
          .collection("invitations")
          .where("email", "==", email)
          .get();

        const batch = db.batch();
        invitationsSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Deleted ${invitationsSnap.size} invitation(s) for email: ${email}`);
      } catch (invErr) {
        console.error(`Failed to clean up invitations for email: ${email}`, invErr);
      }
    }

    // 3. Clean up pending notifications for this user
    try {
      const notifSnap = await db
        .collection("notifications")
        .where("userId", "==", userId)
        .where("status", "!=", "processed")
        .get();

      if (!notifSnap.empty) {
        const batch = db.batch();
        notifSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Deleted ${notifSnap.size} pending notification(s) for userId: ${userId}`);
      }
    } catch (notifErr) {
      console.error(`Failed to clean up notifications for userId: ${userId}`, notifErr);
    }
  }
);

// ────────────────────────────────────────────────────────────
// Custom Auth Emails (Password Reset, Welcome Emails)
// ────────────────────────────────────────────────────────────

export const onAuthEmailRequest = onDocumentCreated(
  "mail_requests/{requestId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const { email, type } = data;
    if (!email || !type) return;

    console.log(`Processing auth email request of type ${type} for email ${email}`);

    try {
      if (type === "PASSWORD_RESET" || type === "WELCOME_CLIENT" || type === "VERIFY_EMAIL") {
        let authLink: string;
        let html: string;
        let subject: string;

        if (type === "WELCOME_CLIENT") {
          authLink = await admin.auth().generatePasswordResetLink(email);
          html = welcomeTemplate(authLink);
          subject = "👋 Willkommen bei der Therapie-App – Bitte lege dein Passwort fest";
        } else if (type === "VERIFY_EMAIL") {
          authLink = await admin.auth().generateEmailVerificationLink(email);
          html = verifyEmailTemplate(authLink);
          subject = "📧 Bitte bestätige deine E-Mail-Adresse für die Therapie-App";
        } else {
          authLink = await admin.auth().generatePasswordResetLink(email);
          html = passwordResetTemplate(authLink);
          subject = "🔑 Setze dein Therapie-App Passwort zurück";
        }

        // Send via Resend
        await resend.emails.send({
          from: "Therapie-App <noreply@johanneschrist.com>",
          to: [email],
          subject,
          html,
        });

        console.log(`Successfully sent custom auth email to ${email}`);

        // Update document status
        await snapshot.ref.update({
          status: "processed",
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Failed to process mail request:", error);
      await snapshot.ref.update({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
);
