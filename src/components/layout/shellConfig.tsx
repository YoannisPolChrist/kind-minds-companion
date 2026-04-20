import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarDays,
  FileStack,
  History,
  Home,
  LayoutDashboard,
  LayoutTemplate,
  LibraryBig,
  NotebookPen,
  Settings,
  Users,
} from "lucide-react";
import type { UserProfile } from "../../hooks/useAuth";
import type { LanguageCode } from "../../hooks/useLanguage";
import { translate } from "../../lib/webLocale";

export type ShellNavItem = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  matches: (pathname: string) => boolean;
};

export type ShellQuickAction = {
  to: string;
  label: string;
  icon: LucideIcon;
  active: (pathname: string) => boolean;
};

export function getClientNavItems(locale: LanguageCode): ShellNavItem[] {
  return [
    {
      to: "/",
      label: translate(locale, { de: "Home", en: "Home", es: "Inicio", fr: "Accueil", it: "Home" }),
      description: translate(locale, {
        de: "Dashboard und heutige Aufgaben",
        en: "Dashboard and today's tasks",
        es: "Panel y tareas de hoy",
        fr: "Tableau de bord et taches du jour",
        it: "Dashboard e compiti di oggi",
      }),
      icon: Home,
      matches: (pathname) => pathname === "/",
    },
    {
      to: "/checkin",
      label: translate(locale, { de: "Check-in", en: "Check-in", es: "Check-in", fr: "Check-in", it: "Check-in" }),
      description: translate(locale, {
        de: "Tägliches Wohlbefinden festhalten",
        en: "Track your daily well-being",
        es: "Registrar tu bienestar diario",
        fr: "Suivre ton bien-etre quotidien",
        it: "Tracciare il tuo benessere quotidiano",
      }),
      icon: CalendarDays,
      matches: (pathname) => pathname === "/checkin",
    },
    {
      to: "/checkins",
      label: translate(locale, { de: "Tagebuch", en: "Journal", es: "Diario", fr: "Journal", it: "Diario" }),
      description: translate(locale, {
        de: "Einträge, Trends und Notizen",
        en: "Entries, trends, and notes",
        es: "Entradas, tendencias y notas",
        fr: "Entrees, tendances et notes",
        it: "Voci, tendenze e note",
      }),
      icon: NotebookPen,
      matches: (pathname) => pathname === "/checkins" || pathname === "/notes",
    },
    {
      to: "/exercises",
      label: translate(locale, { de: "Übungen", en: "Exercises", es: "Ejercicios", fr: "Exercices", it: "Esercizi" }),
      description: translate(locale, {
        de: "Offene und erledigte Module",
        en: "Open and completed modules",
        es: "Modulos abiertos y completados",
        fr: "Modules ouverts et termines",
        it: "Moduli aperti e completati",
      }),
      icon: BookOpen,
      matches: (pathname) => pathname === "/exercises" || pathname.startsWith("/exercise/"),
    },
    {
      to: "/resources",
      label: translate(locale, { de: "Bibliothek", en: "Library", es: "Biblioteca", fr: "Bibliotheque", it: "Libreria" }),
      description: translate(locale, {
        de: "Links, Dateien und Materialien",
        en: "Links, files, and materials",
        es: "Enlaces, archivos y materiales",
        fr: "Liens, fichiers et materiaux",
        it: "Link, file e materiali",
      }),
      icon: LibraryBig,
      matches: (pathname) => pathname === "/resources",
    },
    {
      to: "/history",
      label: translate(locale, { de: "Verlauf", en: "History", es: "Historial", fr: "Historique", it: "Storico" }),
      description: translate(locale, {
        de: "Rückblick auf Aktivitäten",
        en: "Review past activity",
        es: "Revision de actividades",
        fr: "Retour sur les activites",
        it: "Panoramica delle attivita",
      }),
      icon: History,
      matches: (pathname) => pathname === "/history",
    },
    {
      to: "/settings",
      label: translate(locale, { de: "Einstellungen", en: "Settings", es: "Ajustes", fr: "Parametres", it: "Impostazioni" }),
      description: translate(locale, {
        de: "Profil, Kalender und Konto",
        en: "Profile, calendar, and account",
        es: "Perfil, calendario y cuenta",
        fr: "Profil, calendrier et compte",
        it: "Profilo, calendario e account",
      }),
      icon: Settings,
      matches: (pathname) => pathname === "/settings",
    },
  ];
}

