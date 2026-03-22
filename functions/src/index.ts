import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { Expo } from "expo-server-sdk";
import { Resend } from "resend";

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required runtime config: ${name}`);
  }

  return value;
}

function getResendClient() {
  return new Resend(getRequiredEnv("RESEND_API_KEY"));
}

function getAppUrl() {
  return getRequiredEnv("APP_URL").replace(/\/+$/, "");
}

const BRAND = process.env.APP_BRAND?.trim() || "Therapie-App";
const BRAND_OWNER = process.env.APP_BRAND_OWNER?.trim() || "johanneschrist.com";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL?.trim() || "noreply@johanneschrist.com";

// ────────────────────────────────────────────────────────────
// Multi-language translations
// ────────────────────────────────────────────────────────────

type Lang = "de" | "en" | "fr" | "es" | "it" | "tr" | "ar";

const t: Record<string, Record<Lang, string>> = {
  greeting: { de: "Hallo", en: "Hello", fr: "Bonjour", es: "Hola", it: "Ciao", tr: "Merhaba", ar: "مرحباً" },
  footerSent: { de: "Diese E-Mail wurde automatisch versendet von", en: "This email was sent automatically by", fr: "Cet e-mail a été envoyé automatiquement par", es: "Este correo fue enviado automáticamente por", it: "Questa email è stata inviata automaticamente da", tr: "Bu e-posta tarafından otomatik olarak gönderildi", ar: "تم إرسال هذا البريد الإلكتروني تلقائياً من" },
  footerQuestions: { de: "Fragen? Antworte einfach auf diese E-Mail.", en: "Questions? Simply reply to this email.", fr: "Des questions ? Répondez simplement à cet e-mail.", es: "¿Preguntas? Simplemente responde a este correo.", it: "Domande? Rispondi semplicemente a questa email.", tr: "Sorularınız mı var? Bu e-postayı yanıtlayın.", ar: "أسئلة؟ ببساطة قم بالرد على هذا البريد الإلكتروني." },
  footerRights: { de: "Alle Rechte vorbehalten.", en: "All rights reserved.", fr: "Tous droits réservés.", es: "Todos los derechos reservados.", it: "Tutti i diritti riservati.", tr: "Tüm hakları saklıdır.", ar: "جميع الحقوق محفوظة." },

  exerciseTitle: { de: "Neue Übung zugewiesen", en: "New Exercise Assigned", fr: "Nouvel exercice attribué", es: "Nuevo ejercicio asignado", it: "Nuovo esercizio assegnato", tr: "Yeni Egzersiz Atandı", ar: "تم تعيين تمرين جديد" },
  exerciseSubtitle: { de: "Dein Therapeut hat etwas Neues für dich vorbereitet.", en: "Your therapist has prepared something new for you.", fr: "Votre thérapeute a préparé quelque chose de nouveau.", es: "Tu terapeuta ha preparado algo nuevo para ti.", it: "Il tuo terapeuta ha preparato qualcosa di nuovo.", tr: "Terapistiniz sizin için yeni bir şey hazırladı.", ar: "قام معالجك بتحضير شيء جديد لك." },
  exerciseBody: { de: "Dein Therapeut hat dir eine neue Übung zugewiesen. Öffne die App, um sie zu starten und deinen Fortschritt zu dokumentieren.", en: "Your therapist has assigned you a new exercise. Open the app to start it and track your progress.", fr: "Votre thérapeute vous a attribué un nouvel exercice. Ouvrez l'application pour commencer.", es: "Tu terapeuta te ha asignado un nuevo ejercicio. Abre la app para comenzar.", it: "Il tuo terapeuta ti ha assegnato un nuovo esercizio. Apri l'app per iniziare.", tr: "Terapistiniz size yeni bir egzersiz atadı. Başlamak için uygulamayı açın.", ar: "قام معالجك بتعيين تمرين جديد لك. افتح التطبيق للبدء." },
  exerciseLabel: { de: "Übung", en: "Exercise", fr: "Exercice", es: "Ejercicio", it: "Esercizio", tr: "Egzersiz", ar: "تمرين" },
  exerciseEncouragement: { de: "Regelmäßiges Üben ist ein wichtiger Teil deines Therapieprozesses.", en: "Regular practice is an important part of your therapy process.", fr: "La pratique régulière est essentielle dans votre processus thérapeutique.", es: "La práctica regular es una parte importante de tu proceso terapéutico.", it: "La pratica regolare è una parte importante del tuo percorso terapeutico.", tr: "Düzenli pratik terapi sürecinizin önemli bir parçasıdır.", ar: "التدريب المنتظم جزء مهم من عملية العلاج الخاصة بك." },
  openExercise: { de: "Übung öffnen", en: "Open Exercise", fr: "Ouvrir l'exercice", es: "Abrir ejercicio", it: "Apri esercizio", tr: "Egzersizi Aç", ar: "فتح التمرين" },

  appointmentTitle: { de: "Neuer Termin eingetragen", en: "New Appointment Scheduled", fr: "Nouveau rendez-vous planifié", es: "Nueva cita programada", it: "Nuovo appuntamento programmato", tr: "Yeni Randevu Planlandı", ar: "تم تحديد موعد جديد" },
  appointmentSubtitle: { de: "Dein Therapeut hat einen Termin für dich geplant.", en: "Your therapist has scheduled an appointment for you.", fr: "Votre thérapeute a planifié un rendez-vous.", es: "Tu terapeuta ha programado una cita para ti.", it: "Il tuo terapeuta ha programmato un appuntamento.", tr: "Terapistiniz sizin için bir randevu planladı.", ar: "حدد معالجك موعداً لك." },
  appointmentBody: { de: "Dein Therapeut hat einen neuen Termin für dich eingetragen. Bitte merke dir den folgenden Termin vor:", en: "Your therapist has scheduled a new appointment for you. Please note the following date:", fr: "Votre thérapeute a planifié un nouveau rendez-vous. Veuillez noter la date suivante :", es: "Tu terapeuta ha programado una nueva cita. Anota la siguiente fecha:", it: "Il tuo terapeuta ha programmato un nuovo appuntamento. Prendi nota della seguente data:", tr: "Terapistiniz sizin için yeni bir randevu planladı. Lütfen aşağıdaki tarihi not edin:", ar: "حدد معالجك موعداً جديداً لك. يرجى ملاحظة التاريخ التالي:" },
  appointmentLabel: { de: "Nächster Termin", en: "Next Appointment", fr: "Prochain rendez-vous", es: "Próxima cita", it: "Prossimo appuntamento", tr: "Sonraki Randevu", ar: "الموعد التالي" },
  appointmentNote: { de: "Du findest den Termin auch auf deinem Dashboard in der App. Bei Fragen wende dich direkt an deinen Therapeuten.", en: "You can also find the appointment on your dashboard. If you have questions, contact your therapist.", fr: "Vous trouverez aussi le rendez-vous sur votre tableau de bord. Pour toute question, contactez votre thérapeute.", es: "También puedes encontrar la cita en tu panel. Si tienes preguntas, contacta a tu terapeuta.", it: "Puoi trovare l'appuntamento anche nella tua dashboard. Per domande, contatta il tuo terapeuta.", tr: "Randevuyu panelinizdede bulabilirsiniz. Sorularınız için terapistinizle iletişime geçin.", ar: "يمكنك أيضاً العثور على الموعد في لوحة المعلومات الخاصة بك." },
  toDashboard: { de: "Zum Dashboard", en: "Go to Dashboard", fr: "Aller au tableau de bord", es: "Ir al panel", it: "Vai alla dashboard", tr: "Panoya Git", ar: "انتقل إلى لوحة المعلومات" },

  fileTitle: { de: "Neue Datei bereitgestellt", en: "New File Uploaded", fr: "Nouveau fichier partagé", es: "Nuevo archivo compartido", it: "Nuovo file condiviso", tr: "Yeni Dosya Yüklendi", ar: "تم رفع ملف جديد" },
  fileSubtitle: { de: "Dein Therapeut hat eine Datei für dich hinterlegt.", en: "Your therapist has uploaded a file for you.", fr: "Votre thérapeute a déposé un fichier pour vous.", es: "Tu terapeuta ha subido un archivo para ti.", it: "Il tuo terapeuta ha caricato un file per te.", tr: "Terapistiniz sizin için bir dosya yükledi.", ar: "قام معالجك برفع ملف لك." },
  fileBody: {
    de: `Dein Therapeut hat eine neue Datei in deinem persönlichen Bereich hinterlegt. Du findest sie unter „Dateien" in der App.`,
    en: `Your therapist has uploaded a new file to your personal area. You can find it under "Files" in the app.`,
    fr: `Votre thérapeute a déposé un nouveau fichier. Vous le trouverez sous « Fichiers » dans l'application.`,
    es: `Tu terapeuta ha subido un nuevo archivo. Lo encontrarás en "Archivos" en la app.`,
    it: `Il tuo terapeuta ha caricato un nuovo file. Lo trovi sotto "File" nell'app.`,
    tr: `Terapistiniz kişisel alanınıza yeni bir dosya yükledi. Uygulamada „Dosyalar" altında bulabilirsiniz.`,
    ar: `قام معالجك برفع ملف جديد. يمكنك العثور عليه تحت "الملفات" في التطبيق.`
  },
  fileLabel: { de: "Datei", en: "File", fr: "Fichier", es: "Archivo", it: "File", tr: "Dosya", ar: "ملف" },
  viewFiles: { de: "Dateien ansehen", en: "View Files", fr: "Voir les fichiers", es: "Ver archivos", it: "Vedi file", tr: "Dosyaları Görüntüle", ar: "عرض الملفات" },

  resourceTitle: { de: "Neue Ressource geteilt", en: "New Resource Shared", fr: "Nouvelle ressource partagée", es: "Nuevo recurso compartido", it: "Nuova risorsa condivisa", tr: "Yeni Kaynak Paylaşıldı", ar: "تمت مشاركة مورد جديد" },
  resourceSubtitle: { de: "Dein Therapeut hat dir etwas Nützliches bereitgestellt.", en: "Your therapist has shared something useful with you.", fr: "Votre thérapeute a partagé quelque chose d'utile.", es: "Tu terapeuta ha compartido algo útil contigo.", it: "Il tuo terapeuta ha condiviso qualcosa di utile.", tr: "Terapistiniz sizinle faydalı bir şey paylaştı.", ar: "شارك معالجك شيئاً مفيداً معك." },
  viewResources: { de: "Ressourcen ansehen", en: "View Resources", fr: "Voir les ressources", es: "Ver recursos", it: "Vedi risorse", tr: "Kaynakları Görüntüle", ar: "عرض الموارد" },

  checkinTitle: { de: "Dein täglicher Check-in wartet", en: "Your Daily Check-in Awaits", fr: "Votre check-in quotidien vous attend", es: "Tu check-in diario te espera", it: "Il tuo check-in giornaliero ti aspetta", tr: "Günlük Check-in'iniz Bekliyor", ar: "تسجيل الدخول اليومي في انتظارك" },
  checkinSubtitle: { de: "Wie geht es dir heute?", en: "How are you feeling today?", fr: "Comment vous sentez-vous aujourd'hui ?", es: "¿Cómo te sientes hoy?", it: "Come ti senti oggi?", tr: "Bugün nasıl hissediyorsunuz?", ar: "كيف تشعر اليوم؟" },
  checkinBody: { de: "Du hast deinen heutigen Check-in noch nicht abgeschlossen. Nimm dir einen kurzen Moment, um deine Stimmung zu reflektieren – es dauert nur 30 Sekunden!", en: "You haven't completed your daily check-in yet. Take a moment to reflect on your mood – it only takes 30 seconds!", fr: "Vous n'avez pas encore complété votre check-in. Prenez un moment pour réfléchir à votre humeur.", es: "Aún no has completado tu check-in diario. Tómate un momento para reflexionar.", it: "Non hai ancora completato il check-in di oggi. Prenditi un momento per riflettere.", tr: "Günlük check-in'inizi henüz tamamlamadınız. Ruh halinizi yansıtmak için bir dakikanızı ayırın.", ar: "لم تكمل تسجيل الدخول اليومي بعد. خذ لحظة للتفكير في مزاجك." },
  startCheckin: { de: "Check-in starten", en: "Start Check-in", fr: "Démarrer le check-in", es: "Iniciar check-in", it: "Inizia check-in", tr: "Check-in'i Başlat", ar: "ابدأ تسجيل الدخول" },

  openApp: { de: "App öffnen", en: "Open App", fr: "Ouvrir l'app", es: "Abrir app", it: "Apri app", tr: "Uygulamayı Aç", ar: "فتح التطبيق" },
  newNotification: { de: "Neue Benachrichtigung", en: "New Notification", fr: "Nouvelle notification", es: "Nueva notificación", it: "Nuova notifica", tr: "Yeni Bildirim", ar: "إشعار جديد" },
  notificationReceived: { de: "Du hast eine neue Benachrichtigung erhalten.", en: "You have received a new notification.", fr: "Vous avez reçu une nouvelle notification.", es: "Has recibido una nueva notificación.", it: "Hai ricevuto una nuova notifica.", tr: "Yeni bir bildirim aldınız.", ar: "لقد تلقيت إشعاراً جديداً." },
  contactTherapist: { de: "Falls du Fragen hast, wende dich direkt an deinen Therapeuten.", en: "If you have questions, contact your therapist directly.", fr: "Si vous avez des questions, contactez votre thérapeute.", es: "Si tienes preguntas, contacta a tu terapeuta.", it: "Se hai domande, contatta il tuo terapeuta.", tr: "Sorularınız varsa terapistinizle iletişime geçin.", ar: "إذا كانت لديك أسئلة، تواصل مع معالجك." },
};

