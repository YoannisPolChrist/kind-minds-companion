const fs = require('fs');
const content = fs.readFileSync('utils/i18n.ts', 'utf8');

const additions = {
    en: {
        login: `
            email_format_error: "Invalid email format",
            email_label: "Email",
            password_label: "Password",`,
        dashboard: `
            resources: "Resources",
            resources_desc: "Documents & links from your coach",`,
        checkin: `
            how_are_you: "How are you today?",
            feelings_and_tags: "Feelings & Tags",
            note_optional: "Note (optional)",
            save_checkin_tick: "Save Check-in ✓",
            contact_therapist_wa: "Contact Therapist (WhatsApp)",`,
        exercise: `
            play_video: "Play Video",
            your_reflection: "Your Reflection",
            breathing_444: "4-4-4 Breathing Rhythm",
            is_running: "running...",`,
        therapist: `
            resources_title: "Resources",
            resources_manage: "Manage Library",
            clients_must_register: "Clients must register in the app before you can assign them specific therapy tasks.",
            add_new_resource: "Add New Resource",
            pdf_upload: "PDF Upload",
            web_link: "Web Link",
            available_resources: "Available Resources",
            no_resources: "No resources available yet.",
            last_session_notes: "Last Session Notes",`
    },
    de: {
        login: `
            email_format_error: "Ungültiges E-Mail Format",
            email_label: "E-Mail",
            password_label: "Passwort",`,
        dashboard: `
            resources: "Ressourcen",
            resources_desc: "Dokumente & Links von deinem Coach",`,
        checkin: `
            how_are_you: "Wie geht es dir?",
            feelings_and_tags: "Gefühle & Tags",
            note_optional: "Notiz (optional)",
            save_checkin_tick: "Check-in speichern ✓",
            contact_therapist_wa: "Therapeut kontaktieren (WhatsApp)",`,
        exercise: `
            play_video: "Video abspielen",
            your_reflection: "Deine Reflektion",
            breathing_444: "4-4-4 Atemrhythmus",
            is_running: "läuft...",`,
        therapist: `
            resources_title: "Ressourcen",
            resources_manage: "Bibliothek verwalten",
            clients_must_register: "Klienten müssen sich in der App registrieren, bevor du ihnen spezifische Therapie-Aufgaben zuteilen kannst.",
            add_new_resource: "Neue Ressource hinzufügen",
            pdf_upload: "PDF Upload",
            web_link: "Web Link",
            available_resources: "Verfügbare Ressourcen",
            no_resources: "Noch keine Ressourcen vorhanden.",
            last_session_notes: "Letzte Session Notes",`
    },
    fr: {
        login: `
            email_format_error: "Format d'e-mail invalide",
            email_label: "E-mail",
            password_label: "Mot de passe",`,
        dashboard: `
            resources: "Ressources",
            resources_desc: "Documents et liens de votre coach",`,
        checkin: `
            how_are_you: "Comment allez-vous ?",
            feelings_and_tags: "Émotions et Tags",
            note_optional: "Note (facultatif)",
            save_checkin_tick: "Enregistrer le Bilan ✓",
            contact_therapist_wa: "Contacter le Thérapeute (WhatsApp)",`,
        exercise: `
            play_video: "Lire la vidéo",
            your_reflection: "Votre Réflexion",
            breathing_444: "Rythme de respiration 4-4-4",
            is_running: "en cours...",`,
        therapist: `
            resources_title: "Ressources",
            resources_manage: "Gérer la bibliothèque",
            clients_must_register: "Les clients doivent s'inscrire dans l'application avant que vous puissiez leur assigner des tâches.",
            add_new_resource: "Ajouter une ressource",
            pdf_upload: "Télécharger PDF",
            web_link: "Lien Web",
            available_resources: "Ressources disponibles",
            no_resources: "Aucune ressource disponible pour le moment.",
            last_session_notes: "Notes de la dernière session",`
    },
    es: {
        login: `
            email_format_error: "Formato de correo inválido",
            email_label: "Correo",
            password_label: "Contraseña",`,
        dashboard: `
            resources: "Recursos",
            resources_desc: "Documentos y enlaces de tu coach",`,
        checkin: `
            how_are_you: "¿Cómo estás?",
            feelings_and_tags: "Emociones y Etiquetas",
            note_optional: "Nota (opcional)",
            save_checkin_tick: "Guardar Registro ✓",
            contact_therapist_wa: "Contactar al Terapeuta (WhatsApp)",`,
        exercise: `
            play_video: "Reproducir video",
            your_reflection: "Tu Reflexión",
            breathing_444: "Ritmo de respiración 4-4-4",
            is_running: "en curso...",`,
        therapist: `
            resources_title: "Recursos",
            resources_manage: "Gestionar biblioteca",
            clients_must_register: "Los clientes deben registrarse en la aplicación antes de que les asignes tareas.",
            add_new_resource: "Añadir Nuevo Recurso",
            pdf_upload: "Subir PDF",
            web_link: "Enlace Web",
            available_resources: "Recursos Disponibles",
            no_resources: "Aún no hay recursos.",
            last_session_notes: "Notas de la Última Sesión",`
    },
    it: {
        login: `
            email_format_error: "Formato email non valido",
            email_label: "Email",
            password_label: "Password",`,
        dashboard: `
            resources: "Risorse",
            resources_desc: "Documenti e link dal tuo coach",`,
        checkin: `
            how_are_you: "Come stai?",
            feelings_and_tags: "Emozioni e Tag",
            note_optional: "Nota (opzionale)",
            save_checkin_tick: "Salva Check-in ✓",
            contact_therapist_wa: "Contatta Terapista (WhatsApp)",`,
        exercise: `
            play_video: "Riproduci video",
            your_reflection: "La tua Riflessione",
            breathing_444: "Ritmo di respirazione 4-4-4",
            is_running: "in corso...",`,
        therapist: `
            resources_title: "Risorse",
            resources_manage: "Gestisci Libreria",
            clients_must_register: "I clienti devono registrarsi prima di poter assegnare loro compiti specifici.",
            add_new_resource: "Aggiungi Nuova Risorsa",
            pdf_upload: "Carica PDF",
            web_link: "Link Web",
            available_resources: "Risorse Disponibili",
            no_resources: "Nessuna risorsa ancora presente.",
            last_session_notes: "Note dell'Ultima Sessione",`
    }
};

