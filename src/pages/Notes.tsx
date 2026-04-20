import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, getDocs, where } from "firebase/firestore/lite";
import { dbLite } from "../lib/firebaseDbLite";
import { getFirestoreClient, getFirestoreDb } from "../lib/firebaseDb";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { translate } from "../lib/webLocale";
import {
  ArrowLeft, Plus, Edit3, Trash2, X, Calendar, Search,
  Lock, Unlock, ChevronDown, Save,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, PressableScale, TiltCard } from "../components/motion";
import { useOptionalClientOnboarding } from "../components/onboarding/ClientOnboarding";
import { BannerToast } from "../components/ui/Toast";
import { EMOTION_PRESETS, getEmotionByScore, getEmotionLabel } from "../../constants/emotions";
import { getRandomHeaderImage } from "../constants/headerImages";

interface Note {
  id: string;
  clientId: string;
  title?: string;
  content: string;
  isShared?: boolean;
  authorRole?: string;
  type?: string;
  emotionScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

const headerImg = getRandomHeaderImage();

const RICH_TEXT_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "small",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "span",
  "div",
]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isHtmlContent(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function plainTextToRichHtml(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "<p></p>";

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function sanitizeRichText(value: string) {
  if (!value) return "<p></p>";
  if (typeof window === "undefined") return value;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${value}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "<p></p>";

  const cleanNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return doc.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (!RICH_TEXT_TAGS.has(tag)) {
      const fragment = doc.createDocumentFragment();
      Array.from(element.childNodes).forEach((child) => {
        const cleanChild = cleanNode(child);
        if (cleanChild) fragment.appendChild(cleanChild);
      });
      return fragment;
    }

    const cleanElement = doc.createElement(tag);
    const color = element.style.color?.trim();
    const backgroundColor = element.style.backgroundColor?.trim();

    if (color) cleanElement.style.color = color;
    if (backgroundColor) cleanElement.style.backgroundColor = backgroundColor;

    Array.from(element.childNodes).forEach((child) => {
      const cleanChild = cleanNode(child);
      if (cleanChild) cleanElement.appendChild(cleanChild);
    });

    return cleanElement;
  };

  const wrapper = doc.createElement("div");
  Array.from(root.childNodes).forEach((child) => {
    const cleanChild = cleanNode(child);
    if (cleanChild) wrapper.appendChild(cleanChild);
  });

  return wrapper.innerHTML.trim() || "<p></p>";
}

function getNotePlainText(value: string) {
  if (!value) return "";
  if (!isHtmlContent(value)) return value;
  if (typeof window === "undefined") return value.replace(/<[^>]+>/g, " ");

  const parser = new DOMParser();
  const doc = parser.parseFromString(value, "text/html");
  return doc.body.textContent || "";
}

function normalizeEditorContent(value: string) {
  return sanitizeRichText(isHtmlContent(value) ? value : plainTextToRichHtml(value));
}

export default function Notes() {
  const { profile } = useAuth();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const onboarding = useOptionalClientOnboarding();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editShared, setEditShared] = useState(false);
  const [editEmotionScore, setEditEmotionScore] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editorTextEmpty, setEditorTextEmpty] = useState(true);
  const [editorFormats, setEditorFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    heading: false,
  });

  const emotionChoices = useMemo(() => {
    const byScore = new Map<number, (typeof EMOTION_PRESETS)[number]>();
    EMOTION_PRESETS.forEach((preset) => {
      if (!byScore.has(preset.score)) byScore.set(preset.score, preset);
    });
    return Array.from(byScore.values()).sort((a, b) => b.score - a.score);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(dbLite, "client_notes"), where("clientId", "==", profile.id)));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note));
        data.sort((a, b) => {
          const da = a.updatedAt || a.createdAt || "";
          const db_ = b.updatedAt || b.createdAt || "";
          return db_.localeCompare(da);
        });
        setNotes(data);
      } catch (e) {
        console.error("Error fetching notes:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return notes;
    const q = searchTerm.toLowerCase();
    return notes.filter((n) => {
      const searchSource = `${n.title || ""} ${getNotePlainText(n.content || "")}`.toLowerCase();
      return searchSource.includes(q);
    });
  }, [notes, searchTerm]);

  const grouped = useMemo(() => {
    const groups: Record<string, Note[]> = {};
    filtered.forEach((n) => {
      const dateStr = n.updatedAt || n.createdAt || new Date().toISOString();
      const date = new Date(dateStr);
      const key = date.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return Object.entries(groups);
  }, [filtered, locale]);

  const activeEditorEmotion =
    emotionChoices.find((emotion) => emotion.score === editEmotionScore) ||
    emotionChoices[emotionChoices.length - 1];
  const text = useMemo(() => ({
    back: translate(locale, { de: "Zurück", en: "Back", es: "Volver", fr: "Retour", it: "Indietro" }),
    newNote: translate(locale, { de: "Neue Notiz", en: "New note", es: "Nueva nota", fr: "Nouvelle note", it: "Nuova nota" }),
    journal: translate(locale, { de: "Therapie-Tagebuch", en: "Therapy journal", es: "Diario terapéutico", fr: "Journal thérapeutique", it: "Diario terapeutico" }),
    entryOne: translate(locale, { de: "Eintrag", en: "entry", es: "entrada", fr: "entrée", it: "voce" }),
    entryMany: translate(locale, { de: "Einträge", en: "entries", es: "entradas", fr: "entrées", it: "voci" }),
    searchPlaceholder: translate(locale, { de: "Tagebuch durchsuchen...", en: "Search journal...", es: "Buscar en el diario...", fr: "Rechercher dans le journal...", it: "Cerca nel diario..." }),
    noResults: translate(locale, { de: "Keine Treffer", en: "No results", es: "Sin resultados", fr: "Aucun résultat", it: "Nessun risultato" }),
    noEntries: translate(locale, { de: "Noch keine Einträge", en: "No entries yet", es: "Aún no hay entradas", fr: "Aucune entrée pour l'instant", it: "Ancora nessuna voce" }),
    tryAnotherSearch: translate(locale, { de: "Versuche einen anderen Suchbegriff.", en: "Try a different search term.", es: "Prueba con otro término de búsqueda.", fr: "Essaie un autre terme de recherche.", it: "Prova un altro termine di ricerca." }),
    firstEntryHint: translate(locale, { de: "Erstelle deinen ersten Eintrag mit dem + Button.", en: "Create your first entry with the + button.", es: "Crea tu primera entrada con el botón +.", fr: "Crée ta première entrée avec le bouton +.", it: "Crea la tua prima voce con il pulsante +." }),
    journalEntry: translate(locale, { de: "Tagebucheintrag", en: "Journal entry", es: "Entrada del diario", fr: "Entrée du journal", it: "Voce del diario" }),
    therapistNote: translate(locale, { de: "Therapeuten-Notiz", en: "Therapist note", es: "Nota del terapeuta", fr: "Note du thérapeute", it: "Nota del terapeuta" }),
    fromTherapist: translate(locale, { de: "Vom Therapeut", en: "From therapist", es: "Del terapeuta", fr: "Du thérapeute", it: "Dal terapeuta" }),
    noContent: translate(locale, { de: "Kein Inhalt.", en: "No content.", es: "Sin contenido.", fr: "Aucun contenu.", it: "Nessun contenuto." }),
    edit: translate(locale, { de: "Bearbeiten", en: "Edit", es: "Editar", fr: "Modifier", it: "Modifica" }),
    delete: translate(locale, { de: "Löschen", en: "Delete", es: "Eliminar", fr: "Supprimer", it: "Elimina" }),
    editEntry: translate(locale, { de: "Eintrag bearbeiten", en: "Edit entry", es: "Editar entrada", fr: "Modifier l'entrée", it: "Modifica voce" }),
    newJournalEntry: translate(locale, { de: "Neuer Tagebucheintrag", en: "New journal entry", es: "Nueva entrada del diario", fr: "Nouvelle entrée du journal", it: "Nuova voce del diario" }),
    save: translate(locale, { de: "Speichern", en: "Save", es: "Guardar", fr: "Enregistrer", it: "Salva" }),
    cancel: translate(locale, { de: "Abbrechen", en: "Cancel", es: "Cancelar", fr: "Annuler", it: "Annulla" }),
    deleteEntryQuestion: translate(locale, { de: "Eintrag löschen?", en: "Delete entry?", es: "¿Eliminar entrada?", fr: "Supprimer l'entrée ?", it: "Eliminare la voce?" }),
    entryUpdated: translate(locale, { de: "Eintrag aktualisiert", en: "Entry updated", es: "Entrada actualizada", fr: "Entrée mise à jour", it: "Voce aggiornata" }),
    entryCreated: translate(locale, { de: "Eintrag angelegt", en: "Entry created", es: "Entrada creada", fr: "Entrée créée", it: "Voce creata" }),
    saveFailed: translate(locale, { de: "Speichern fehlgeschlagen", en: "Saving failed", es: "Error al guardar", fr: "Echec de l'enregistrement", it: "Salvataggio non riuscito" }),
    entryDeleted: translate(locale, { de: "Eintrag gelöscht", en: "Entry deleted", es: "Entrada eliminada", fr: "Entree supprimee", it: "Voce eliminata" }),
    deleteFailed: translate(locale, { de: "Löschen fehlgeschlagen", en: "Delete failed", es: "Error al eliminar", fr: "Echec de la suppression", it: "Eliminazione non riuscita" }),
    editorIntro: translate(locale, {
      de: "Halte Gedanken, Gefühle und das Teilen mit deinem Therapeuten klar an einem Ort fest.",
      en: "Keep thoughts, feelings, and sharing with your therapist clearly in one place.",
      es: "Mantén tus pensamientos, emociones y el contenido compartido con tu terapeuta claramente en un solo lugar.",
      fr: "Rassemble clairement au même endroit tes pensées, tes émotions et ce que tu partages avec ton thérapeute.",
      it: "Tieni pensieri, emozioni e condivisione con il tuo terapeuta ben raccolti in un unico posto.",
    }),
    activeMood: translate(locale, { de: "Aktive Stimmung", en: "Active mood", es: "Estado de ánimo activo", fr: "Humeur active", it: "Umore attivo" }),
    shared: translate(locale, { de: "Geteilt", en: "Shared", es: "Compartido", fr: "Partagé", it: "Condiviso" }),
    private: translate(locale, { de: "Privat", en: "Private", es: "Privado", fr: "Privé", it: "Privato" }),
    titleOptional: translate(locale, { de: "Titel (optional)", en: "Title (optional)", es: "Título (opcional)", fr: "Titre (optionnel)", it: "Titolo (facoltativo)" }),
    noteTitlePlaceholder: translate(locale, { de: "Titel der Notiz...", en: "Note title...", es: "Título de la nota...", fr: "Titre de la note...", it: "Titolo della nota..." }),
    content: translate(locale, { de: "Inhalt", en: "Content", es: "Contenido", fr: "Contenu", it: "Contenuto" }),
    small: translate(locale, { de: "Klein", en: "Small", es: "Pequeño", fr: "Petit", it: "Piccolo" }),
    smallerTextHint: translate(locale, { de: "kleinere Schrift", en: "smaller text", es: "texto más pequeño", fr: "texte plus petit", it: "testo più piccolo" }),
    highlight: translate(locale, { de: "Marker", en: "Highlight", es: "Marcador", fr: "Surlignage", it: "Evidenzia" }),
    accent: translate(locale, { de: "Akzent", en: "Accent", es: "Acento", fr: "Accent", it: "Accento" }),
    accentHint: translate(locale, { de: "farbig hervorheben", en: "highlight with color", es: "resaltar con color", fr: "mettre en valeur en couleur", it: "evidenziare con colore" }),
    clear: translate(locale, { de: "Klar", en: "Clear", es: "Limpiar", fr: "Effacer", it: "Pulisci" }),
    clearFormatting: translate(locale, { de: "Formatierung entfernen", en: "Remove formatting", es: "Quitar formato", fr: "Supprimer la mise en forme", it: "Rimuovi formattazione" }),
    yourThoughts: translate(locale, { de: "Deine Gedanken...", en: "Your thoughts...", es: "Tus pensamientos...", fr: "Tes pensées...", it: "I tuoi pensieri..." }),
    formattingHint: translate(locale, {
      de: "Formatierungen funktionieren direkt im Editor, inklusive Tastenkürzeln für fett, kursiv, unterstrichen, Überschrift und Marker.",
      en: "Formatting works directly in the editor, including keyboard shortcuts for bold, italic, underline, heading, and highlight.",
      es: "El formato funciona directamente en el editor, incluidos atajos para negrita, cursiva, subrayado, encabezado y resaltado.",
      fr: "La mise en forme fonctionne directement dans l'éditeur, y compris les raccourcis pour gras, italique, souligné, titre et surlignage.",
      it: "La formattazione funziona direttamente nell'editor, incluse le scorciatoie per grassetto, corsivo, sottolineato, titolo ed evidenziazione.",
    }),
    emotion: translate(locale, { de: "Emotion", en: "Emotion", es: "Emoción", fr: "Émotion", it: "Emozione" }),
    active: translate(locale, { de: "Aktiv", en: "Active", es: "Activa", fr: "Active", it: "Attiva" }),
    shareWithTherapist: translate(locale, { de: "Mit Therapeut teilen", en: "Share with therapist", es: "Compartir con el terapeuta", fr: "Partager avec le thérapeute", it: "Condividi con il terapeuta" }),
    therapistCanReadNote: translate(locale, { de: "Dein Therapeut kann diese Notiz lesen.", en: "Your therapist can read this note.", es: "Tu terapeuta puede leer esta nota.", fr: "Ton thérapeute peut lire cette note.", it: "Il tuo terapeuta può leggere questa nota." }),
    visibleOnlyToYou: translate(locale, { de: "Nur für dich sichtbar.", en: "Visible only to you.", es: "Visible solo para ti.", fr: "Visible uniquement pour toi.", it: "Visibile solo per te." }),
    deleteEntryBody: translate(locale, {
      de: "wird unwiderruflich gelöscht.",
      en: "will be permanently deleted.",
      es: "se eliminara de forma permanente.",
      fr: "sera supprimee definitivement.",
      it: "sara eliminata definitivamente.",
    }),
  }), [locale]);

  const syncEditorContent = useCallback((persist = true) => {
    if (!editorRef.current) return "<p></p>";

    const normalized = sanitizeRichText(editorRef.current.innerHTML);
    setEditorTextEmpty(!getNotePlainText(normalized).trim());

    if (persist) {
      setEditContent(normalized);
    }

    return normalized;
  }, []);

  const updateEditorFormats = useCallback(() => {
    if (typeof document === "undefined") return;

    try {
      const blockType = String(document.queryCommandValue("formatBlock") || "").toLowerCase();
      setEditorFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        heading: blockType.includes("h2"),
      });
    } catch {
      setEditorFormats((current) => current);
    }
  }, []);

  const runEditorCommand = useCallback((command: string, value?: string) => {
    if (typeof document === "undefined") return;
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorContent();
    updateEditorFormats();
  }, [syncEditorContent, updateEditorFormats]);

  const wrapSelectionWithTag = useCallback((tagName: string) => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const wrapper = document.createElement(tagName);

    try {
      range.surroundContents(wrapper);
    } catch {
      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
    }

    selection.removeAllRanges();
    const updatedRange = document.createRange();
    updatedRange.selectNodeContents(wrapper);
    updatedRange.collapse(false);
    selection.addRange(updatedRange);

    syncEditorContent();
    updateEditorFormats();
  }, [syncEditorContent, updateEditorFormats]);

  const handleEditorShortcut = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const shortcutKey = event.ctrlKey || event.metaKey;
    if (!shortcutKey) return;

    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      runEditorCommand("bold");
      return;
    }
    if (key === "i") {
      event.preventDefault();
      runEditorCommand("italic");
      return;
    }
    if (key === "u") {
      event.preventDefault();
      runEditorCommand("underline");
      return;
    }
    if (event.altKey && key === "2") {
      event.preventDefault();
      runEditorCommand("formatBlock", "h2");
      return;
    }
    if (event.altKey && key === "0") {
      event.preventDefault();
      runEditorCommand("formatBlock", "p");
      return;
    }
    if (event.shiftKey && key === "h") {
      event.preventDefault();
      runEditorCommand("hiliteColor", "#FEF08A");
    }
  }, [runEditorCommand]);

  const openEditor = useCallback((note?: Note) => {
    if (note) {
      setEditNote(note);
      setEditTitle(note.title || "");
      setEditContent(normalizeEditorContent(note.content || ""));
      setEditShared(note.isShared || false);
      setEditEmotionScore(note.emotionScore || 5);
    } else {
      setEditNote(null);
      setEditTitle("");
      setEditContent("<p></p>");
      setEditShared(false);
      setEditEmotionScore(5);
    }
    setEditing(true);
  }, []);

  const getWriteClient = useCallback(async () => {
    const [firestore, dbFull] = await Promise.all([
      getFirestoreClient(),
      getFirestoreDb(),
    ]);

    return { firestore, dbFull };
  }, []);

  useEffect(() => {
    if (!editing || !editorRef.current) return;

    editorRef.current.innerHTML = editContent || "<p></p>";
    setEditorTextEmpty(!getNotePlainText(editContent || "").trim());
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      updateEditorFormats();
    });
  }, [editing, editNote?.id, updateEditorFormats]);

  useEffect(() => {
    if (!onboarding || !onboarding.isCurrentStep("notes-editor") || editing) return;
    openEditor();
  }, [editing, onboarding, openEditor]);

  useEffect(() => {
    if (!onboarding || !onboarding.isCurrentStep("notes-editor") || !editing || !editorRef.current) return;

    const readyFrame = window.requestAnimationFrame(() => {
      onboarding.markReady("notes-editor");
    });

    return () => window.cancelAnimationFrame(readyFrame);
  }, [editing, onboarding]);

  const handleSave = async () => {
    const normalizedContent = syncEditorContent();
    if (!profile?.id || !getNotePlainText(normalizedContent).trim()) return;
    setSaving(true);
    try {
      const { firestore, dbFull } = await getWriteClient();
      const now = new Date().toISOString();
      if (editNote) {
        await firestore.updateDoc(firestore.doc(dbFull, "client_notes", editNote.id), {
          title: editTitle.trim() || null,
          content: normalizedContent,
          isShared: editShared,
          emotionScore: editEmotionScore,
          updatedAt: now,
        });
        setNotes((prev) => prev.map((n) => n.id === editNote.id ? {
          ...n,
          title: editTitle.trim() || undefined,
          content: normalizedContent,
          isShared: editShared,
          emotionScore: editEmotionScore,
          updatedAt: now,
        } : n));
        setToast({ message: text.entryUpdated, type: "success" });
      } else {
        const payload = {
          clientId: profile.id,
          title: editTitle.trim() || null,
          content: normalizedContent,
          isShared: editShared,
          emotionScore: editEmotionScore,
          authorRole: "client",
          type: "journal",
          createdAt: now,
          updatedAt: now,
        };
        const docRef = await firestore.addDoc(firestore.collection(dbFull, "client_notes"), payload);
        setNotes((prev) => [{ id: docRef.id, ...payload, title: payload.title || undefined }, ...prev]);
        setToast({ message: text.entryCreated, type: "success" });
      }
      setEditing(false);
    } catch (e) {
      console.error("Error saving note:", e);
      setToast({ message: text.saveFailed, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { firestore, dbFull } = await getWriteClient();
      await firestore.deleteDoc(firestore.doc(dbFull, "client_notes", deleteTarget.id));
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast({ message: text.entryDeleted, type: "success" });
    } catch (e) {
      console.error("Error deleting note:", e);
      setToast({ message: text.deleteFailed, type: "error" });
    }
  };

  const formatTime = (note: Note) => {
    const d = new Date(note.updatedAt || note.createdAt || "");
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      {toast && (
        <BannerToast
          visible={true}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem] relative overflow-hidden">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/30 to-primary/25" />
        <HeaderOrbs />
        <div className="max-w-5xl mx-auto px-5 pt-12 pb-8 relative z-10">
          <div className="flex items-center justify-between mb-5">
            <motion.button onClick={() => navigate("/")} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold" whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft size={16} /> {text.back}
            </motion.button>
            <motion.button onClick={() => openEditor()} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Plus size={16} /> {text.newNote}
            </motion.button>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{text.journal}</h1>
          <p className="text-white/60 text-sm font-semibold mt-1">{notes.length} {notes.length === 1 ? text.entryOne : text.entryMany}</p>
        </div>
      </div>

      <StaggerContainer className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        <StaggerItem>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={text.searchPlaceholder} className="w-full pl-11 pr-4 py-3.5 bg-card rounded-2xl border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </StaggerItem>

        {filtered.length === 0 ? (
          <StaggerItem>
            <div className="text-center py-16">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <Edit3 size={48} className="text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-black text-foreground mb-2">{searchTerm ? text.noResults : text.noEntries}</h2>
              <p className="text-muted-foreground">{searchTerm ? text.tryAnotherSearch : text.firstEntryHint}</p>
            </div>
          </StaggerItem>
        ) : (
          grouped.map(([dateTitle, items]) => (
            <StaggerItem key={dateTitle}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 bg-card border border-border px-3.5 py-1.5 rounded-full">
                  <Calendar size={12} className="text-primary" />
                  <span className="text-xs font-black text-foreground">{dateTitle}</span>
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-3">
                {items.map((note) => {
                  const isMine = !note.authorRole || note.authorRole === "client";
                  const isExpanded = expandedId === note.id;
                  const emotion = getEmotionByScore(note.emotionScore || 5);
                  return (
                    <TiltCard key={note.id} className="bg-card rounded-3xl border border-border p-5 shadow-sm" maxTilt={3}>
                      <button onClick={() => setExpandedId(isExpanded ? null : note.id)} className="w-full text-left">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-3">
                            <h3 className="font-black text-foreground text-lg leading-tight">{note.title || (isMine ? text.journalEntry : text.therapistNote)}</h3>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs font-bold text-muted-foreground">{formatTime(note)}</span>
                              <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span>{emotion.emoji}</span>
                                <span>{getEmotionLabel(emotion, locale)}</span>
                              </span>
                              {!isMine && <span className="text-[10px] font-extrabold bg-accent/15 text-accent px-2 py-0.5 rounded-md">{text.fromTherapist}</span>}
                            </div>
                          </div>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={18} className="text-muted-foreground shrink-0 mt-1" />
                          </motion.div>
                        </div>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                            <div className="mt-4 pt-4 border-t border-border">
                              <div
                                className="text-foreground leading-relaxed break-words [&_blockquote]:border-l-4 [&_blockquote]:border-primary/25 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:text-xl [&_h2]:font-black [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-black [&_h3]:mt-4 [&_h3]:mb-2 [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_p]:mb-3 [&_small]:text-xs [&_strong]:font-black [&_u]:underline"
                                dangerouslySetInnerHTML={{ __html: normalizeEditorContent(note.content || text.noContent) }}
                              />
                              {isMine && (
                                <div className="flex gap-2 mt-4">
                                  <PressableScale onClick={() => openEditor(note)}>
                                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                                      <Edit3 size={14} /> {text.edit}
                                    </div>
                                  </PressableScale>
                                  <PressableScale onClick={() => setDeleteTarget(note)}>
                                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive/10 text-destructive font-bold text-sm">
                                      <Trash2 size={14} /> {text.delete}
                                    </div>
                                  </PressableScale>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </TiltCard>
                  );
                })}
              </div>
            </StaggerItem>
          ))
        )}
        <div className="h-8" />
      </StaggerContainer>

      <AnimatePresence>
        {editing && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div data-tour-id="notes-editor" className="bg-card rounded-[2rem] border border-border w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }} onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-lg font-black text-foreground">{editNote ? text.editEntry : text.newJournalEntry}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{text.editorIntro}</p>
                </div>
                <button onClick={() => setEditing(false)} className="p-2 rounded-xl hover:bg-secondary transition-colors"><X size={20} className="text-muted-foreground" /></button>
              </div>

              <div className="p-6 space-y-5">
                <div className="rounded-[1.75rem] border p-5 relative overflow-hidden" style={{ borderColor: `${activeEditorEmotion.color}22`, background: `linear-gradient(135deg, ${activeEditorEmotion.color}16, rgba(255,255,255,0.02))` }}>
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20" style={{ backgroundColor: activeEditorEmotion.color }} />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{text.activeMood}</p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl border" style={{ backgroundColor: `${activeEditorEmotion.color}18`, borderColor: `${activeEditorEmotion.color}28` }}>
                          {activeEditorEmotion.emoji}
                        </div>
                        <div>
                          <p className="font-black text-foreground text-lg leading-tight">{getEmotionLabel(activeEditorEmotion, locale)}</p>
                          <p className="text-sm font-semibold" style={{ color: activeEditorEmotion.color }}>{activeEditorEmotion.score}/10</p>
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-2 rounded-2xl border text-sm font-bold ${editShared ? "bg-primary/10 text-primary border-primary/15" : "bg-secondary text-muted-foreground border-border"}`}>
                      {editShared ? text.shared : text.private}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.75fr_0.95fr] gap-5">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{text.titleOptional}</label>
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder={text.noteTitlePlaceholder} className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{text.content}</label>
                      <div className="rounded-[1.6rem] border border-border bg-secondary overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3 bg-background/70">
                          {[
                            { key: "bold", label: "B", active: editorFormats.bold, action: () => runEditorCommand("bold"), hint: "Strg/Cmd + B" },
                            { key: "italic", label: "I", active: editorFormats.italic, action: () => runEditorCommand("italic"), hint: "Strg/Cmd + I" },
                            { key: "underline", label: "U", active: editorFormats.underline, action: () => runEditorCommand("underline"), hint: "Strg/Cmd + U" },
                            { key: "heading", label: "H2", active: editorFormats.heading, action: () => runEditorCommand("formatBlock", "h2"), hint: "Strg/Cmd + Alt + 2" },
                            { key: "text", label: "Text", active: !editorFormats.heading, action: () => runEditorCommand("formatBlock", "p"), hint: "Strg/Cmd + Alt + 0" },
                            { key: "small", label: text.small, active: false, action: () => wrapSelectionWithTag("small"), hint: text.smallerTextHint },
                            { key: "highlight", label: text.highlight, active: false, action: () => runEditorCommand("hiliteColor", "#FEF08A"), hint: "Strg/Cmd + Shift + H" },
                            { key: "accent", label: text.accent, active: false, action: () => runEditorCommand("foreColor", "#0F766E"), hint: text.accentHint },
                            { key: "clear", label: text.clear, active: false, action: () => runEditorCommand("removeFormat"), hint: text.clearFormatting },
                          ].map((button) => (
                            <button
                              key={button.key}
                              type="button"
                              title={button.hint}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={button.action}
                              className={`px-3 py-2 rounded-xl text-xs font-black border transition-colors ${
                                button.active
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card text-foreground border-border hover:border-primary/25 hover:text-primary"
                              }`}
                            >
                              {button.label}
                            </button>
                          ))}
                        </div>

                        <div className="relative">
                          {editorTextEmpty && (
                            <p className="pointer-events-none absolute left-4 top-4 text-sm text-muted-foreground">
                              {text.yourThoughts}
                            </p>
                          )}
                          <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={() => setEditorTextEmpty(!(editorRef.current?.textContent || "").trim())}
                            onBlur={() => syncEditorContent()}
                            onKeyDown={handleEditorShortcut}
                            onKeyUp={updateEditorFormats}
                            onMouseUp={updateEditorFormats}
                            onFocus={updateEditorFormats}
                            onMouseDown={(event) => event.stopPropagation()}
                            className="min-h-[360px] p-5 text-foreground font-medium focus:outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-primary/25 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:text-2xl [&_h2]:font-black [&_h2]:mt-2 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-black [&_h3]:mt-2 [&_h3]:mb-2 [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_p]:mb-3 [&_small]:text-xs [&_strong]:font-black [&_u]:underline"
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {text.formattingHint}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{text.emotion}</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                        {emotionChoices.map((emotion) => {
                          const active = editEmotionScore === emotion.score;
                          return (
                            <button
                              key={emotion.id}
                              type="button"
                              onClick={() => setEditEmotionScore(emotion.score)}
                              className="w-full text-left rounded-2xl border p-3 transition-all"
                              style={{
                                borderColor: active ? `${emotion.color}55` : "hsl(var(--border))",
                                backgroundColor: active ? `${emotion.color}14` : "hsl(var(--secondary))",
                                boxShadow: active ? `0 10px 26px ${emotion.color}1f` : "none",
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-base shrink-0" style={{ backgroundColor: `${emotion.color}18` }}>
                                    {emotion.emoji}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-black text-foreground text-sm truncate">{getEmotionLabel(emotion, locale)}</p>
                                    <p className="text-xs font-semibold" style={{ color: emotion.color }}>{emotion.score}/10</p>
                                  </div>
                                </div>
                                {active ? <div className="px-2 py-1 rounded-xl text-[11px] font-black" style={{ backgroundColor: `${emotion.color}18`, color: emotion.color }}>{text.active}</div> : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-border bg-secondary/70 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-foreground text-sm">{text.shareWithTherapist}</p>
                          <p className="text-xs text-muted-foreground mt-1">{editShared ? text.therapistCanReadNote : text.visibleOnlyToYou}</p>
                        </div>
                        <motion.button onClick={() => setEditShared(!editShared)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${editShared ? "bg-primary/15 border-2 border-primary" : "bg-muted border border-border"}`} whileTap={{ scale: 0.9 }}>
                          {editShared ? <Unlock size={18} className="text-primary" /> : <Lock size={18} className="text-muted-foreground" />}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <motion.button onClick={handleSave} disabled={saving || editorTextEmpty} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  {saving ? <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <><Save size={18} /> {text.save}</>}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl border border-border w-full max-w-sm p-6 shadow-2xl text-center" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }}>
              <motion.div className="w-16 h-16 rounded-3xl bg-destructive/10 border border-destructive/15 mx-auto mb-4 flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: [0, 1.12, 1] }} transition={{ delay: 0.1 }}>
                <Trash2 size={28} className="text-destructive" />
              </motion.div>
              <h3 className="text-lg font-black text-foreground mb-2">{text.deleteEntryQuestion}</h3>
              <p className="text-sm text-muted-foreground mb-6">„{deleteTarget.title || text.journalEntry}" {text.deleteEntryBody}</p>
              <div className="flex gap-3">
                <motion.button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-2xl bg-secondary text-foreground font-bold" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>{text.cancel}</motion.button>
                <motion.button onClick={handleDelete} className="flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground font-bold" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>{text.delete}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