function tr(key: string, lang: Lang): string {
  return t[key]?.[lang] || t[key]?.["de"] || key;
}

type NotificationKind =
  | "exercise_assigned"
  | "resource_shared"
  | "file_uploaded"
  | "appointment_saved"
  | "checkin_reminder"
  | "general";

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeNotificationType(
  rawType: unknown,
  data: FirebaseFirestore.DocumentData
): NotificationKind {
  switch (rawType) {
    case "exercise_assigned":
    case "resource_shared":
    case "file_uploaded":
    case "appointment_saved":
    case "checkin_reminder":
    case "general":
      return rawType;
    case "FILE_UPLOAD": {
      const fileUploadSignals = [
        data?.resourceId,
        data?.resourceTitle,
        data?.resourceType,
        data?.title,
        data?.body,
        data?.message,
      ]
        .filter((value) => typeof value === "string")
        .join(" ")
        .toLowerCase();

      if (fileUploadSignals.includes("ressource") || fileUploadSignals.includes("resource") || fileUploadSignals.includes("material")) {
        return "resource_shared";
      }

      return "file_uploaded";
    }
    default:
      return "general";
  }
}

function getNotificationRoute(type: NotificationKind, data: FirebaseFirestore.DocumentData) {
  const exerciseId = pickString(data?.exerciseId);
  const defaults: Record<NotificationKind, { appPath: string; webPath: string }> = {
    exercise_assigned: {
      appPath: exerciseId ? `/(app)/exercise/${exerciseId}` : "/(app)/exercises_overview",
      webPath: exerciseId ? `/exercise/${exerciseId}` : "/exercises_overview",
    },
    resource_shared: { appPath: "/(app)/resources", webPath: "/resources" },
    file_uploaded: { appPath: "/(app)/resources", webPath: "/resources" },
    appointment_saved: { appPath: "/(app)", webPath: "/" },
    checkin_reminder: { appPath: "/(app)/checkin", webPath: "/checkin" },
    general: { appPath: "/(app)", webPath: "/" },
  };

  return {
    appPath: pickString(data?.appPath) || defaults[type].appPath,
    webPath: pickString(data?.webPath) || defaults[type].webPath,
  };
}