const defaultRes = {
    en: String.raw\`        resources: {
            no_resources: "No Resources",
            no_documents_uploaded: "No documents have been uploaded yet."
        },\`,
    de: String.raw\`        resources: {
            no_resources: "Keine Ressourcen",
            no_documents_uploaded: "Aktuell wurden noch keine Dokumente hochgeladen."
        },\`,
    fr: String.raw\`        resources: {
            no_resources: "Pas de Ressources",
            no_documents_uploaded: "Aucun document n'a encore été téléchargé."
        },\`,
    es: String.raw\`        resources: {
            no_resources: "Sin Recursos",
            no_documents_uploaded: "No se han subido documentos aún."
        },\`,
    it: String.raw\`        resources: {
            no_resources: "Nessuna Risorsa",
            no_documents_uploaded: "Nessun documento caricato per ora."
        },\`
};

let output = '';
let currentLang = null;

const lines = content.split('\\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we entered a language block
    const langMatch = line.match(/^\\s+(en|de|fr|es|it):\\s*\\{/);
    if (langMatch) {
        currentLang = langMatch[1];
    }

    // Add sections if we match them inside a language block
    if (currentLang) {
        const loginMatch = line.match(/^(\\s+)login:\\s*\\{/);
        if (loginMatch) {
            output += line + '\\n';
            output += additions[currentLang].login + '\\n';
            continue;
        }
        const dashboardMatch = line.match(/^(\\s+)dashboard:\\s*\\{/);
        if (dashboardMatch) {
            output += line + '\\n';
            output += additions[currentLang].dashboard + '\\n';
            continue;
        }
        const checkinMatch = line.match(/^(\\s+)checkin:\\s*\\{/);
        if (checkinMatch) {
            output += line + '\\n';
            output += additions[currentLang].checkin + '\\n';
            continue;
        }
        const exerciseMatch = line.match(/^(\\s+)exercise:\\s*\\{/);
        if (exerciseMatch) {
            output += line + '\\n';
            output += additions[currentLang].exercise + '\\n';
            continue;
        }
        const therapistMatch = line.match(/^(\\s+)therapist:\\s*\\{/);
        if (therapistMatch) {
            output += line + '\\n';
            output += additions[currentLang].therapist + '\\n';
            continue;
        }

        // Add resources block before templates starts
        const templatesMatch = line.match(/^(\\s+)templates:\\s*\\{/);
        if (templatesMatch) {
            output += defaultRes[currentLang] + '\\n';
            output += line + '\\n';
            continue;
        }
    }

    output += line + '\\n';
}

fs.writeFileSync('utils/i18n.ts', output);
console.log("Updated utils/i18n.ts");
