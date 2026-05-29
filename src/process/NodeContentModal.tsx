import React from "react";
import { X, Calendar, FileText, FileQuestion, Activity, CheckCircle, Clock, Heart, FileUp } from "lucide-react";
import type { Node } from "./types";
import { ExerciseView } from "../pages/Exercise";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebaseDb";
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";

interface NodeContentModalProps {
  node: Node | null;
  onClose: () => void;
  clientId?: string;
  onUpdateNode?: (nodeId: string, updates: Partial<Node>) => Promise<void>;
  baseline?: any;
  onUpdateBaseline?: (nextBaseline: any) => Promise<void>;
  isReadOnly?: boolean;
}

function decodeUnicodeBase64(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractEmbeddedPayload(text: string) {
  const compact = text.replace(/\s+/g, "");
  const match = compact.match(/PROCESS_COMPASS_JSON_START([A-Za-z0-9+/=]+)PROCESS_COMPASS_JSON_END/);
  if (!match?.[1]) return null;
  return JSON.parse(decodeUnicodeBase64(match[1]));
}

function numberOrUndefined(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function findScale(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${escapeRegExp(label)}\\s*[:\\-]?\\s*(\\d{1,2})(?:\\s*/\\s*10)?`, "i");
    const match = text.match(pattern);
    const parsed = numberOrUndefined(match?.[1]);
    if (parsed) return Math.min(parsed, 10);
  }
  return undefined;
}

function mapPdfTextFallback(text: string, fileName: string) {
  const metrics = {
    energy: findScale(text, ["Energie/Vitalität", "Energy/vitality", "scale_energy"]),
    agency: findScale(text, ["Handlungsfähigkeit", "Selbstwirksamkeit", "Agency", "scale_agency"]),
    regulation: findScale(text, ["Stabilisierung", "emotionale Regulation", "Regulation", "scale_regulation"]),
    bodyTrust: findScale(text, ["Körpervertrauen", "Körpergefühl", "Body trust", "scale_body_trust"]),
    clarity: findScale(text, ["Klarheit", "Clarity", "scale_clarity"]),
    dailyFunction: findScale(text, ["Alltagsfunktion", "Daily function", "scale_daily_function"]),
    goalCloseness: findScale(text, ["Zielnähe", "Goal closeness", "scale_goal_closeness"]),
    resilience: findScale(text, ["Belastbarkeit", "Resilienz", "Resilience", "scale_resilience"]),
  };
  const hasMetric = Object.values(metrics).some(Boolean);
  if (!hasMetric) return null;

  return {
    sourceTitle: fileName,
    sourceUrl: "",
    goal: "",
    currentResource: "",
    nextNeed: "",
    updatedAtLabel: new Date().toISOString(),
    metrics,
  };
}

function mapStructuredAnamnesis(payload: any, sourceTitle = "Strukturierte Eingangsanamnese") {
  const baseline = payload?.baseline || payload?.processBaseline || {};
  const fields = payload?.fields || payload?.raw || {};
  return {
    sourceTitle: baseline.sourceTitle || payload?.sourceTitle || sourceTitle,
    sourceUrl: baseline.sourceUrl || baseline.source || payload?.sourceUrl || "",
    goal: baseline.goal || fields.ziel || "",
    currentResource: baseline.currentResource || fields.current_resource || "",
    nextNeed: baseline.nextNeed || fields.next_need || "",
    updatedAtLabel: payload?.exportedAt || new Date().toISOString(),
    metrics: {
      energy: numberOrUndefined(baseline.metrics?.energy ?? fields.scale_energy),
      agency: numberOrUndefined(baseline.metrics?.agency ?? fields.scale_agency),
      regulation: numberOrUndefined(baseline.metrics?.regulation ?? fields.scale_regulation),
      bodyTrust: numberOrUndefined(baseline.metrics?.bodyTrust ?? fields.scale_body_trust),
      clarity: numberOrUndefined(baseline.metrics?.clarity ?? fields.scale_clarity),
      dailyFunction: numberOrUndefined(baseline.metrics?.dailyFunction ?? fields.scale_daily_function),
      goalCloseness: numberOrUndefined(baseline.metrics?.goalCloseness ?? fields.scale_goal_closeness),
      resilience: numberOrUndefined(baseline.metrics?.resilience ?? fields.scale_resilience),
    },
  };
}

export default function NodeContentModal({
  node,
  onClose,
  clientId,
  onUpdateNode,
  baseline,
  onUpdateBaseline,
  isReadOnly = false,
}: NodeContentModalProps) {
  if (!node) return null;

  // Local states for interactive checkin
  const [mood, setMood] = React.useState<number>(3);
  const [energy, setEnergy] = React.useState<number>(3);
  const [note, setNote] = React.useState<string>("");
  const [submittingCheckin, setSubmittingCheckin] = React.useState<boolean>(false);

  // Local states for PDF parsing
  const [draftBaseline, setDraftBaseline] = React.useState<any>(baseline || null);
  const [importError, setImportError] = React.useState("");
  const [parsing, setParsing] = React.useState(false);

  React.useEffect(() => {
    setDraftBaseline(baseline || null);
  }, [baseline]);

  const handleSubmitCheckin = async () => {
    if (!clientId || !node) return;
    setSubmittingCheckin(true);
    try {
      const docRef = await addDoc(collection(db, "checkins"), {
        uid: clientId,
        mood,
        energy,
        note,
        date: new Date().toLocaleDateString("de-DE"),
        createdAt: serverTimestamp(),
      });

      const updates = {
        title: note ? (note.length > 30 ? note.substring(0, 30) + "..." : note) : "Tägliches Befinden",
        linkedId: docRef.id,
        metadata: {
          ...node.metadata,
          mood,
          energy,
          note,
          date: new Date().toLocaleDateString("de-DE"),
          completed: true,
        }
      };

      if (onUpdateNode) {
        await onUpdateNode(node.id, updates);
      }
      
      // Mutate local ref to avoid modal state closing visual glitch
      node.title = updates.title;
      node.linkedId = updates.linkedId;
      node.metadata = updates.metadata;

    } catch (err) {
      console.error("Failed to submit check-in from node:", err);
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const handleAnamneseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setParsing(true);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
      
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const pageTexts: string[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ");
        pageTexts.push(text);
      }

      const pdfText = pageTexts.join("\n");
      const payload = extractEmbeddedPayload(pdfText);
      const mapped = payload ? mapStructuredAnamnesis(payload, file.name) : mapPdfTextFallback(pdfText, file.name);

      if (!mapped) {
        setImportError("Diese PDF enthält keine lesbaren Anamnese-Basiswerte.");
        return;
      }

      setDraftBaseline(mapped);

      if (onUpdateBaseline) {
        await onUpdateBaseline(mapped);
      }

      if (onUpdateNode) {
        await onUpdateNode(node.id, {
          title: `Anamnese: ${mapped.sourceTitle || file.name}`,
          metadata: {
            ...node.metadata,
            pdfUrl: mapped.sourceUrl || "",
            description: `Erfolgreich ausgelesen. Ziel: ${mapped.goal || "Keins"}. Ressource: ${mapped.currentResource || "Keine"}.`,
          }
        });
      }

    } catch (err) {
      console.error("Anamnese PDF parsing failed:", err);
      setImportError("Einlesen fehlgeschlagen. Bitte wähle eine gültige PDF.");
    } finally {
      setParsing(false);
    }
  };

  // Determine if this is a "full screen" overlay (like ExerciseView) or a smaller modal card (like a Note)
  const isFullScreenMode = node.type === "exercise";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
        {/* Backdrop */}
        <motion.div 
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        
        {/* Modal Content */}
        <motion.div 
          className={`relative flex flex-col bg-background rounded-[2rem] shadow-2xl overflow-hidden z-10 
            ${isFullScreenMode ? 'w-full h-full max-w-[1200px]' : 'w-full max-w-2xl min-h-[400px]'}`}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* We only show the custom generic close button if the view doesn't provide its own (ExerciseView has its own back/close buttons) */}
          {!isFullScreenMode && (
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={onClose}
                className="p-2.5 bg-secondary/80 backdrop-blur-md hover:bg-secondary rounded-full transition-colors shadow-sm text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* --- EXERCISE VIEW --- */}
          {node.type === "exercise" && node.linkedId && (
            <div className="flex-1 w-full h-full overflow-y-auto relative">
              {/* Note: readOnly could be false if we want therapist to be able to fill it out, but usually it's readOnly for them */}
              <ExerciseView 
                exerciseId={node.linkedId} 
                clientId={clientId} 
                readOnly={true} 
                onClose={onClose} 
              />
            </div>
          )}

          {/* --- NOTE VIEW --- */}
          {node.type === "note" && (
            <div className="flex flex-col h-full">
              <div className="p-8 pb-6 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-amber-600 uppercase tracking-wider">Notiz</span>
                </div>
                <h1 className="text-3xl font-black text-foreground">{node.title}</h1>
                {node.metadata?.date && (
                  <div className="flex items-center gap-1.5 mt-3 text-muted-foreground text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(node.metadata.date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 p-8 overflow-y-auto">
                <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground font-medium">
                  {node.metadata?.description || "Keine weiteren Details hinterlegt."}
                </div>
              </div>
            </div>
          )}

          {/* --- APPOINTMENT VIEW --- */}
          {node.type === "appointment" && (
            <div className="flex flex-col h-full">
              <div className="p-8 pb-6 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Termin</span>
                </div>
                <h1 className="text-3xl font-black text-foreground">{node.title}</h1>
                
                {node.metadata?.date && (
                  <div className="flex items-center gap-2 mt-4 inline-flex px-4 py-2 bg-blue-500/10 rounded-xl text-blue-600 font-bold border border-blue-500/20">
                    <Calendar className="w-5 h-5" />
                    <span>{new Date(node.metadata.date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 p-8 overflow-y-auto">
                {node.metadata?.description ? (
                  <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground font-medium">
                    {node.metadata.description}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Keine weiteren Notizen zum Termin.</p>
                )}
              </div>
            </div>
          )}

          {/* --- TASK VIEW --- */}
          {node.type === "task" && (
            <div className="flex flex-col h-full">
              <div className="p-8 pb-6 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Aufgabe</span>
                </div>
                <h1 className="text-3xl font-black text-foreground">{node.title}</h1>
                {node.metadata?.dueDate && (
                  <div className="flex items-center gap-1.5 mt-3 text-muted-foreground text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    <span>Fällig bis: {new Date(node.metadata.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 p-8 overflow-y-auto">
                <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground font-medium">
                  {node.metadata?.description || "Keine Aufgabendetails hinterlegt."}
                </div>
              </div>
            </div>
          )}

          {/* --- ANAMNESE VIEW --- */}
          {node.type === "anamnese" && (
            <div className="flex flex-col h-full">
              <div className="p-8 pb-6 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-600">
                    <Activity className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">Anamnesebogen</span>
                </div>
                <h1 className="text-3xl font-black text-foreground">{node.title}</h1>
              </div>

              <div className="flex-1 p-8 overflow-y-auto">
                {parsing && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-1">Analysiere PDF-Struktur...</h3>
                    <p className="text-muted-foreground max-w-sm">
                      Baseline-Metriken und klinische Daten werden extrahiert. Dies dauert nur einen Moment.
                    </p>
                  </div>
                )}

                {!parsing && !draftBaseline && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-full max-w-md p-8 rounded-[2rem] border-2 border-dashed border-purple-500/30 bg-purple-500/5 flex flex-col items-center justify-center transition-all hover:border-purple-500/50">
                      <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 mb-4 animate-bounce">
                        <FileUp className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-black text-foreground mb-2">PDF-Anamnesebogen hochladen</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                        Wähle eine ausgefüllte PDF-Datei. Die Skalenwerte (1-10) und Texte werden automatisch ausgelesen und visualisiert.
                      </p>
                      <label className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-lg shadow-purple-600/20 transition-all cursor-pointer inline-flex items-center gap-2">
                        <FileUp className="w-4 h-4" />
                        <span>Datei auswählen</span>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleAnamneseUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {importError && (
                      <p className="mt-4 text-sm font-bold text-destructive">{importError}</p>
                    )}
                  </div>
                )}

                {!parsing && draftBaseline && (
                  <div className="space-y-8 animate-fade-in">
                    {/* Metrics Dashboard */}
                    <div>
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4 block">
                        Baseline-Werte (Skala 1-10)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        {[
                          { key: "energy", label: "Energie & Vitalität", desc: "Psychophysisches Wohlbefinden", color: "from-amber-500 to-orange-500", bg: "bg-amber-500/10" },
                          { key: "agency", label: "Handlungsfähigkeit", desc: "Selbstwirksamkeit & Tatkraft", color: "from-indigo-500 to-blue-500", bg: "bg-indigo-500/10" },
                          { key: "regulation", label: "Emotionale Regulation", desc: "Innere Stabilisierung & Erdung", color: "from-emerald-500 to-teal-500", bg: "bg-emerald-500/10" },
                          { key: "bodyTrust", label: "Körpervertrauen", desc: "Körpergefühl & Akzeptanz", color: "from-rose-500 to-pink-500", bg: "bg-rose-500/10" },
                          { key: "clarity", label: "Klarheit & Reflexion", desc: "Verständnis & Achtsamkeit", color: "from-cyan-500 to-teal-500", bg: "bg-cyan-500/10" },
                          { key: "dailyFunction", label: "Alltagsfunktion", desc: "Bewältigung des Alltags", color: "from-violet-500 to-purple-500", bg: "bg-violet-500/10" },
                          { key: "goalCloseness", label: "Zielnähe", desc: "Erreichung klinischer Ziele", color: "from-green-500 to-emerald-500", bg: "bg-green-500/10" },
                          { key: "resilience", label: "Belastbarkeit & Resilienz", desc: "Widerstandskraft bei Stress", color: "from-red-500 to-rose-500", bg: "bg-red-500/10" },
                        ].map((m) => {
                          const val = draftBaseline.metrics?.[m.key] ?? 5;
                          const pct = val * 10;
                          return (
                            <div key={m.key} className="p-4 rounded-2xl bg-secondary/50 border border-border flex flex-col justify-between">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <h4 className="text-sm font-extrabold text-foreground">{m.label}</h4>
                                  <p className="text-[10px] text-muted-foreground font-medium">{m.desc}</p>
                                </div>
                                <span className={`text-sm font-black px-2.5 py-0.5 rounded-full ${m.bg} text-foreground shrink-0`}>
                                  {val} <span className="text-muted-foreground font-bold">/ 10</span>
                                </span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden mt-3 relative">
                                <motion.div
                                  className={`h-full bg-gradient-to-r ${m.color}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Qualitative Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                      {[
                        { title: "Therapeutisches Ziel", content: draftBaseline.goal, color: "border-purple-500/20 bg-purple-500/5 text-purple-600" },
                        { title: "Aktuelle Ressourcen", content: draftBaseline.currentResource, color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600" },
                        { title: "Nächstes therapeutisches Bedürfnis", content: draftBaseline.nextNeed, color: "border-blue-500/20 bg-blue-500/5 text-blue-600" },
                      ].map((card, i) => (
                        <div key={i} className={`p-5 rounded-2xl border ${card.color} flex flex-col`}>
                          <h4 className="text-xs font-black uppercase tracking-wider mb-2 text-foreground">
                            {card.title}
                          </h4>
                          <p className="text-sm text-foreground/80 font-medium leading-relaxed flex-1 whitespace-pre-wrap">
                            {card.content || "Keine Angaben im Dokument."}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Footer metadata and re-upload */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-secondary/30 border border-border">
                      <div className="flex items-center gap-2 text-left">
                        <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-foreground truncate max-w-[200px] sm:max-w-xs">
                            Quelle: {draftBaseline.sourceTitle}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-semibold">
                            Ausgelesen am {new Date(draftBaseline.updatedAtLabel).toLocaleDateString()} um {new Date(draftBaseline.updatedAtLabel).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <label className="px-4 py-2 border border-border bg-card hover:bg-secondary rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm">
                        <FileUp className="w-4 h-4 text-muted-foreground" />
                        <span>Neu einlesen</span>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleAnamneseUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- CHECK-IN VIEW --- */}
          {node.type === "checkin" && (
            <div className="flex flex-col h-full">
              <div className="p-8 pb-6 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-600">
                    <Heart className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-pink-600 uppercase tracking-wider">Tägliches Befinden</span>
                </div>
                <h1 className="text-3xl font-black text-foreground">{node.title}</h1>
              </div>

              <div className="flex-1 p-8 overflow-y-auto">
                {node.metadata?.completed ? (
                  <div className="space-y-6 animate-fade-in text-left">
                    {/* Read-Only Completed Dashboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Mood Card */}
                      <div className="p-5 rounded-[2rem] bg-secondary/50 border border-border flex flex-col justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Stimmung</span>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-5xl">
                            {["😢", "😕", "😐", "🙂", "😊"][(node.metadata.mood ?? 3) - 1] || "😐"}
                          </span>
                          <div>
                            <p className="text-xl font-black text-foreground">
                              {["Sehr schlecht", "Schlecht", "Neutral", "Gut", "Hervorragend"][(node.metadata.mood ?? 3) - 1] || "Neutral"}
                            </p>
                            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                              Wert: {node.metadata.mood} / 5
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Energy Card */}
                      <div className="p-5 rounded-[2rem] bg-secondary/50 border border-border flex flex-col justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Energie & Vitalität</span>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-5xl">
                            {["🔋", "⚡", "💪", "🔥", "✨"][(node.metadata.energy ?? 3) - 1] || "💪"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xl font-black text-foreground truncate">
                              {["Völlig erschöpft", "Wenig Energie", "Ausgeglichen", "Voller Energie", "Hochenergetisch"][(node.metadata.energy ?? 3) - 1] || "Ausgeglichen"}
                            </p>
                            <p className="text-xs text-muted-foreground font-semibold mt-0.5 mb-2">
                              Wert: {node.metadata.energy} / 5
                            </p>
                            <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                              <div
                                className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
                                style={{ width: `${(node.metadata.energy ?? 3) * 20}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Note Quote */}
                    {node.metadata.note && (
                      <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 text-left">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-2 block">
                          Notizen des Klienten
                        </span>
                        <blockquote className="text-base font-semibold text-foreground/90 leading-relaxed italic">
                          "{node.metadata.note}"
                        </blockquote>
                      </div>
                    )}

                    <div className="flex items-center gap-2 p-4 rounded-xl bg-secondary/30 border border-border justify-center text-xs font-bold text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Ausgefüllt am {node.metadata.date || new Date().toLocaleDateString("de-DE")}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    {isReadOnly ? (
                      /* Read-Only Pending View (for Therapist) */
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Heart className="w-16 h-16 text-pink-500/20 mb-4 animate-pulse" />
                        <h3 className="text-xl font-bold text-foreground mb-1">Check-in ausstehend</h3>
                        <p className="text-muted-foreground max-w-sm">
                          Dieser Stimmungs-Check wurde vom Klienten noch nicht ausgefüllt.
                        </p>
                      </div>
                    ) : (
                      /* Interactive Submission Form (for Client) */
                      <div className="space-y-6 text-left">
                        {/* Mood Slider */}
                        <div className="p-6 rounded-[2rem] bg-secondary/30 border border-border">
                          <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block mb-4">
                            Wie ist deine Stimmung heute?
                          </label>
                          <div className="flex items-center justify-between mb-4">
                            {["😢", "😕", "😐", "🙂", "😊"].map((emo, idx) => (
                              <button
                                key={idx}
                                onClick={() => setMood(idx + 1)}
                                className={`text-4xl p-2 rounded-full transition-all hover:scale-125 
                                  ${mood === idx + 1 ? 'bg-pink-500/10 scale-120 border border-pink-500/20' : 'opacity-60'}`}
                              >
                                {emo}
                              </button>
                            ))}
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-extrabold text-pink-600">
                              {["Sehr schlecht", "Schlecht", "Neutral", "Gut", "Hervorragend"][mood - 1]}
                            </span>
                          </div>
                        </div>

                        {/* Energy Slider */}
                        <div className="p-6 rounded-[2rem] bg-secondary/30 border border-border">
                          <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block mb-2">
                            Wie hoch ist dein Energielevel?
                          </label>
                          <div className="flex justify-between text-xs font-bold text-muted-foreground mb-4">
                            <span>Erschöpft</span>
                            <span>Voller Energie</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={energy}
                            onChange={(e) => setEnergy(parseInt(e.target.value))}
                            className="w-full accent-pink-500 cursor-pointer h-2"
                          />
                          <div className="text-center mt-3">
                            <span className="text-sm font-extrabold text-pink-600">
                              {["Völlig erschöpft", "Wenig Energie", "Ausgeglichen", "Voller Energie", "Hochenergetisch"][energy - 1]}
                            </span>
                          </div>
                        </div>

                        {/* Notes Input */}
                        <div className="p-6 rounded-[2rem] bg-secondary/30 border border-border">
                          <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block mb-2">
                            Möchtest du Notizen hinterlassen? (Optional)
                          </label>
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Beschreibe kurz dein Befinden, Gedanken oder Erkenntnisse..."
                            rows={3}
                            className="w-full bg-background rounded-xl border border-border p-3 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/30 text-sm"
                          />
                        </div>

                        {/* Submit Button */}
                        <motion.button
                          onClick={handleSubmitCheckin}
                          disabled={submittingCheckin}
                          className="w-full py-4 rounded-2xl font-black text-lg bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-600/20 transition-all disabled:opacity-50"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {submittingCheckin ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                              Wird übermittelt...
                            </span>
                          ) : "Check-in absenden ✓"}
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- FALLBACK VIEW --- */}
          {(!["note", "appointment", "task", "anamnese", "checkin"].includes(node.type) && !(node.type === "exercise" && node.linkedId)) && (
            <div className="flex flex-col h-full">
              <div className="p-8 pb-6 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-primary uppercase tracking-wider">{node.type}</span>
                </div>
                <h1 className="text-3xl font-black text-foreground">{node.title || "Ohne Titel"}</h1>
              </div>
              <div className="flex-1 p-8 overflow-y-auto">
                <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground font-medium">
                  {node.metadata?.description || "Keine weiteren Details hinterlegt."}
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
