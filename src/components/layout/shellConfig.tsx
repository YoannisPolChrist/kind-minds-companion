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

export const clientNavItems: ShellNavItem[] = [
  {
    to: "/",
    label: "Home",
    description: "Dashboard und heutige Aufgaben",
    icon: Home,
    matches: (pathname) => pathname === "/",
  },
  {
    to: "/checkin",
    label: "Check-in",
    description: "Tägliches Wohlbefinden festhalten",
    icon: CalendarDays,
    matches: (pathname) => pathname === "/checkin",
  },
  {
    to: "/checkins",
    label: "Tagebuch",
    description: "Einträge, Trends und Notizen",
    icon: NotebookPen,
    matches: (pathname) => pathname === "/checkins" || pathname === "/notes",
  },
  {
    to: "/exercises",
    label: "Übungen",
    description: "Offene und erledigte Module",
    icon: BookOpen,
    matches: (pathname) => pathname === "/exercises" || pathname.startsWith("/exercise/"),
  },
  {
    to: "/resources",
    label: "Bibliothek",
    description: "Links, Dateien und Materialien",
    icon: LibraryBig,
    matches: (pathname) => pathname === "/resources",
  },
  {
    to: "/history",
    label: "Verlauf",
    description: "Rückblick auf Aktivitäten",
    icon: History,
    matches: (pathname) => pathname === "/history",
  },
  {
    to: "/settings",
    label: "Einstellungen",
    description: "Profil, Kalender und Konto",
    icon: Settings,
    matches: (pathname) => pathname === "/settings",
  },
];

export const therapistNavItems: ShellNavItem[] = [
  {
    to: "/therapist",
    label: "Dashboard",
    description: "Arbeitsbereiche und Übersicht",
    icon: LayoutDashboard,
    matches: (pathname) => pathname === "/" || pathname === "/therapist",
  },
  {
    to: "/therapist/clients",
    label: "Klienten",
    description: "Begleitung, Termine und Fortschritt",
    icon: Users,
    matches: (pathname) =>
      pathname === "/therapist/clients" || pathname.startsWith("/therapist/client/"),
  },
  {
    to: "/therapist/templates",
    label: "Vorlagen",
    description: "Übungsvorlagen verwalten",
    icon: LayoutTemplate,
    matches: (pathname) =>
      pathname === "/therapist/templates" || pathname.startsWith("/therapist/template/"),
  },
  {
    to: "/therapist/resources",
    label: "Bibliothek",
    description: "Ressourcen für Klienten",
    icon: FileStack,
    matches: (pathname) => pathname === "/therapist/resources",
  },
  {
    to: "/settings",
    label: "Einstellungen",
    description: "Konto, Sync und Konfiguration",
    icon: Settings,
    matches: (pathname) => pathname === "/settings",
  },
];

export const clientBottomNav: ShellQuickAction[] = [
  {
    to: "/",
    label: "Home",
    icon: Home,
    active: (pathname) => pathname === "/",
  },
  {
    to: "/checkins",
    label: "Tagebuch",
    icon: NotebookPen,
    active: (pathname) =>
      pathname === "/checkins" ||
      pathname === "/checkin" ||
      pathname === "/notes" ||
      pathname === "/history",
  },
  {
    to: "/settings",
    label: "Einstellungen",
    icon: Settings,
    active: (pathname) => pathname === "/settings",
  },
];

export const clientQuickActions: ShellQuickAction[] = [
  {
    to: "/checkin",
    label: "Check-in",
    icon: CalendarDays,
    active: (pathname) => pathname === "/checkin",
  },
  {
    to: "/exercises",
    label: "Aufgaben",
    icon: BookOpen,
    active: (pathname) => pathname === "/exercises" || pathname.startsWith("/exercise/"),
  },
  {
    to: "/resources",
    label: "Bibliothek",
    icon: LibraryBig,
    active: (pathname) => pathname === "/resources",
  },
  {
    to: "/history",
    label: "Verlauf",
    icon: History,
    active: (pathname) => pathname === "/history",
  },
];

export function getRoleLabel(profile: UserProfile | null) {
  return profile?.role === "therapist" ? "Therapeutenbereich" : "Klientenbereich";
}

export function getInitials(profile: UserProfile | null) {
  const first = profile?.firstName?.charAt(0) || "";
  const last = profile?.lastName?.charAt(0) || "";
  const initials = `${first}${last}`.trim();
  return initials || "KM";
}
