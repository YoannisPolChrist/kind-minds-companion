import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, Check, LayoutTemplate, Plus, Search, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { db } from "../../lib/firebaseDb";
import { useAuth } from "../../hooks/useAuth";
import { PageTransition, PressableScale } from "../../components/motion";
import TherapistHeroHeader from "../../components/therapist/TherapistHeroHeader";
import TemplateCard from "../../components/therapist/TemplateCard";
import { Toast } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Badge } from "../../components/ui/Badge";

export default function TherapistTemplates() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assignTemplate, setAssignTemplate] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    subMessage?: string;
    type: "success" | "error";
  }>({ visible: false, message: "", type: "success" });

  useEffect(() => {
    if (!profile?.id) return;

    void (async () => {
      try {
        const [tplSnap, clientSnap] = await Promise.all([
          getDocs(query(collection(db, "exercise_templates"), where("therapistId", "==", profile.id))),
          getDocs(query(collection(db, "users"), where("role", "==", "client"), where("therapistId", "==", profile.id))),
        ]);

        setTemplates(tplSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() })).filter((tpl: any) => !tpl.isArchived));
        setClients(clientSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() })).filter((client: any) => !client.isArchived));
      } catch (error) {
        console.error("Error loading templates:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const filtered = templates.filter((tpl) => {
    if (!search.trim()) return true;
    return tpl.title?.toLowerCase().includes(search.toLowerCase());
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteDoc(doc(db, "exercise_templates", deleteTarget.id));
      setTemplates((current) => current.filter((tpl) => tpl.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast({
        visible: true,
        message: "Vorlage geloescht",
        subMessage: `"${deleteTarget.title}" wurde entfernt.`,
        type: "success",
      });
    } catch {
      setToast({
        visible: true,
        message: "Fehler",
        subMessage: "Vorlage konnte nicht geloescht werden.",
        type: "error",
      });
      setDeleteTarget(null);
    }
  };

  const handleAssign = async () => {
    if (!assignTemplate || !selectedClientId) return;

    setAssigning(true);

    try {
      const client = clients.find((entry) => entry.id === selectedClientId);

      await addDoc(collection(db, "exercises"), {
        clientId: selectedClientId,
        therapistId: profile?.id,
        sourceTemplateId: assignTemplate.id,
        title: assignTemplate.title,
        blocks: assignTemplate.blocks || [],
        themeColor: assignTemplate.themeColor || null,
        recurrence: "none",
        completed: false,
        status: "assigned",
        createdAt: new Date().toISOString(),
      });

      setAssignTemplate(null);
      setSelectedClientId(null);
      setToast({
        visible: true,
        message: "Uebung zugewiesen",
        subMessage: `"${assignTemplate.title}" an ${client?.firstName || "Klient"} zugewiesen.`,
        type: "success",
      });
    } catch {
      setToast({
        visible: true,
        message: "Fehler",
        subMessage: "Zuweisung fehlgeschlagen.",
        type: "error",
      });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card px-6 py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-2 h-8 w-48 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-8 md:grid-cols-2">
          {[1, 2, 3, 4].map((entry) => (
            <div key={entry} className="h-48 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      </div>
    );
  }

  const assignModal = assignTemplate ? (
    <motion.div
      className="fixed inset-0 z-[120] flex min-h-screen items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setAssignTemplate(null)}
    >
      <motion.div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-base font-black text-foreground">Klient auswaehlen</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">"{assignTemplate.title}" zuweisen</p>
          </div>
          <button onClick={() => setAssignTemplate(null)} className="rounded-lg p-1.5 hover:bg-secondary" type="button">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-2 overflow-y-auto p-5">
          <div className="rounded-lg border border-border bg-secondary/70 px-3 py-2 text-xs font-medium text-muted-foreground">
            Die zugewiesene Vorlage erscheint anschliessend im Klientenbereich unter den offenen Aufgaben.
          </div>

          {clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Klienten vorhanden.</p>
          ) : (
            clients.map((client: any) => (
              <PressableScale key={client.id} onClick={() => setSelectedClientId(client.id)}>
                <div
                  className={`flex items-center gap-3 rounded-lg border bg-secondary p-3 transition-all ${
                    selectedClientId === client.id ? "border-primary ring-1 ring-primary/20" : "border-border"
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-xs font-black text-primary">
                    {client.firstName?.charAt(0)}
                    {client.lastName?.charAt(0)}
                  </div>
                  <span className="flex-1 text-sm font-bold text-foreground">
                    {client.firstName} {client.lastName}
                  </span>
                  {selectedClientId === client.id ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  ) : null}
                </div>
              </PressableScale>
            ))
          )}
        </div>

        {selectedClientId ? (
          <div className="p-5 pt-0">
            <motion.button
              onClick={handleAssign}
              disabled={assigning}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-3 text-sm font-bold text-background disabled:opacity-40"
              whileTap={{ scale: 0.97 }}
            >
              {assigning ? (
                <motion.span
                  className="inline-block h-4 w-4 rounded-full border-2 border-background border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <>
                  <Send size={14} />
                  Zuweisen
                </>
              )}
            </motion.button>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  ) : null;

  return (
    <PageTransition className="min-h-screen bg-background">
      <TherapistHeroHeader maxWidthClassName="max-w-6xl">
        <div className="mb-5 flex items-center justify-between">
          <motion.button
            onClick={() => navigate("/therapist")}
            className="flex items-center gap-2 rounded-2xl bg-primary-foreground/15 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-primary-foreground/25"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} /> Dashboard
          </motion.button>

          <motion.button
            onClick={() => navigate("/therapist/template/new")}
            className="flex items-center gap-2 rounded-2xl bg-primary-foreground/20 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-primary-foreground/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={16} /> Neue Vorlage
          </motion.button>
        </div>

        <div className="mb-1 flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight">Uebungsvorlagen</h1>
          <Badge
            variant="muted"
            className="border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground"
          >
            {templates.length}
          </Badge>
        </div>
        <p className="text-sm font-semibold text-primary-foreground/70">
          Erstelle und verwalte interaktive Vorlagen fuer deine Klienten.
        </p>

        <div className="relative mt-5">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-foreground/70"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Vorlagen durchsuchen..."
            className="w-full rounded-2xl border border-primary-foreground/25 bg-card/80 py-3 pl-11 pr-10 text-sm font-semibold text-foreground caret-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary-foreground/30"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 rounded-lg p-1 -translate-y-1/2 hover:bg-primary-foreground/15"
              aria-label="Suche loeschen"
              type="button"
            >
              <X size={14} className="text-primary-foreground/75" />
            </button>
          ) : null}
        </div>
      </TherapistHeroHeader>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <LayoutTemplate size={40} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="mb-1 text-lg font-black text-foreground">
              {search ? "Keine Treffer" : "Noch keine Vorlagen"}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Erstelle deine erste Uebungsvorlage, um loszulegen.
            </p>
            {!search ? (
              <motion.button
                onClick={() => navigate("/therapist/template/new")}
                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-bold text-background"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Plus size={16} /> Erste Vorlage erstellen
              </motion.button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                onDelete={() => setDeleteTarget(tpl)}
                onEdit={() => navigate(`/therapist/template/${tpl.id}`)}
                onAssign={() => {
                  setAssignTemplate(tpl);
                  setSelectedClientId(null);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {assignModal ? (typeof document !== "undefined" ? createPortal(assignModal, document.body) : assignModal) : null}
      </AnimatePresence>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Vorlage loeschen?"
        message={`"${deleteTarget?.title || ""}" wird unwiderruflich geloescht.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Loeschen"
        cancelText="Abbrechen"
        isDestructive
      />
      <Toast
        visible={toast.visible}
        message={toast.message}
        subMessage={toast.subMessage}
        type={toast.type}
        onDone={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </PageTransition>
  );
}
