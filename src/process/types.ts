export type NodeType = "exercise" | "anamnese" | "appointment" | "custom_shape" | "task" | "reflection" | "note" | "milestone" | "checkin" | "document";

export interface Node {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  title: string;
  color?: string;
  shape?: "circle" | "square";
  linkedId?: string;
  metadata?: {
    description?: string;
    date?: string;
    dueDate?: string;
    prompt?: string;
    response?: string;
    completed?: boolean;
    mood?: number;
    energy?: number;
    note?: string;
    tags?: string[];
    url?: string;
    checkinId?: string;
    isJournal?: boolean;
    documentId?: string;
  };
  w?: number;
  h?: number;
  borderStyle?: string;
  borderWidth?: number;
  borderColor?: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export const THEME_COLORS = [
  { name: "Violet", value: "#8B5CF6", bg: "bg-violet-500/10 border-violet-500 text-violet-600 dark:text-violet-400" },
  { name: "Blue", value: "#3B82F6", bg: "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400" },
  { name: "Emerald", value: "#10B981", bg: "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" },
  { name: "Rose", value: "#F43F5E", bg: "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400" },
  { name: "Amber", value: "#F59E0B", bg: "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400" },
];
