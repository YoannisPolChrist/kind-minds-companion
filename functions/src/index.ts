import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { Expo } from "expo-server-sdk";
import { Resend } from "resend";

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();
const resend = new Resend("re_CUA2weaM_FhRyT7CzpA9RK6jE3vnC2aNL");

// ────────────────────────────────────────────────────────────
// Multi-language email translations
// ────────────────────────────────────────────────────────────

type Lang = "de" | "en" | "fr" | "es" | "it" | "tr" | "ar";

const t: Record<string, Record<Lang, string>> = {
  greeting: { de: "Hallo", en: "Hello", fr: "Bonjour", es: "Hola", it: "Ciao", tr: "Merhaba", ar: "مرحباً" },
  footerSent: { de: "Diese E-Mail wurde von", en: "This email was sent by", fr: "Cet e-mail a été envoyé par", es: "Este correo fue enviado por", it: "Questa email è stata inviata da", tr: "Bu e-posta tarafından gönderildi", ar: "تم إرسال هذا البريد الإلكتروني من" },
  footerQuestions: { de: "Fragen? Antworte einfach auf diese E-Mail.", en: "Questions? Simply reply to this email.", fr: "Des questions ? Répondez simplement à cet e-mail.", es: "¿Preguntas? Simplemente responde a este correo.", it: "Domande? Rispondi semplicemente a questa email.", tr: "Sorularınız mı var? Bu e-postayı yanıtlayın.", ar: "أسئلة؟ ببساطة قم بالرد على هذا البريد الإلكتروني." },
  footerRights: { de: "Alle Rechte vorbehalten.", en: "All rights reserved.", fr: "Tous droits réservés.", es: "Todos los derechos reservados.", it: "Tutti i diritti riservati.", tr: "Tüm hakları saklıdır.", ar: "جميع الحقوق محفوظة." },
  exerciseTitle: { de: "Neue Übung zugewiesen ✨", en: "New Exercise Assigned ✨", fr: "Nouvel exercice attribué ✨", es: "Nuevo ejercicio asignado ✨", it: "Nuovo esercizio assegnato ✨", tr: "Yeni Egzersiz Atandı ✨", ar: "تم تعيين تمرين جديد ✨" },
  exerciseSubtitle: { de: "Dein Therapeut hat etwas Neues für dich vorbereitet.", en: "Your therapist has prepared something new for you.", fr: "Votre thérapeute a préparé quelque chose de nouveau pour vous.", es: "Tu terapeuta ha preparado algo nuevo para ti.", it: "Il tuo terapeuta ha preparato qualcosa di nuovo per te.", tr: "Terapistiniz sizin için yeni bir şey hazırladı.", ar: "قام معالجك بتحضير شيء جديد لك." },
  exerciseBody: { de: "Dein Therapeut hat dir eine neue Übung zugewiesen. Öffne die App, um sie zu starten und deinen Fortschritt zu dokumentieren.", en: "Your therapist has assigned you a new exercise. Open the app to start it and track your progress.", fr: "Votre thérapeute vous a attribué un nouvel exercice. Ouvrez l'application pour le commencer.", es: "Tu terapeuta te ha asignado un nuevo ejercicio. Abre la app para comenzar.", it: "Il tuo terapeuta ti ha assegnato un nuovo esercizio. Apri l'app per iniziare.", tr: "Terapistiniz size yeni bir egzersiz atadı. Başlamak için uygulamayı açın.", ar: "قام معالجك بتعيين تمرين جديد لك. افتح التطبيق للبدء." },
  exerciseLabel: { de: "Übung", en: "Exercise", fr: "Exercice", es: "Ejercicio", it: "Esercizio", tr: "Egzersiz", ar: "تمرين" },
  exerciseEncouragement: { de: "Regelmäßiges Üben ist ein wichtiger Teil deines Therapieprozesses. 💙", en: "Regular practice is an important part of your therapy process. 💙", fr: "La pratique régulière est une partie importante de votre processus thérapeutique. 💙", es: "La práctica regular es una parte importante de tu proceso terapéutico. 💙", it: "La pratica regolare è una parte importante del tuo percorso terapeutico. 💙", tr: "Düzenli pratik terapi sürecinizin önemli bir parçasıdır. 💙", ar: "التدريب المنتظم جزء مهم من عملية العلاج الخاصة بك. 💙" },
  openExercise: { de: "Übung öffnen →", en: "Open Exercise →", fr: "Ouvrir l'exercice →", es: "Abrir ejercicio →", it: "Apri esercizio →", tr: "Egzersizi Aç →", ar: "فتح التمرين ←" },
  appointmentTitle: { de: "Neuer Termin eingetragen 📅", en: "New Appointment Scheduled 📅", fr: "Nouveau rendez-vous planifié 📅", es: "Nueva cita programada 📅", it: "Nuovo appuntamento programmato 📅", tr: "Yeni Randevu Planlandı 📅", ar: "تم تحديد موعد جديد 📅" },
  appointmentSubtitle: { de: "Dein Therapeut hat einen Termin für dich geplant.", en: "Your therapist has scheduled an appointment for you.", fr: "Votre thérapeute a planifié un rendez-vous pour vous.", es: "Tu terapeuta ha programado una cita para ti.", it: "Il tuo terapeuta ha programmato un appuntamento per te.", tr: "Terapistiniz sizin için bir randevu planladı.", ar: "حدد معالجك موعداً لك." },
  appointmentBody: { de: "Dein Therapeut hat einen neuen Termin für dich eingetragen. Bitte merke dir den folgenden Termin vor:", en: "Your therapist has scheduled a new appointment for you. Please note the following date:", fr: "Votre thérapeute a planifié un nouveau rendez-vous. Veuillez noter la date suivante :", es: "Tu terapeuta ha programado una nueva cita. Anota la siguiente fecha:", it: "Il tuo terapeuta ha programmato un nuovo appuntamento. Prendi nota della seguente data:", tr: "Terapistiniz sizin için yeni bir randevu planladı. Lütfen aşağıdaki tarihi not edin:", ar: "حدد معالجك موعداً جديداً لك. يرجى ملاحظة التاريخ التالي:" },
  appointmentLabel: { de: "Nächster Termin", en: "Next Appointment", fr: "Prochain rendez-vous", es: "Próxima cita", it: "Prossimo appuntamento", tr: "Sonraki Randevu", ar: "الموعد التالي" },
  toDashboard: { de: "Zum Dashboard →", en: "Go to Dashboard →", fr: "Aller au tableau de bord →", es: "Ir al panel →", it: "Vai alla dashboard →", tr: "Panoya Git →", ar: "انتقل إلى لوحة المعلومات ←" },
  fileTitle: { de: "Neue Datei bereitgestellt 📎", en: "New File Uploaded 📎", fr: "Nouveau fichier partagé 📎", es: "Nuevo archivo compartido 📎", it: "Nuovo file condiviso 📎", tr: "Yeni Dosya Yüklendi 📎", ar: "تم رفع ملف جديد 📎" },
  fileSubtitle: { de: "Dein Therapeut hat eine Datei für dich hinterlegt.", en: "Your therapist has uploaded a file for you.", fr: "Votre thérapeute a déposé un fichier pour vous.", es: "Tu terapeuta ha subido un archivo para ti.", it: "Il tuo terapeuta ha caricato un file per te.", tr: "Terapistiniz sizin için bir dosya yükledi.", ar: "قام معالجك برفع ملف لك." },
  fileBody: { de: "Dein Therapeut hat eine neue Datei in deinem persönlichen Bereich hinterlegt. Du findest sie unter <em>Dateien</em> in der App.", en: "Your therapist has uploaded a new file to your personal area. You can find it under <em>Files</em> in the app.", fr: "Votre thérapeute a déposé un nouveau fichier dans votre espace personnel. Vous le trouverez sous <em>Fichiers</em> dans l'application.", es: "Tu terapeuta ha subido un nuevo archivo a tu área personal. Lo encontrarás en <em>Archivos</em> en la app.", it: "Il tuo terapeuta ha caricato un nuovo file nella tua area personale. Lo trovi sotto <em>File</em> nell'app.", tr: "Terapistiniz kişisel alanınıza yeni bir dosya yükledi. Bunu uygulamada <em>Dosyalar</em> altında bulabilirsiniz.", ar: "قام معالجك برفع ملف جديد في منطقتك الشخصية. يمكنك العثور عليه تحت <em>الملفات</em> في التطبيق." },
  fileLabel: { de: "Datei", en: "File", fr: "Fichier", es: "Archivo", it: "File", tr: "Dosya", ar: "ملف" },
  viewFiles: { de: "Dateien ansehen →", en: "View Files →", fr: "Voir les fichiers →", es: "Ver archivos →", it: "Vedi file →", tr: "Dosyaları Görüntüle →", ar: "عرض الملفات ←" },
  resourceTitle: { de: "Neue Ressource geteilt", en: "New Resource Shared", fr: "Nouvelle ressource partagée", es: "Nuevo recurso compartido", it: "Nuova risorsa condivisa", tr: "Yeni Kaynak Paylaşıldı", ar: "تمت مشاركة مورد جديد" },
  resourceSubtitle: { de: "Dein Therapeut hat dir etwas Nützliches bereitgestellt.", en: "Your therapist has shared something useful with you.", fr: "Votre thérapeute a partagé quelque chose d'utile avec vous.", es: "Tu terapeuta ha compartido algo útil contigo.", it: "Il tuo terapeuta ha condiviso qualcosa di utile con te.", tr: "Terapistiniz sizinle faydalı bir şey paylaştı.", ar: "شارك معالجك شيئاً مفيداً معك." },
  viewResources: { de: "Ressourcen ansehen →", en: "View Resources →", fr: "Voir les ressources →", es: "Ver recursos →", it: "Vedi risorse →", tr: "Kaynakları Görüntüle →", ar: "عرض الموارد ←" },
  checkinTitle: { de: "Dein täglicher Check-in wartet 🌅", en: "Your Daily Check-in Awaits 🌅", fr: "Votre check-in quotidien vous attend 🌅", es: "Tu check-in diario te espera 🌅", it: "Il tuo check-in giornaliero ti aspetta 🌅", tr: "Günlük Check-in'iniz Bekliyor 🌅", ar: "تسجيل الدخول اليومي في انتظارك 🌅" },
  checkinSubtitle: { de: "Wie geht es dir heute?", en: "How are you feeling today?", fr: "Comment vous sentez-vous aujourd'hui ?", es: "¿Cómo te sientes hoy?", it: "Come ti senti oggi?", tr: "Bugün nasıl hissediyorsunuz?", ar: "كيف تشعر اليوم؟" },
  checkinBody: { de: "Du hast deinen heutigen Check-in noch nicht abgeschlossen. Nimm dir kurz einen Moment, um deine Stimmung zu reflektieren. Es dauert nur 30 Sekunden!", en: "You haven't completed your daily check-in yet. Take a moment to reflect on your mood. It only takes 30 seconds!", fr: "Vous n'avez pas encore complété votre check-in du jour. Prenez un moment pour réfléchir à votre humeur.", es: "Aún no has completado tu check-in diario. Tómate un momento para reflexionar sobre tu estado de ánimo.", it: "Non hai ancora completato il check-in di oggi. Prenditi un momento per riflettere sul tuo umore.", tr: "Günlük check-in'inizi henüz tamamlamadınız. Ruh halinizi yansıtmak için bir dakikanızı ayırın.", ar: "لم تكمل تسجيل الدخول اليومي بعد. خذ لحظة للتفكير في مزاجك." },
  startCheckin: { de: "Check-in starten →", en: "Start Check-in →", fr: "Démarrer le check-in →", es: "Iniciar check-in →", it: "Inizia check-in →", tr: "Check-in'i Başlat →", ar: "ابدأ تسجيل الدخول ←" },
  openApp: { de: "App öffnen →", en: "Open App →", fr: "Ouvrir l'app →", es: "Abrir app →", it: "Apri app →", tr: "Uygulamayı Aç →", ar: "فتح التطبيق ←" },
  newNotification: { de: "Neue Benachrichtigung", en: "New Notification", fr: "Nouvelle notification", es: "Nueva notificación", it: "Nuova notifica", tr: "Yeni Bildirim", ar: "إشعار جديد" },
  notificationReceived: { de: "Du hast eine neue Benachrichtigung erhalten.", en: "You have received a new notification.", fr: "Vous avez reçu une nouvelle notification.", es: "Has recibido una nueva notificación.", it: "Hai ricevuto una nuova notifica.", tr: "Yeni bir bildirim aldınız.", ar: "لقد تلقيت إشعاراً جديداً." },
  contactTherapist: { de: "Falls du Fragen hast, wende dich direkt an deinen Therapeuten.", en: "If you have questions, contact your therapist directly.", fr: "Si vous avez des questions, contactez directement votre thérapeute.", es: "Si tienes preguntas, contacta directamente a tu terapeuta.", it: "Se hai domande, contatta direttamente il tuo terapeuta.", tr: "Sorularınız varsa doğrudan terapistinizle iletişime geçin.", ar: "إذا كانت لديك أسئلة، تواصل مع معالجك مباشرة." },
};