export function getTherapistNavItems(locale: LanguageCode): ShellNavItem[] {
  return [
  {
    to: "/therapist",
    label: translate(locale, { de: "Dashboard", en: "Dashboard", es: "Panel", fr: "Tableau de bord", it: "Dashboard" }),
    description: translate(locale, {
      de: "Arbeitsbereiche und Übersicht",
      en: "Workspaces and overview",
      es: "Espacios de trabajo y vista general",
      fr: "Espaces de travail et vue d'ensemble",
      it: "Aree di lavoro e panoramica",
    }),
    icon: LayoutDashboard,
    matches: (pathname) => pathname === "/" || pathname === "/therapist",
  },
  {
    to: "/therapist/clients",
    label: translate(locale, { de: "Klienten", en: "Clients", es: "Clientes", fr: "Clients", it: "Clienti" }),
    description: translate(locale, {
      de: "Begleitung, Termine und Fortschritt",
      en: "Support, appointments, and progress",
      es: "Acompañamiento, citas y progreso",
      fr: "Accompagnement, rendez-vous et progression",
      it: "Supporto, appuntamenti e progressi",
    }),
    icon: Users,
    matches: (pathname) =>
      pathname === "/therapist/clients" || pathname.startsWith("/therapist/client/"),
  },
  {
    to: "/therapist/templates",
    label: translate(locale, { de: "Vorlagen", en: "Templates", es: "Plantillas", fr: "Modeles", it: "Modelli" }),
    description: translate(locale, {
      de: "Übungsvorlagen verwalten",
      en: "Manage exercise templates",
      es: "Gestionar plantillas de ejercicios",
      fr: "Gerer les modeles d'exercices",
      it: "Gestire i modelli di esercizi",
    }),
    icon: LayoutTemplate,
    matches: (pathname) =>
      pathname === "/therapist/templates" || pathname.startsWith("/therapist/template/"),
  },
  {
    to: "/therapist/resources",
    label: translate(locale, { de: "Bibliothek", en: "Library", es: "Biblioteca", fr: "Bibliotheque", it: "Libreria" }),
    description: translate(locale, {
      de: "Ressourcen für Klienten",
      en: "Resources for clients",
      es: "Recursos para clientes",
      fr: "Ressources pour les clients",
      it: "Risorse per i clienti",
    }),
    icon: FileStack,
    matches: (pathname) => pathname === "/therapist/resources",
  },
  {
    to: "/settings",
    label: translate(locale, { de: "Einstellungen", en: "Settings", es: "Ajustes", fr: "Parametres", it: "Impostazioni" }),
    description: translate(locale, {
      de: "Konto, Sync und Konfiguration",
      en: "Account, sync, and configuration",
      es: "Cuenta, sincronizacion y configuracion",
      fr: "Compte, synchro et configuration",
      it: "Account, sincronizzazione e configurazione",
    }),
    icon: Settings,
    matches: (pathname) => pathname === "/settings",
  },
  ];
}

export function getClientBottomNav(locale: LanguageCode): ShellQuickAction[] {
  return [
  {
    to: "/",
    label: translate(locale, { de: "Home", en: "Home", es: "Inicio", fr: "Accueil", it: "Home" }),
    icon: Home,
    active: (pathname) => pathname === "/",
  },
  {
    to: "/checkins",
    label: translate(locale, { de: "Tagebuch", en: "Journal", es: "Diario", fr: "Journal", it: "Diario" }),
    icon: NotebookPen,
    active: (pathname) =>
      pathname === "/checkins" ||
      pathname === "/checkin" ||
      pathname === "/notes" ||
      pathname === "/history",
  },
  {
    to: "/settings",
    label: translate(locale, { de: "Einstellungen", en: "Settings", es: "Ajustes", fr: "Parametres", it: "Impostazioni" }),
    icon: Settings,
    active: (pathname) => pathname === "/settings",
  },
  ];
}

export function getClientQuickActions(locale: LanguageCode): ShellQuickAction[] {
  return [
  {
    to: "/checkin",
    label: translate(locale, { de: "Check-in", en: "Check-in", es: "Check-in", fr: "Check-in", it: "Check-in" }),
    icon: CalendarDays,
    active: (pathname) => pathname === "/checkin",
  },
  {
    to: "/exercises",
    label: translate(locale, { de: "Aufgaben", en: "Exercises", es: "Ejercicios", fr: "Exercices", it: "Esercizi" }),
    icon: BookOpen,
    active: (pathname) => pathname === "/exercises" || pathname.startsWith("/exercise/"),
  },
  {
    to: "/resources",
    label: translate(locale, { de: "Bibliothek", en: "Library", es: "Biblioteca", fr: "Bibliotheque", it: "Libreria" }),
    icon: LibraryBig,
    active: (pathname) => pathname === "/resources",
  },
  {
    to: "/history",
    label: translate(locale, { de: "Verlauf", en: "History", es: "Historial", fr: "Historique", it: "Storico" }),
    icon: History,
    active: (pathname) => pathname === "/history",
  },
  ];
}

export function getRoleLabel(profile: UserProfile | null, locale: LanguageCode) {
  return profile?.role === "therapist"
    ? translate(locale, {
        de: "Therapeutenbereich",
        en: "Therapist area",
        es: "Area del terapeuta",
        fr: "Espace therapeute",
        it: "Area terapista",
      })
    : translate(locale, {
        de: "Klientenbereich",
        en: "Client area",
        es: "Area del cliente",
        fr: "Espace client",
        it: "Area cliente",
      });
}

export function getInitials(profile: UserProfile | null) {
  const first = profile?.firstName?.charAt(0) || "";
  const last = profile?.lastName?.charAt(0) || "";
  const initials = `${first}${last}`.trim();
  return initials || "KM";
}
