"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAuthEmailRequest = exports.onClientDocumentDeleted = exports.onNotificationCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const expo_server_sdk_1 = require("expo-server-sdk");
const resend_1 = require("resend");
admin.initializeApp();
const db = admin.firestore();
const expo = new expo_server_sdk_1.Expo();
const resend = new resend_1.Resend("re_CUA2weaM_FhRyT7CzpA9RK6jE3vnC2aNL");
const APP_WEB_URL = process.env.APP_WEB_URL || "https://therapieprozessunterstuetzung.web.app";
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Email HTML Template Builder
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function baseTemplate(content) {
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
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function htmlToPlainText(html) {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function greetingFor(firstName) {
    const safeName = firstName === null || firstName === void 0 ? void 0 : firstName.trim();
    return safeName ? `Hallo ${escapeHtml(safeName)},` : "Hallo,";
}
function authTemplate(config) {
    const helperBlock = config.helperLabel && config.helperValue
        ? `
      <div class="info-box" style="background:#F6F1E7; border-color:#E7DDCB;">
        <div class="info-box-label">${config.helperLabel}</div>
        <div class="info-box-value">${config.helperValue}</div>
      </div>
    `
        : "";
    const noteBlock = config.note
        ? `
      <div class="divider"></div>
      <p class="message" style="font-size:13px; color:#6F7472; margin-bottom:0;">
        ${config.note}
      </p>
    `
        : "";
    return `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #F1ECE3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2528; }
  .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
  .shell { max-width: 640px; margin: 0 auto; padding: 28px 16px 40px; }
  .card { background: #FFFFFF; border-radius: 30px; overflow: hidden; box-shadow: 0 18px 48px rgba(31,37,40,0.08); border: 1px solid rgba(255,255,255,0.7); }
  .hero { padding: 40px 34px 34px; background:
      radial-gradient(circle at top right, rgba(176,140,87,0.38), transparent 34%),
      linear-gradient(145deg, #173035 0%, #24454B 56%, #183035 100%);
  }
  .eyebrow { color: rgba(255,255,255,0.66); font-size: 12px; font-weight: 800; letter-spacing: 1.8px; text-transform: uppercase; margin-bottom: 12px; }
  .hero-title { color: #FFFFFF; font-size: 32px; line-height: 1.12; font-weight: 900; letter-spacing: -0.9px; max-width: 420px; }
  .hero-subtitle { color: rgba(255,255,255,0.78); font-size: 15px; line-height: 1.7; margin-top: 12px; max-width: 460px; }
  .body { padding: 34px; }
  .greeting { font-size: 18px; font-weight: 700; color: #1F2528; margin-bottom: 14px; }
  .message { font-size: 15px; line-height: 1.8; color: #57606A; margin-bottom: 26px; }
  .cta-wrap { margin-bottom: 24px; }
  .cta-btn { display: inline-block; background: linear-gradient(135deg, #2D666B, #214E53); color: #FFFFFF !important; text-decoration: none; font-size: 15px; font-weight: 900; padding: 16px 28px; border-radius: 16px; letter-spacing: 0.2px; }
  .info-box { background: #F7F4EE; border: 1px solid #E7E0D4; border-radius: 18px; padding: 18px 20px; margin-bottom: 24px; }
  .info-box-label { font-size: 11px; font-weight: 800; color: #8B938E; letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 6px; }
  .info-box-value { font-size: 16px; font-weight: 800; color: #1F2528; line-height: 1.5; word-break: break-word; }
  .divider { height: 1px; background: #EEE7DC; margin: 24px 0; }
  .footer { padding: 22px 34px 30px; background: #FBFAF8; border-top: 1px solid #F0E8DE; }
  .footer p { color: #8B938E; font-size: 12px; line-height: 1.7; text-align: center; }
  @media (max-width: 640px) {
    .shell { padding: 16px 12px 28px; }
    .hero { padding: 30px 24px 26px; }
    .body { padding: 24px; }
    .footer { padding: 18px 24px 24px; }
    .hero-title { font-size: 28px; }
  }
</style>
</head>
<body>
  <div class="preheader">${config.previewText}</div>
  <div class="shell">
    <div class="card">
      <div class="hero">
        <div class="eyebrow">${config.eyebrow}</div>
        <div class="hero-title">${config.title}</div>
        <div class="hero-subtitle">${config.subtitle}</div>
      </div>
      <div class="body">
        <p class="greeting">${config.greeting}</p>
        <p class="message">${config.message}</p>
        ${helperBlock}
        <div class="cta-wrap">
          <a href="${config.ctaHref}" class="cta-btn">${config.ctaLabel}</a>
        </div>
        ${noteBlock}
      </div>
      <div class="footer">
        <p>Diese E-Mail wurde von <strong>Therapie-App</strong> gesendet.<br>Bitte markiere sie nicht als Spam, damit wichtige Hinweise dich sicher erreichen.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
function buildVerifyEmailAppLink(generatedLink, email) {
    try {
        const generatedUrl = new URL(generatedLink);
        const oobCode = generatedUrl.searchParams.get("oobCode");
        if (!oobCode) {
            return generatedLink;
        }
        const appUrl = new URL("/verify-email", APP_WEB_URL);
        appUrl.searchParams.set("oobCode", oobCode);
        appUrl.searchParams.set("email", email);
        return appUrl.toString();
    }
    catch (error) {
        console.warn("Could not build custom verification URL", error);
        return generatedLink;
    }
}
function exerciseAssignedTemplate(exerciseName) {
    return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">Neue Ãœbung zugewiesen âœ¨</div>
      <div class="header-subtitle">Dein Therapeut hat etwas Neues fÃ¼r dich vorbereitet.</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">
        Dein Therapeut hat dir eine neue Ãœbung zugewiesen. Ã–ffne die App, um sie zu starten und deinen Fortschritt zu dokumentieren.
      </p>
      <div class="info-box">
        <div class="info-box-label">Ãœbung</div>
        <div class="info-box-value">ðŸ“‹ ${exerciseName}</div>
      </div>
      <p class="message">
        RegelmÃ¤ÃŸiges Ãœben ist ein wichtiger Teil deines Therapieprozesses. Wir sind hier, um dich dabei zu unterstÃ¼tzen. ðŸ’™
      </p>
      <a href="https://therapieprozessunterstuetzung.web.app" class="cta-btn">Ãœbung Ã¶ffnen â†’</a>
      <div class="divider"></div>
      <p class="message" style="font-size:13px; color:#9CA3AF;">
        Falls du Fragen zu dieser Ãœbung hast, wende dich direkt an deinen Therapeuten.
      </p>
    </div>
  `);
}
function resourceSharedTemplate(resourceTitle, resourceType) {
    const emoji = resourceType === 'pdf' ? 'ðŸ“„' : 'ðŸ”—';
    const typeLabel = resourceType === 'pdf' ? 'PDF-Dokument' : 'Link';
    return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">Neue Ressource geteilt ${emoji}</div>
      <div class="header-subtitle">Dein Therapeut hat dir etwas NÃ¼tzliches bereitgestellt.</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">
        Dein Therapeut hat eine neue Ressource fÃ¼r dich in der App hinterlegt. Du findest sie im Bereich <em>Ressourcen</em>.
      </p>
      <div class="info-box">
        <div class="info-box-label">${typeLabel}</div>
        <div class="info-box-value">${emoji} ${resourceTitle}</div>
      </div>
      <a href="https://therapieprozessunterstuetzung.web.app" class="cta-btn">Ressourcen ansehen â†’</a>
    </div>
  `);
}
function checkinReminderTemplate() {
    return baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%);">
      <div class="header-logo" style="color:rgba(255,255,255,0.6);">Therapie-App</div>
      <div class="header-title">Dein tÃ¤glicher Check-in wartet ðŸŒ…</div>
      <div class="header-subtitle">Wie geht es dir heute?</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">
        Du hast deinen heutigen Check-in noch nicht abgeschlossen. Nimm dir kurz einen Moment, um deine Stimmung zu reflektieren. Es dauert nur 30 Sekunden!
      </p>
      <p class="message">
        Deine tÃ¤glichen Check-ins helfen dir und deinem Therapeuten, deinen Fortschritt besser nachzuvollziehen. ðŸŒ±
      </p>
      <a href="https://therapieprozessunterstuetzung.web.app" class="cta-btn" style="background: linear-gradient(135deg, #D4AF37, #AA7C11);">Check-in starten â†’</a>
    </div>
  `);
}
function generalTemplate(title, body) {
    return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">${title}</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">${body}</p>
      <a href="https://therapieprozessunterstuetzung.web.app" class="cta-btn">App Ã¶ffnen â†’</a>
    </div>
  `);
}
function passwordResetTemplate(resetLink, firstName) {
    return authTemplate({
        eyebrow: "Sicherer Zugang",
        title: "Passwort neu setzen",
        subtitle: "Lege in wenigen Schritten ein neues Passwort fuer deinen Account fest.",
        greeting: greetingFor(firstName),
        message: "Wir haben eine Anfrage erhalten, dein Passwort fuer die Therapie-App zurueckzusetzen. Nutze den Button unten, um ein neues, sicheres Passwort festzulegen.",
        ctaHref: resetLink,
        ctaLabel: "Passwort festlegen",
        note: "Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein aktuelles Passwort bleibt dann unveraendert.",
        previewText: "Passwort fuer deine Therapie-App neu festlegen.",
    });
}
function welcomeTemplate(resetLink, firstName) {
    return authTemplate({
        eyebrow: "Willkommen",
        title: "Dein Zugang ist vorbereitet",
        subtitle: "Dein Therapeut hat bereits einen sicheren Account fuer dich eingerichtet.",
        greeting: greetingFor(firstName),
        message: "Du kannst direkt starten. Vergib jetzt dein persoenliches Passwort und melde dich anschliessend mit deiner E-Mail-Adresse in der App an.",
        ctaHref: resetLink,
        ctaLabel: "Passwort festlegen",
        note: "Nach dem Speichern deines Passworts kannst du dich jederzeit mit derselben E-Mail-Adresse anmelden.",
        previewText: "Willkommen in der Therapie-App. Richte jetzt dein Passwort ein.",
    });
}
function verifyEmailTemplate(verifyLink, email, firstName) {
    return authTemplate({
        eyebrow: "Registrierung abschliessen",
        title: "Bestaetige deine E-Mail-Adresse",
        subtitle: "Ein letzter Klick, dann ist dein Account vollstaendig aktiviert.",
        greeting: greetingFor(firstName),
        message: "Vielen Dank fuer deine Registrierung. Bitte bestaetige jetzt deine E-Mail-Adresse. Danach kannst du dich sofort in der Therapie-App anmelden.",
        ctaHref: verifyLink,
        ctaLabel: "E-Mail bestaetigen",
        helperLabel: "Adresse",
        helperValue: escapeHtml(email),
        note: "Sollte der Button nicht funktionieren, fordere einfach eine neue Bestaetigungs-Mail ueber den Login-Bereich an.",
        previewText: "Bitte bestaetige deine E-Mail-Adresse fuer die Therapie-App.",
    });
}
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Cloud Function
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.onNotificationCreated = (0, firestore_1.onDocumentCreated)({ document: "notifications/{notificationId}", retry: true }, async (event) => {
    var _a;
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const data = snapshot.data();
    if ((data === null || data === void 0 ? void 0 : data.status) === "processed") {
        return;
    }
    const { userId, title, body, type, exerciseTitle, resourceTitle, resourceType } = data;
    if (!userId) {
        console.error("Missing userId in notification document");
        await snapshot.ref.update({
            status: "error",
            error: "Missing userId",
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        throw new Error("Missing userId in notification document");
    }
    await snapshot.ref.set({
        status: "processing",
        processingStartedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    let delivered = false;
    let deliveryChannel = null;
    try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            throw new Error(`User document not found for userId: ${userId}`);
        }
        const userData = userDoc.data();
        const lastActivePlatform = (userData === null || userData === void 0 ? void 0 : userData.lastActivePlatform) || "web";
        const pushToken = userData === null || userData === void 0 ? void 0 : userData.pushToken;
        const email = userData === null || userData === void 0 ? void 0 : userData.email;
        // Push notification for active app users with valid Expo token.
        if (lastActivePlatform === "app" && pushToken && expo_server_sdk_1.Expo.isExpoPushToken(pushToken)) {
            console.log(`Sending push notification to user ${userId}`);
            const messages = [{
                    to: pushToken,
                    sound: "default",
                    title: title || "Neue Benachrichtigung",
                    body: body || "Du hast eine neue Benachrichtigung in der App.",
                    data: { type, withSome: "data" },
                }];
            const chunks = expo.chunkPushNotifications(messages);
            for (const chunk of chunks) {
                await expo.sendPushNotificationsAsync(chunk);
            }
            delivered = true;
            deliveryChannel = "push";
        }
        else if (email) {
            // Email fallback for web users / users without push token.
            console.log(`Sending email notification to user ${userId} (${email}), type: ${type}`);
            let html;
            let subject;
            switch (type) {
                case "exercise_assigned":
                    html = exerciseAssignedTemplate(exerciseTitle || title || "Neue Ãœbung");
                    subject = `ðŸ“‹ Neue Ãœbung: ${exerciseTitle || title || "Neue Ãœbung"}`;
                    break;
                case "resource_shared":
                    html = resourceSharedTemplate(resourceTitle || title || "Neue Ressource", resourceType || "link");
                    subject = `ðŸ“Ž Neue Ressource: ${resourceTitle || title || "Neue Ressource"}`;
                    break;
                case "checkin_reminder":
                    html = checkinReminderTemplate();
                    subject = "ðŸŒ… Dein tÃ¤glicher Check-in wartet auf dich";
                    break;
                default:
                    html = generalTemplate(title || "Neue Benachrichtigung", body || "Du hast eine neue Benachrichtigung erhalten.");
                    subject = title || "Neue Benachrichtigung von deiner Therapie-App";
            }
            const resendData = await resend.emails.send({
                from: "Therapie-App <noreply@johanneschrist.com>",
                to: [email],
                subject,
                html,
            });
            console.log(`Successfully sent email (type: ${type}). ID: ${(_a = resendData.data) === null || _a === void 0 ? void 0 : _a.id}`);
            await db.collection("mail").add({
                to: email,
                type: type || "general",
                message: { subject, html },
                status: "sent-via-resend",
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            delivered = true;
            deliveryChannel = "email";
        }
        else {
            throw new Error(`User ${userId} has no pushToken and no email`);
        }
        if (!delivered) {
            throw new Error(`Notification ${snapshot.id} was not delivered`);
        }
        await snapshot.ref.update({
            status: "processed",
            deliveryChannel,
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown notification processing error";
        console.error("Error processing notification:", error);
        await snapshot.ref.update({
            status: "error",
            error: message,
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        throw error;
    }
});
exports.onClientDocumentDeleted = (0, firestore_1.onDocumentDeleted)("users/{userId}", async (event) => {
    var _a;
    const userId = event.params.userId;
    const deletedData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    console.log(`User doc deleted for userId: ${userId}. Cleaning up Auth account.`);
    // 1. Delete the Firebase Auth account so the email can be reused
    try {
        await admin.auth().deleteUser(userId);
        console.log(`Successfully deleted Firebase Auth account for userId: ${userId}`);
    }
    catch (authError) {
        if (authError.code === "auth/user-not-found") {
            console.log(`Auth account not found for userId: ${userId} â€“ nothing to delete.`);
        }
        else {
            console.error(`Failed to delete Auth account for userId: ${userId}`, authError);
        }
    }
    // 2. Clean up any open invitations linked to this user's email
    const email = deletedData === null || deletedData === void 0 ? void 0 : deletedData.email;
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
        }
        catch (invErr) {
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
    }
    catch (notifErr) {
        console.error(`Failed to clean up notifications for userId: ${userId}`, notifErr);
    }
});
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Custom Auth Emails (Password Reset, Welcome Emails)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.onAuthEmailRequest = (0, firestore_1.onDocumentCreated)("mail_requests/{requestId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const { email, type, firstName } = data;
    if (!email || !type)
        return;
    const normalizedEmail = String(email).trim().toLowerCase();
    console.log(`Processing auth email request of type ${type} for email ${normalizedEmail}`);
    try {
        if (type === "PASSWORD_RESET" || type === "WELCOME_CLIENT" || type === "VERIFY_EMAIL") {
            let authLink;
            let html;
            let subject;
            if (type === "WELCOME_CLIENT") {
                authLink = await admin.auth().generatePasswordResetLink(normalizedEmail);
                html = welcomeTemplate(authLink, firstName);
                subject = "Willkommen in der Therapie-App - bitte lege dein Passwort fest";
            }
            else if (type === "VERIFY_EMAIL") {
                authLink = await admin.auth().generateEmailVerificationLink(normalizedEmail);
                html = verifyEmailTemplate(buildVerifyEmailAppLink(authLink, normalizedEmail), normalizedEmail, firstName);
                subject = "Bitte bestaetige deine E-Mail-Adresse fuer die Therapie-App";
            }
            else {
                authLink = await admin.auth().generatePasswordResetLink(normalizedEmail);
                html = passwordResetTemplate(authLink, firstName);
                subject = "Passwort fuer die Therapie-App zuruecksetzen";
            }
            const text = htmlToPlainText(html);
            // Send via Resend
            await resend.emails.send({
                from: "Therapie-App <noreply@johanneschrist.com>",
                to: [normalizedEmail],
                subject,
                html,
                text,
            });
            console.log(`Successfully sent custom auth email to ${normalizedEmail}`);
            // Update document status
            await snapshot.ref.update({
                status: "processed",
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    catch (error) {
        console.error("Failed to process mail request:", error);
        await snapshot.ref.update({
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
//# sourceMappingURL=index.js.map