function tr(key: string, lang: Lang): string {
  return t[key]?.[lang] || t[key]?.["de"] || key;
}

// ────────────────────────────────────────────────────────────
// Email HTML Template Builder
// ────────────────────────────────────────────────────────────

function baseTemplate(content: string, lang: Lang = "de"): string {
  const dir = lang === "ar" ? ' dir="rtl"' : '';
  return `
<!DOCTYPE html>
<html lang="${lang}"${dir}>
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
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    ${content}
  </div>
  <div class="footer">
    <p>${tr("footerSent", lang)} <strong>Therapie-App</strong>.<br>
    ${tr("footerQuestions", lang)}<br>
    <br>
    &copy; ${new Date().getFullYear()} johanneschrist.com &mdash; ${tr("footerRights", lang)}</p>
  </div>
</div>
</body>
</html>`;
}

function exerciseAssignedTemplate(exerciseName: string, lang: Lang = "de"): string {
  return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">${tr("exerciseTitle", lang)}</div>
      <div class="header-subtitle">${tr("exerciseSubtitle", lang)}</div>
    </div>
    <div class="body">
      <p class="greeting">${tr("greeting", lang)},</p>
      <p class="message">${tr("exerciseBody", lang)}</p>
      <div class="info-box">
        <div class="info-box-label">${tr("exerciseLabel", lang)}</div>
        <div class="info-box-value">📋 ${exerciseName}</div>
      </div>
      <p class="message">${tr("exerciseEncouragement", lang)}</p>
      <a href="https://cozy-counsel-app.lovable.app" class="cta-btn">${tr("openExercise", lang)}</a>
      <div class="divider"></div>
      <p class="message" style="font-size:13px; color:#9CA3AF;">${tr("contactTherapist", lang)}</p>
    </div>
  `, lang);
}

function resourceSharedTemplate(resourceTitle: string, resourceType: string, lang: Lang = "de"): string {
  const emoji = resourceType === 'pdf' ? '📄' : '🔗';
  const typeLabel = resourceType === 'pdf' ? 'PDF' : 'Link';
  return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">${tr("resourceTitle", lang)} ${emoji}</div>
      <div class="header-subtitle">${tr("resourceSubtitle", lang)}</div>
    </div>
    <div class="body">
      <p class="greeting">${tr("greeting", lang)},</p>
      <div class="info-box">
        <div class="info-box-label">${typeLabel}</div>
        <div class="info-box-value">${emoji} ${resourceTitle}</div>
      </div>
      <a href="https://cozy-counsel-app.lovable.app" class="cta-btn">${tr("viewResources", lang)}</a>
    </div>
  `, lang);
}