function buildAppUrl(path?: string): string {
  const baseUrl = getAppUrl();
  if (!path || path === "/") {
    return baseUrl;
  }

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

// ────────────────────────────────────────────────────────────
// Email HTML Template – Clean, Light Design
// ────────────────────────────────────────────────────────────

function baseTemplate(opts: {
  headerEmoji: string;
  headerTitle: string;
  headerSubtitle?: string;
  headerBg?: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl?: string;
  ctaBg?: string;
  lang: Lang;
  therapistName?: string;
}): string {
  const {
    headerEmoji, headerTitle, headerSubtitle, bodyHtml, ctaLabel, lang,
    headerBg = "#2C4A5A",
    ctaUrl = getAppUrl(),
    ctaBg = "#2C4A5A",
    therapistName,
  } = opts;
  const dir = lang === "ar" ? ' dir="rtl"' : "";
  const align = lang === "ar" ? "right" : "left";

  return `<!DOCTYPE html>
<html lang="${lang}"${dir}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${headerTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F3EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<!-- Wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F3EF;">
<tr><td align="center" style="padding:32px 16px 40px;">

<!-- Card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.06);">

  <!-- Header -->
  <tr>
    <td style="background:${headerBg};padding:36px 40px 32px;text-align:${align};">
      <div style="font-size:32px;line-height:1;margin-bottom:14px;">${headerEmoji}</div>
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">${BRAND}</div>
      <div style="font-size:24px;font-weight:800;color:#ffffff;line-height:1.25;">${headerTitle}</div>
      ${headerSubtitle ? `<div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:8px;font-weight:500;line-height:1.5;">${headerSubtitle}</div>` : ""}
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:36px 40px 40px;text-align:${align};">
      ${bodyHtml}

      <!-- CTA Button -->
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <td style="background:${ctaBg};border-radius:12px;">
            <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.2px;">${ctaLabel} →</a>
          </td>
        </tr>
      </table>

      <!-- Contact note -->
      <p style="font-size:13px;color:#9CA3AF;margin-top:24px;line-height:1.6;">${tr("contactTherapist", lang)}</p>
    </td>
  </tr>

</table>

<!-- Footer -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin-top:24px;">
  <tr>
    <td style="text-align:center;padding:0 20px;">
      ${therapistName ? `<p style="font-size:12px;color:#6B7280;margin-bottom:8px;">Dein Therapeut: <strong>${therapistName}</strong></p>` : ""}
      <p style="font-size:12px;color:#9CA3AF;line-height:1.7;">
        ${tr("footerSent", lang)} <strong>${BRAND}</strong>.<br>
        ${tr("footerQuestions", lang)}<br><br>
        &copy; ${new Date().getFullYear()} ${BRAND_OWNER} — ${tr("footerRights", lang)}
      </p>
    </td>
  </tr>
</table>

</td></tr>
</table>
</body>
</html>`;
}

// ── Helpers ──

function infoBox(label: string, value: string, emoji: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="background:#F9F7F4;border:1px solid #EBE8E3;border-radius:14px;padding:18px 22px;">
          <div style="font-size:11px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px;">${label}</div>
          <div style="font-size:16px;font-weight:700;color:#1F2937;">${emoji} ${value}</div>
        </td>
      </tr>
    </table>`;
}

function paragraph(text: string): string {
  return `<p style="font-size:15px;line-height:1.7;color:#4B5563;margin:0 0 16px;">${text}</p>`;
}

function greetingHtml(name: string | undefined, lang: Lang): string {
  const g = tr("greeting", lang);
  return `<p style="font-size:17px;font-weight:600;color:#1F2937;margin:0 0 16px;">${g}${name ? ` ${name}` : ""},</p>`;
}

// ────────────────────────────────────────────────────────────
// Template functions
// ────────────────────────────────────────────────────────────

function exerciseAssignedTemplate(
  exerciseName: string,
  lang: Lang,
  clientName?: string,
  therapistName?: string,
  ctaUrl?: string
): string {
  return baseTemplate({
    headerEmoji: "✨",
    headerTitle: tr("exerciseTitle", lang),
    headerSubtitle: tr("exerciseSubtitle", lang),
    headerBg: "#2C4A5A",
    bodyHtml:
      greetingHtml(clientName, lang) +
      paragraph(tr("exerciseBody", lang)) +
      infoBox(tr("exerciseLabel", lang), exerciseName, "📋") +
      paragraph(tr("exerciseEncouragement", lang) + " 💙"),
    ctaLabel: tr("openExercise", lang),
    ctaUrl,
    lang,
    therapistName,
  });
}

function appointmentSavedTemplate(
  appointmentInfo: string,
  lang: Lang,
  clientName?: string,
  therapistName?: string,
  ctaUrl?: string
): string {
  return baseTemplate({
    headerEmoji: "📅",
    headerTitle: tr("appointmentTitle", lang),
    headerSubtitle: tr("appointmentSubtitle", lang),
    headerBg: "#5B3A6B",
    bodyHtml:
      greetingHtml(clientName, lang) +
      paragraph(tr("appointmentBody", lang)) +
      infoBox(tr("appointmentLabel", lang), appointmentInfo, "📅") +
      paragraph(tr("appointmentNote", lang)),
    ctaLabel: tr("toDashboard", lang),
    ctaBg: "#5B3A6B",
    ctaUrl,
    lang,
    therapistName,
  });
}

function fileUploadedTemplate(
  fileName: string,
  lang: Lang,
  clientName?: string,
  therapistName?: string,
  ctaUrl?: string
): string {
  return baseTemplate({
    headerEmoji: "📎",
    headerTitle: tr("fileTitle", lang),
    headerSubtitle: tr("fileSubtitle", lang),
    headerBg: "#2C4A5A",
    bodyHtml:
      greetingHtml(clientName, lang) +
      paragraph(tr("fileBody", lang)) +
      infoBox(tr("fileLabel", lang), fileName, "📎"),
    ctaLabel: tr("viewFiles", lang),
    ctaUrl,
    lang,
    therapistName,
  });
}

function resourceSharedTemplate(
  resourceName: string,
  resourceType: string,
  lang: Lang,
  clientName?: string,
  therapistName?: string,
  ctaUrl?: string
): string {
  const emoji = resourceType === "pdf" ? "📄" : "🔗";
  return baseTemplate({
    headerEmoji: emoji,
    headerTitle: tr("resourceTitle", lang),
    headerSubtitle: tr("resourceSubtitle", lang),
    headerBg: "#2C5A4A",
    bodyHtml:
      greetingHtml(clientName, lang) +
      infoBox(resourceType === "pdf" ? "PDF" : "Link", resourceName, emoji),
    ctaLabel: tr("viewResources", lang),
    ctaBg: "#2C5A4A",
    ctaUrl,
    lang,
    therapistName,
  });
}

function checkinReminderTemplate(lang: Lang, clientName?: string, ctaUrl?: string): string {
  return baseTemplate({
    headerEmoji: "🌅",
    headerTitle: tr("checkinTitle", lang),
    headerSubtitle: tr("checkinSubtitle", lang),
    headerBg: "#8B6914",
    bodyHtml:
      greetingHtml(clientName, lang) +
      paragraph(tr("checkinBody", lang)),
    ctaLabel: tr("startCheckin", lang),
    ctaBg: "#8B6914",
    ctaUrl,
    lang,
  });
}

function generalTemplate(
  title: string,
  body: string,
  lang: Lang,
  clientName?: string,
  ctaUrl?: string,
  ctaLabel?: string
): string {
  return baseTemplate({
    headerEmoji: "🔔",
    headerTitle: title,
    headerBg: "#2C4A5A",
    bodyHtml:
      greetingHtml(clientName, lang) +
      paragraph(body),
    ctaLabel: ctaLabel || tr("openApp", lang),
    ctaUrl,
    lang,
  });
}

function passwordResetTemplate(resetLink: string): string {
  return baseTemplate({
    headerEmoji: "🔑",
    headerTitle: "Passwort zurücksetzen",
    headerSubtitle: "Erstelle ein neues Passwort für deinen Account.",
    headerBg: "#2C4A5A",
    bodyHtml:
      greetingHtml(undefined, "de") +
      paragraph("Wir haben eine Anfrage erhalten, dein Passwort für die Therapie-App zurückzusetzen. Klicke auf den Button unten, um ein neues Passwort festzulegen.") +
      `<p style="font-size:13px;color:#9CA3AF;margin-top:20px;line-height:1.6;">Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail einfach ignorieren. Dein Passwort bleibt dann unverändert.</p>`,
    ctaLabel: "Passwort zurücksetzen",
    ctaUrl: resetLink,
    lang: "de",
  });
}

function welcomeTemplate(resetLink: string): string {
  return baseTemplate({
    headerEmoji: "👋",
    headerTitle: "Willkommen!",
    headerSubtitle: "Dein Therapeut hat einen Account für dich erstellt.",
    headerBg: "#2C4A5A",
    bodyHtml:
      greetingHtml(undefined, "de") +
      paragraph("Dein Therapeut hat dich zur Therapie-App eingeladen. Um loszulegen, richte dir bitte ein eigenes, sicheres Passwort ein.") +
      `<p style="font-size:13px;color:#9CA3AF;margin-top:20px;line-height:1.6;">Nachdem du dein Passwort vergeben hast, kannst du dich jederzeit mit deiner E-Mail-Adresse und dem neuen Passwort in der App anmelden.</p>`,
    ctaLabel: "Passwort festlegen",
    ctaUrl: resetLink,
    lang: "de",
  });
}

function verifyEmailTemplate(verifyLink: string): string {
  return baseTemplate({
    headerEmoji: "📧",
    headerTitle: "E-Mail bestätigen",
    headerSubtitle: "Willkommen bei der Therapie-App!",
    headerBg: "#2C4A5A",
    bodyHtml:
      greetingHtml(undefined, "de") +
      paragraph("Vielen Dank für deine Registrierung. Bitte bestätige deine E-Mail-Adresse über den Button unten, um deinen Account zu aktivieren."),
    ctaLabel: "E-Mail bestätigen",
    ctaUrl: verifyLink,
    lang: "de",
  });
}

// ────────────────────────────────────────────────────────────
// Cloud Function: Notification → Push or Email
// ────────────────────────────────────────────────────────────

export const onNotificationCreated = onDocumentCreated(
  { document: "notifications/{notificationId}", retry: true },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    if (data?.status === "processed") return;

    const userId = pickString(data?.userId);

    if (!userId) {
      await snapshot.ref.update({ status: "error", error: "Missing userId", processedAt: admin.firestore.FieldValue.serverTimestamp() });
      throw new Error("Missing userId");
    }

    await snapshot.ref.set({ status: "processing", processingStartedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) throw new Error(`User not found: ${userId}`);

      const userData = userDoc.data()!;
      const pushToken = userData.pushToken;
      const email = userData.email;
      const lang: Lang = (userData.language as Lang) || "de";
      const clientName = userData.firstName || undefined;
      const lastActivePlatform = userData.lastActivePlatform || "web";
      const normalizedType = normalizeNotificationType(data?.type, data);
      const notificationRoute = getNotificationRoute(normalizedType, data);
      const notificationTitle = pickString(data?.title) || tr("newNotification", lang);
      const notificationBody = pickString(data?.body) || pickString(data?.message) || tr("notificationReceived", lang);
      const exerciseTitle = pickString(data?.exerciseTitle) || pickString(data?.title) || "Übung";
      const resourceTitle = pickString(data?.resourceTitle) || pickString(data?.title) || "Ressource";
      const resourceType = pickString(data?.resourceType) || "link";
      const fileName = pickString(data?.fileName) || pickString(data?.title) || "Datei";
      const appointmentLabel = pickString(data?.appointmentLabel) || notificationBody;
      const ctaUrl = buildAppUrl(notificationRoute.webPath);
      const customActionLabel = pickString(data?.actionLabel);

      // Resolve therapist name
      let therapistName: string | undefined;
      if (userData.therapistId) {
        const therapistDoc = await db.collection("users").doc(userData.therapistId).get();
        if (therapistDoc.exists) {
          const td = therapistDoc.data()!;
          therapistName = [td.firstName, td.lastName].filter(Boolean).join(" ") || undefined;
        }
      }

      let delivered = false;
      let deliveryChannel: "push" | "email" | null = null;

      // Push notification
      if (lastActivePlatform === "app" && pushToken && Expo.isExpoPushToken(pushToken)) {
        const messages = [{
          to: pushToken,
          sound: "default" as const,
          title: notificationTitle,
          body: notificationBody,
          data: {
            type: normalizedType,
            appPath: notificationRoute.appPath,
            webPath: notificationRoute.webPath,
            notificationId: snapshot.id,
          },
        }];
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          await expo.sendPushNotificationsAsync(chunk);
        }
        delivered = true;
        deliveryChannel = "push";
      } else if (email) {
        // Email notification
        let html: string;
        let subject: string;

        switch (normalizedType) {
          case "exercise_assigned":
            html = exerciseAssignedTemplate(exerciseTitle, lang, clientName, therapistName, ctaUrl);
            subject = `✨ ${tr("exerciseTitle", lang)}: ${exerciseTitle}`;
            break;
          case "resource_shared":
            html = resourceSharedTemplate(resourceTitle, resourceType, lang, clientName, therapistName, ctaUrl);
            subject = `${resourceType === "pdf" ? "📄" : "🔗"} ${tr("resourceTitle", lang)}: ${resourceTitle}`;
            break;
          case "checkin_reminder":
            html = checkinReminderTemplate(lang, clientName, ctaUrl);
            subject = `🌅 ${tr("checkinTitle", lang)}`;
            break;
          case "appointment_saved":
            html = appointmentSavedTemplate(appointmentLabel, lang, clientName, therapistName, ctaUrl);
            subject = `📅 ${tr("appointmentTitle", lang)}`;
            break;
          case "file_uploaded":
            html = fileUploadedTemplate(fileName, lang, clientName, therapistName, ctaUrl);
            subject = `📎 ${tr("fileTitle", lang)}: ${fileName}`;
            break;
          default:
            html = generalTemplate(notificationTitle, notificationBody, lang, clientName, ctaUrl, customActionLabel);
            subject = notificationTitle;
        }

        const resendData = await getResendClient().emails.send({
          from: `${BRAND} <${RESEND_FROM_EMAIL}>`,
          to: [email],
          subject,
          html,
        });
        console.log(`Email sent (${normalizedType}) to ${email}. ID: ${resendData.data?.id}`);

        await db.collection("mail").add({
          to: email,
          type: normalizedType,
          message: { subject, html },
          status: "sent-via-resend",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        delivered = true;
        deliveryChannel = "email";
      } else {
        throw new Error(`User ${userId} has no pushToken and no email`);
      }

      if (!delivered) throw new Error(`Notification ${snapshot.id} was not delivered`);

      await snapshot.ref.update({ status: "processed", deliveryChannel, processedAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Notification error:", error);
      await snapshot.ref.update({ status: "error", error: message, processedAt: admin.firestore.FieldValue.serverTimestamp() });
      throw error;
    }
  }
);

// ────────────────────────────────────────────────────────────
// Cloud Function: User Deletion Cleanup
// ────────────────────────────────────────────────────────────

export const onClientDocumentDeleted = onDocumentDeleted(
  "users/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const deletedData = event.data?.data();

    // Delete Firebase Auth account
    try {
      await admin.auth().deleteUser(userId);
    } catch (authError: any) {
      if (authError.code !== "auth/user-not-found") {
        console.error(`Failed to delete Auth for ${userId}`, authError);
      }
    }

    // Clean up invitations
    const email = deletedData?.email;
    if (email) {
      try {
        const invSnap = await db.collection("invitations").where("email", "==", email).get();
        const batch = db.batch();
        invSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      } catch (e) {
        console.error(`Failed to clean invitations for ${email}`, e);
      }
    }

    // Clean up pending notifications
    try {
      const notifSnap = await db.collection("notifications").where("userId", "==", userId).where("status", "!=", "processed").get();
      if (!notifSnap.empty) {
        const batch = db.batch();
        notifSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (e) {
      console.error(`Failed to clean notifications for ${userId}`, e);
    }
  }
);

// ────────────────────────────────────────────────────────────
// Cloud Function: Custom Auth Emails
// ────────────────────────────────────────────────────────────

export const onAuthEmailRequest = onDocumentCreated(
  "mail_requests/{requestId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const { email, type } = data;
    if (!email || !type) return;

    try {
      let authLink: string;
      let html: string;
      let subject: string;

      switch (type) {
        case "WELCOME_CLIENT":
          authLink = await admin.auth().generatePasswordResetLink(email);
          html = welcomeTemplate(authLink);
          subject = "👋 Willkommen bei der Therapie-App – Bitte lege dein Passwort fest";
          break;
        case "VERIFY_EMAIL":
          authLink = await admin.auth().generateEmailVerificationLink(email);
          html = verifyEmailTemplate(authLink);
          subject = "📧 Bitte bestätige deine E-Mail-Adresse";
          break;
        case "PASSWORD_RESET":
          authLink = await admin.auth().generatePasswordResetLink(email);
          html = passwordResetTemplate(authLink);
          subject = "🔑 Passwort zurücksetzen";
          break;
        default:
          console.warn(`Unknown mail_request type: ${type}`);
          return;
      }

      await getResendClient().emails.send({
        from: `${BRAND} <${RESEND_FROM_EMAIL}>`,
        to: [email],
        subject,
        html,
      });

      await snapshot.ref.update({ status: "processed", processedAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch (error) {
      console.error("Mail request error:", error);
      await snapshot.ref.update({ status: "error", error: error instanceof Error ? error.message : "Unknown", processedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }
);

const FUNCTIONS_REGION = "us-central1";
const GOOGLE_CALENDAR_SCOPE = [
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
  "profile",
].join(" ");

function getAllowedOrigins() {
  const origins = new Set<string>([
    getAppUrl(),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);

  const alternateAppUrl = process.env.APP_ALT_URL?.trim();
  if (alternateAppUrl) {
    origins.add(alternateAppUrl.replace(/\/+$/, ""));
  }

  return origins;
}

function getDefaultCalendarRedirectBase() {
  return `${getAppUrl()}/settings`;
}

function normalizeRedirectBase(candidate?: string | null) {
  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);
    if (!getAllowedOrigins().has(url.origin)) {
      return null;
    }

    const pathname = url.pathname === "/" ? "/settings" : url.pathname.replace(/\/+$/, "");
    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}

function resolveCalendarRedirectBase(req: any) {
  const fromBody = normalizeRedirectBase(
    typeof req.body?.redirectUrl === "string" ? req.body.redirectUrl : null
  );
  if (fromBody) {
    return fromBody;
  }

  const origin =
    typeof req.headers.origin === "string" ? req.headers.origin.replace(/\/+$/, "") : "";
  const fromOrigin = normalizeRedirectBase(origin ? `${origin}/settings` : null);
  return fromOrigin || getDefaultCalendarRedirectBase();
}

function getGoogleCalendarConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `https://${FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/googleCalendarCallback`;

  if (!clientId || !clientSecret || !projectId) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

function setCors(req: any, res: any) {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  if (getAllowedOrigins().has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Vary", "Origin");
}

async function verifyRequestUser(req: any) {
  const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  return admin.auth().verifyIdToken(token);
}

function buildCalendarSummary(data: {
  status: "connected" | "disconnected" | "error";
  email?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  lastError?: string;
}) {
  return {
    provider: "google",
    status: data.status,
    email: data.email || null,
    connectedAt: data.connectedAt || null,
    lastSyncedAt: data.lastSyncedAt || null,
    lastError: data.lastError || null,
  };
}

async function fetchGoogleAccessTokenFromRefreshToken(refreshToken: string) {
  const config = getGoogleCalendarConfig();
  if (!config) {
    throw new Error("GOOGLE_CONFIG_MISSING");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const payload = await response.json() as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || "GOOGLE_TOKEN_REFRESH_FAILED");
  }

  return {
    accessToken: payload.access_token,
    expiresIn: payload.expires_in || 3600,
  };
}

function normalizeGoogleEventId(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length >= 5 ? normalized.slice(0, 120) : `appt-${normalized || "event"}`;
}

async function writeGoogleConnectionState(uid: string, data: {
  status: "connected" | "disconnected" | "error";
  email?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  lastError?: string;
  refreshToken?: string | null;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  scopes?: string[];
}) {
  const connectionRef = db.collection("calendar_connections").doc(uid);
  const userRef = db.collection("users").doc(uid);

  if (data.status === "disconnected") {
    await connectionRef.set({
      google: {
        provider: "google",
        status: "disconnected",
        disconnectedAt: new Date().toISOString(),
        email: null,
        connectedAt: null,
        lastSyncedAt: null,
        lastError: null,
        refreshToken: null,
        accessToken: null,
        accessTokenExpiresAt: null,
        scopes: [],
      },
    }, { merge: true });
    await userRef.set({
      calendarConnectionSummary: {
        google: buildCalendarSummary({ status: "disconnected" }),
      },
    }, { merge: true });
    return;
  }

  const mergedConnection: Record<string, unknown> = {
    provider: "google",
    status: data.status,
    email: data.email || null,
    connectedAt: data.connectedAt || null,
    lastSyncedAt: data.lastSyncedAt || null,
    lastError: data.lastError || null,
    refreshToken: data.refreshToken ?? null,
    accessToken: data.accessToken ?? null,
    accessTokenExpiresAt: data.accessTokenExpiresAt ?? null,
    scopes: data.scopes || [],
  };

  await connectionRef.set({ google: mergedConnection }, { merge: true });
  await userRef.set({
    calendarConnectionSummary: {
      google: buildCalendarSummary({
        status: data.status,
        email: data.email,
        connectedAt: data.connectedAt,
        lastSyncedAt: data.lastSyncedAt,
        lastError: data.lastError,
      }),
    },
  }, { merge: true });
}

export const googleCalendarAuthStart = onRequest(async (req: any, res: any) => {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const config = getGoogleCalendarConfig();
  if (!config) {
    res.status(503).json({ error: "Google Kalender ist noch nicht konfiguriert." });
    return;
  }

  try {
    const decoded = await verifyRequestUser(req);
    const redirectBase = resolveCalendarRedirectBase(req);
    const stateId = db.collection("calendar_oauth_states").doc().id;
    await db.collection("calendar_oauth_states").doc(stateId).set({
      uid: decoded.uid,
      createdAt: new Date().toISOString(),
      redirectBase,
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: GOOGLE_CALENDAR_SCOPE,
      state: stateId,
    });

    res.json({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  } catch (error) {
    console.error("googleCalendarAuthStart error", error);
    res.status(401).json({ error: "Authentifizierung fehlgeschlagen." });
  }
});

export const googleCalendarCallback = onRequest(async (req: any, res: any) => {
  const config = getGoogleCalendarConfig();
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const errorParam = typeof req.query.error === "string" ? req.query.error : "";
  const fallbackRedirectBase = getDefaultCalendarRedirectBase();

  if (!config) {
    res.redirect(`${fallbackRedirectBase}?calendar=google-config-missing`);
    return;
  }

  if (!state || errorParam) {
    res.redirect(`${fallbackRedirectBase}?calendar=google-error`);
    return;
  }

  const stateRef = db.collection("calendar_oauth_states").doc(state);
  const stateSnap = await stateRef.get();
  if (!stateSnap.exists) {
    res.redirect(`${fallbackRedirectBase}?calendar=google-state-error`);
    return;
  }

  const stateData = stateSnap.data() as { uid: string; redirectBase?: string | null };
  const redirectBase =
    normalizeRedirectBase(stateData.redirectBase || null) || fallbackRedirectBase;
  await stateRef.delete().catch(() => undefined);

  if (!code) {
    res.redirect(`${redirectBase}?calendar=google-error`);
    return;
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    });

    const tokenPayload = await tokenResponse.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
    };

    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new Error(tokenPayload.error || "GOOGLE_TOKEN_EXCHANGE_FAILED");
    }

    const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });
    const userInfo = await userInfoResponse.json() as { email?: string };
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ((tokenPayload.expires_in || 3600) * 1000)).toISOString();

    await writeGoogleConnectionState(stateData.uid, {
      status: "connected",
      email: userInfo.email,
      connectedAt: now,
      refreshToken: tokenPayload.refresh_token || null,
      accessToken: tokenPayload.access_token,
      accessTokenExpiresAt: expiresAt,
      scopes: tokenPayload.scope ? tokenPayload.scope.split(" ") : GOOGLE_CALENDAR_SCOPE.split(" "),
    });

    res.redirect(`${redirectBase}?calendar=google-connected`);
  } catch (error) {
    console.error("googleCalendarCallback error", error);
    await writeGoogleConnectionState(stateData.uid, {
      status: "error",
      lastError: error instanceof Error ? error.message : "Google Verbindung fehlgeschlagen.",
    }).catch(() => undefined);
    res.redirect(`${redirectBase}?calendar=google-error`);
  }
});

export const googleCalendarDisconnect = onRequest(async (req: any, res: any) => {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const decoded = await verifyRequestUser(req);
    await writeGoogleConnectionState(decoded.uid, { status: "disconnected" });
    res.json({ ok: true });
  } catch (error) {
    console.error("googleCalendarDisconnect error", error);
    res.status(401).json({ error: "Trennen fehlgeschlagen." });
  }
});

export const googleCalendarSyncAppointment = onRequest(async (req: any, res: any) => {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const decoded = await verifyRequestUser(req);
    const appointment = req.body?.appointment as {
      id?: string;
      title?: string;
      description?: string;
      startAt?: string;
      endAt?: string;
      location?: string;
    };

    if (!appointment?.id || !appointment?.title || !appointment?.startAt || !appointment?.endAt) {
      res.status(400).json({ error: "Termin-Daten fehlen." });
      return;
    }

    const connectionSnap = await db.collection("calendar_connections").doc(decoded.uid).get();
    const googleConnection = connectionSnap.data()?.google as {
      refreshToken?: string;
      email?: string;
      connectedAt?: string;
    } | undefined;

    if (!googleConnection?.refreshToken) {
      res.status(409).json({ error: "Google Kalender ist nicht verbunden." });
      return;
    }

    const { accessToken, expiresIn } = await fetchGoogleAccessTokenFromRefreshToken(googleConnection.refreshToken);
    const eventId = normalizeGoogleEventId(appointment.id);
    const eventBody = {
      id: eventId,
      summary: appointment.title,
      description: appointment.description || "",
      location: appointment.location || "",
      start: { dateTime: appointment.startAt },
      end: { dateTime: appointment.endAt },
    };

    const insertResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });

    if (!insertResponse.ok && insertResponse.status !== 409) {
      const failure = await insertResponse.text();
      throw new Error(failure || "GOOGLE_EVENT_INSERT_FAILED");
    }

    if (insertResponse.status === 409) {
      const updateResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      });
      if (!updateResponse.ok) {
        const failure = await updateResponse.text();
        throw new Error(failure || "GOOGLE_EVENT_UPDATE_FAILED");
      }
    }

    const lastSyncedAt = new Date().toISOString();
    await writeGoogleConnectionState(decoded.uid, {
      status: "connected",
      email: googleConnection.email,
      connectedAt: googleConnection.connectedAt,
      lastSyncedAt,
      accessToken,
      accessTokenExpiresAt: new Date(Date.now() + (expiresIn * 1000)).toISOString(),
      refreshToken: googleConnection.refreshToken,
      lastError: "",
    });

    res.json({ ok: true, eventId, lastSyncedAt });
  } catch (error) {
    console.error("googleCalendarSyncAppointment error", error);
    if (req.headers.authorization) {
      try {
        const decoded = await verifyRequestUser(req);
        await writeGoogleConnectionState(decoded.uid, {
          status: "connected",
          lastError: error instanceof Error ? error.message : "Google Sync fehlgeschlagen.",
        });
      } catch {
        // Ignore secondary auth/update failure.
      }
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "Google Sync fehlgeschlagen." });
  }
});
