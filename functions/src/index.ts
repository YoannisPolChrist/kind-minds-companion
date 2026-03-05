import { onDocumentCreated } from "firebase-functions/v2/firestore";
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