function checkinReminderTemplate(lang: Lang = "de"): string {
  return baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%);">
      <div class="header-logo" style="color:rgba(255,255,255,0.6);">Therapie-App</div>
      <div class="header-title">${tr("checkinTitle", lang)}</div>
      <div class="header-subtitle">${tr("checkinSubtitle", lang)}</div>
    </div>
    <div class="body">
      <p class="greeting">${tr("greeting", lang)},</p>
      <p class="message">${tr("checkinBody", lang)}</p>
      <a href="https://cozy-counsel-app.lovable.app" class="cta-btn" style="background: linear-gradient(135deg, #D4AF37, #AA7C11);">${tr("startCheckin", lang)}</a>
    </div>
  `, lang);
}

function generalTemplate(title: string, body: string, lang: Lang = "de"): string {
  return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">${title}</div>
    </div>
    <div class="body">
      <p class="greeting">${tr("greeting", lang)},</p>
      <p class="message">${body}</p>
      <a href="https://cozy-counsel-app.lovable.app" class="cta-btn">${tr("openApp", lang)}</a>
    </div>
  `, lang);
}

function appointmentSavedTemplate(appointmentInfo: string, lang: Lang = "de"): string {
  return baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #E91E8C 0%, #C2185B 100%);">
      <div class="header-logo" style="color:rgba(255,255,255,0.6);">Therapie-App</div>
      <div class="header-title">${tr("appointmentTitle", lang)}</div>
      <div class="header-subtitle">${tr("appointmentSubtitle", lang)}</div>
    </div>
    <div class="body">
      <p class="greeting">${tr("greeting", lang)},</p>
      <p class="message">${tr("appointmentBody", lang)}</p>
      <div class="info-box">
        <div class="info-box-label">${tr("appointmentLabel", lang)}</div>
        <div class="info-box-value">📅 ${appointmentInfo}</div>
      </div>
      <a href="https://cozy-counsel-app.lovable.app" class="cta-btn" style="background: linear-gradient(135deg, #E91E8C, #C2185B);">${tr("toDashboard", lang)}</a>
    </div>
  `, lang);
}

function fileUploadedTemplate(fileName: string, lang: Lang = "de"): string {
  return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">${tr("fileTitle", lang)}</div>
      <div class="header-subtitle">${tr("fileSubtitle", lang)}</div>
    </div>
    <div class="body">
      <p class="greeting">${tr("greeting", lang)},</p>
      <p class="message">${tr("fileBody", lang)}</p>
      <div class="info-box">
        <div class="info-box-label">${tr("fileLabel", lang)}</div>
        <div class="info-box-value">📎 ${fileName}</div>
      </div>
      <a href="https://cozy-counsel-app.lovable.app" class="cta-btn">${tr("viewFiles", lang)}</a>
    </div>
  `, lang);
}

function appointmentSavedTemplate(appointmentInfo: string): string {
  return baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #E91E8C 0%, #C2185B 100%);">
      <div class="header-logo" style="color:rgba(255,255,255,0.6);">Therapie-App</div>
      <div class="header-title">Neuer Termin eingetragen 📅</div>
      <div class="header-subtitle">Dein Therapeut hat einen Termin für dich geplant.</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">
        Dein Therapeut hat einen neuen Termin für dich eingetragen. Bitte merke dir den folgenden Termin vor:
      </p>
      <div class="info-box">
        <div class="info-box-label">Nächster Termin</div>
        <div class="info-box-value">📅 ${appointmentInfo}</div>
      </div>
      <p class="message">
        Du findest den Termin auch auf deinem Dashboard in der App. Bei Fragen oder falls du den Termin verschieben möchtest, wende dich direkt an deinen Therapeuten.
      </p>
      <a href="https://therapieprozessunterstuetzung.web.app" class="cta-btn" style="background: linear-gradient(135deg, #E91E8C, #C2185B);">Zum Dashboard →</a>
    </div>
  `);
}

function fileUploadedTemplate(fileName: string): string {
  return baseTemplate(`
    <div class="header">
      <div class="header-logo">Therapie-App</div>
      <div class="header-title">Neue Datei bereitgestellt 📎</div>
      <div class="header-subtitle">Dein Therapeut hat eine Datei für dich hinterlegt.</div>
    </div>
    <div class="body">
      <p class="greeting">Hallo,</p>
      <p class="message">
        Dein Therapeut hat eine neue Datei in deinem persönlichen Bereich hinterlegt. Du findest sie unter <em>Dateien</em> in der App.
      </p>
      <div class="info-box">
        <div class="info-box-label">Datei</div>
        <div class="info-box-value">📎 ${fileName}</div>
      </div>
      <a href="https://therapieprozessunterstuetzung.web.app" class="cta-btn">Dateien ansehen →</a>
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
  { document: "notifications/{notificationId}", retry: true },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }

    const data = snapshot.data();
    if (data?.status === "processed") {
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
    let deliveryChannel: "push" | "email" | null = null;

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new Error(`User document not found for userId: ${userId}`);
      }

      const userData = userDoc.data();
      const lastActivePlatform = userData?.lastActivePlatform || "web";
      const pushToken = userData?.pushToken;
      const email = userData?.email;

      // Push notification for active app users with valid Expo token.
      if (lastActivePlatform === "app" && pushToken && Expo.isExpoPushToken(pushToken)) {
        console.log(`Sending push notification to user ${userId}`);
        const messages = [{
          to: pushToken,
          sound: "default" as const,
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
      } else if (email) {
        // Email fallback for web users / users without push token.
        console.log(`Sending email notification to user ${userId} (${email}), type: ${type}`);

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
          case "appointment_saved":
            html = appointmentSavedTemplate(body || "Nächster Termin wurde eingetragen");
            subject = "📅 Neuer Termin eingetragen";
            break;
          case "FILE_UPLOAD":
            html = fileUploadedTemplate(title || "Neue Datei");
            subject = `📎 Neue Datei: ${title || "Neue Datei"}`;
            break;
          default:
            html = generalTemplate(
              title || "Neue Benachrichtigung",
              body || "Du hast eine neue Benachrichtigung erhalten."
            );
            subject = title || "Neue Benachrichtigung von deiner Therapie-App";
        }

        const resendData = await resend.emails.send({
          from: "Therapie-App <noreply@johanneschrist.com>",
          to: [email],
          subject,
          html,
        });
        console.log(`Successfully sent email (type: ${type}). ID: ${resendData.data?.id}`);

        await db.collection("mail").add({
          to: email,
          type: type || "general",
          message: { subject, html },
          status: "sent-via-resend",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        delivered = true;
        deliveryChannel = "email";
      } else {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown notification processing error";
      console.error("Error processing notification:", error);
      await snapshot.ref.update({
        status: "error",
        error: message,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      throw error;
    }
  }
);
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
