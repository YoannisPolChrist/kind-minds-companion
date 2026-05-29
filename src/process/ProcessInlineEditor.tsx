import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, ClipboardCheck, MessageCircle, X, Loader2, Calendar, Save, Sparkles,
  ChevronUp, ChevronDown, Copy, Trash2, Edit3, CircleDot, ListChecks, CheckCircle2,
  Heart, Wind, Film
} from "lucide-react";
import type { Node } from "./types";
import { translate } from "../lib/webLocale";

interface ProcessInlineEditorProps {
  editingNodeInline: Node | null;
  setEditingNodeInline: (node: Node | null) => void;
  loadingInlineData: boolean;
  inlineTask: any;
  setInlineTask: React.Dispatch<React.SetStateAction<any>>;
  inlineReflection: any;
  setInlineReflection: React.Dispatch<React.SetStateAction<any>>;
  inlineExercise: any;
  setInlineExercise: React.Dispatch<React.SetStateAction<any>>;
  handleSaveInlineTask: (updatedTask: any) => Promise<void>;
  handleSaveInlineReflection: (updatedReflection: any) => Promise<void>;
  handleSaveInlineExercise: (updatedExercise: any) => Promise<void>;
  setToast: (toast: any) => void;
  locale: string;
}

export default function ProcessInlineEditor({
  editingNodeInline,
  setEditingNodeInline,
  loadingInlineData,
  inlineTask,
  setInlineTask,
  inlineReflection,
  setInlineReflection,
  inlineExercise,
  setInlineExercise,
  handleSaveInlineTask,
  handleSaveInlineReflection,
  handleSaveInlineExercise,
  setToast,
  locale,
}: ProcessInlineEditorProps) {
  if (!editingNodeInline) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card/95 border border-border/80 w-full max-w-4xl h-[85vh] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 md:p-6 border-b border-border bg-card/50 backdrop-blur-md select-none">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl flex items-center justify-center text-white ${
                editingNodeInline.type === "exercise" ? "bg-violet-600 shadow-lg shadow-violet-600/20" :
                editingNodeInline.type === "task" ? "bg-blue-600 shadow-lg shadow-blue-600/20" :
                "bg-emerald-600 shadow-lg shadow-emerald-600/20"
              }`}>
                {editingNodeInline.type === "exercise" ? <BookOpen size={18} /> :
                 editingNodeInline.type === "task" ? <ClipboardCheck size={18} /> :
                 <MessageCircle size={18} />}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {editingNodeInline.type === "exercise" ? "Übung bearbeiten" :
                   editingNodeInline.type === "task" ? "Aufgabe bearbeiten" :
                   "Reflexion bearbeiten"}
                </span>
                <h3 className="font-black text-lg text-foreground mt-0.5 leading-none">
                  {editingNodeInline.title || "Unbenanntes Modul"}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingNodeInline(null)}
                className="p-2 rounded-2xl bg-secondary/80 hover:bg-secondary hover:scale-105 active:scale-95 transition-all text-muted-foreground"
                title="Schließen"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Loader */}
          {loadingInlineData ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 size={36} className="animate-spin text-primary" />
              <p className="text-sm font-bold text-muted-foreground">Lade Moduldaten...</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
              {/* Task Editor */}
              {editingNodeInline.type === "task" && inlineTask && (
                <div className="p-6 md:p-8 space-y-6 max-w-2xl mx-auto w-full">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Titel der Aufgabe
                    </label>
                    <input
                      type="text"
                      value={inlineTask.title || ""}
                      onChange={(e) => setInlineTask({ ...inlineTask, title: e.target.value })}
                      className="w-full bg-secondary border border-border/80 rounded-2xl p-4 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/45 transition-all"
                      placeholder="z.B. Täglicher Spaziergang"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Beschreibung / Anweisungen
                    </label>
                    <textarea
                      value={inlineTask.description || ""}
                      onChange={(e) => setInlineTask({ ...inlineTask, description: e.target.value })}
                      rows={6}
                      className="w-full bg-secondary border border-border/80 rounded-2xl p-4 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/45 transition-all resize-none"
                      placeholder="Beschreibe die Aufgabe so präzise wie möglich..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Fälligkeitsdatum (Optional)
                    </label>
                    <div className="relative flex items-center bg-secondary border border-border/80 rounded-2xl p-4">
                      <Calendar size={18} className="text-muted-foreground mr-3" />
                      <input
                        type="date"
                        value={inlineTask.dueDate || ""}
                        onChange={(e) => setInlineTask({ ...inlineTask, dueDate: e.target.value })}
                        className="bg-transparent text-foreground text-sm font-semibold focus:outline-none w-full"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={async () => {
                        await handleSaveInlineTask(inlineTask);
                        setEditingNodeInline(null);
                        setToast({
                          visible: true,
                          message: "Erfolgreich gespeichert",
                          subMessage: "Die Aufgabe wurde erfolgreich aktualisiert.",
                          type: "success"
                        });
                      }}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/95 hover:scale-[1.02] active:scale-95 text-primary-foreground px-6 py-3.5 rounded-2xl font-bold shadow-md shadow-primary/25 transition-all"
                    >
                      <Save size={16} /> Speichern
                    </button>
                  </div>
                </div>
              )}

              {/* Reflection Editor */}
              {editingNodeInline.type === "reflection" && inlineReflection && (
                <div className="p-6 md:p-8 space-y-6 max-w-2xl mx-auto w-full">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Reflexions-Impuls (Frage / Prompt)
                    </label>
                    <textarea
                      value={inlineReflection.prompt || ""}
                      onChange={(e) => setInlineReflection({ ...inlineReflection, prompt: e.target.value })}
                      rows={6}
                      className="w-full bg-secondary border border-border/80 rounded-2xl p-4 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/45 transition-all resize-none"
                      placeholder="Worüber soll der Klient reflektieren?"
                    />
                  </div>

                  {/* Display response if client has answered */}
                  {inlineReflection.response && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-6 space-y-3 select-text">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                        <Sparkles size={14} className="animate-pulse" /> Antwort des Klienten
                      </div>
                      <p className="text-sm font-semibold text-foreground italic bg-background/50 p-4 rounded-2xl border border-border/50 shadow-inner">
                        "{inlineReflection.response}"
                      </p>
                      {inlineReflection.answeredAt && (
                        <p className="text-[10px] text-muted-foreground text-right select-none">
                          Beantwortet am: {new Date(inlineReflection.answeredAt.seconds * 1000).toLocaleDateString("de-DE", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })} Uhr
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={async () => {
                        await handleSaveInlineReflection(inlineReflection);
                        setEditingNodeInline(null);
                        setToast({
                          visible: true,
                          message: "Erfolgreich gespeichert",
                          subMessage: "Die Reflexion wurde erfolgreich aktualisiert.",
                          type: "success"
                        });
                      }}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/95 hover:scale-[1.02] active:scale-95 text-primary-foreground px-6 py-3.5 rounded-2xl font-bold shadow-md shadow-primary/25 transition-all"
                    >
                      <Save size={16} /> Speichern
                    </button>
                  </div>
                </div>
              )}

              {/* Exercises Block Editor */}
              {editingNodeInline.type === "exercise" && inlineExercise && (
                <div className="flex-1 flex flex-col min-h-0 md:flex-row">
                  {/* Left: Catalogue of block types to add */}
                  <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border p-4 bg-secondary/30 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0 select-none">
                    <p className="hidden md:block text-[11px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-3">
                      Modul-Katalog
                    </p>
                    {[
                      { type: "reflection", label: "Reflektion", desc: "Freier Text", accent: "#3B82F6", icon: Edit3 },
                      { type: "scale", label: "Skala 1–10", desc: "Numerisch", accent: "#F59E0B", icon: Sparkles },
                      { type: "choice", label: "Auswahl", desc: "Einzelauswahl", accent: "#6366F1", icon: CircleDot },
                      { type: "checklist", label: "Checkliste", desc: "Mehrfachauswahl", accent: "#10B981", icon: ListChecks },
                      { type: "homework", label: "ABC-Protokoll", desc: "Tagebuch", accent: "#C09D59", icon: CheckCircle2 },
                      { type: "gratitude", label: "Dankbarkeit", desc: "Journal", accent: "#EC4899", icon: Heart },
                      { type: "info", label: "Info-Text", desc: "Psychoedukation", accent: "#14B8A6", icon: BookOpen },
                      { type: "breathing", label: "Atemübung", desc: "Atemfluss", accent: "#137386", icon: Wind },
                      { type: "video", label: "Web-Video", desc: "Link einbetten", accent: "#E11D48", icon: Film }
                    ].map((cat) => {
                      const IconComp = cat.icon;
                      return (
                        <button
                          key={cat.type}
                          onClick={() => {
                            const newBlock = {
                              id: `block-${Date.now()}`,
                              type: cat.type,
                              content: "",
                              duration: cat.type === "breathing" ? 60 : undefined,
                              options: cat.type === "choice" || cat.type === "checklist" ? ["Auswahl 1", "Auswahl 2"] : undefined,
                              minLabel: cat.type === "scale" ? "Gar nicht" : undefined,
                              maxLabel: cat.type === "scale" ? "Sehr stark" : undefined,
                            };
                            setInlineExercise({
                              ...inlineExercise,
                              blocks: [...(inlineExercise.blocks || []), newBlock]
                            });
                          }}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left shrink-0 md:w-full hover:scale-[1.02] active:scale-95"
                        >
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: cat.accent }}>
                            <IconComp size={15} />
                          </div>
                          <div className="hidden md:block">
                            <p className="text-xs font-bold text-foreground leading-none">{cat.label}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{cat.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Blocks List & Edit Fields */}
                  <div className="flex-1 flex flex-col min-h-0 bg-background/25">
                    {/* Title Row */}
                    <div className="p-4 md:p-5 border-b border-border bg-card/20 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between shrink-0">
                      <div className="w-full md:max-w-md">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">
                          Titel der Übung
                        </label>
                        <input
                          type="text"
                          value={inlineExercise.title || ""}
                          onChange={(e) => setInlineExercise({ ...inlineExercise, title: e.target.value })}
                          className="w-full bg-secondary border border-border/80 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/45 transition-all text-foreground"
                          placeholder="z.B. Skill-Kette erstellen"
                        />
                      </div>
                      
                      <button
                        onClick={async () => {
                          await handleSaveInlineExercise(inlineExercise);
                          setEditingNodeInline(null);
                          setToast({
                            visible: true,
                            message: "Erfolgreich gespeichert",
                            subMessage: "Die Übung wurde erfolgreich aktualisiert.",
                            type: "success"
                          });
                        }}
                        className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/95 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-md shadow-primary/10 transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <Save size={14} /> Übung speichern
                      </button>
                    </div>

                    {/* Scrollable Blocks List */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                      {(!inlineExercise.blocks || inlineExercise.blocks.length === 0) ? (
                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2rem] text-center p-6 bg-secondary/10">
                          <span className="text-3xl mb-2">✨</span>
                          <p className="text-sm font-bold text-foreground">Füge dein erstes Modul hinzu</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                            Wähle links einen Modul-Typ aus dem Katalog, um mit dem Aufbau dieser Übung zu beginnen.
                          </p>
                        </div>
                      ) : (
                        inlineExercise.blocks.map((block: any, index: number) => {
                          const isFirst = index === 0;
                          const isLast = index === inlineExercise.blocks.length - 1;
                          const cat = [
                            { type: "reflection", label: "Reflektion", accent: "#3B82F6" },
                            { type: "scale", label: "Skala 1–10", accent: "#F59E0B" },
                            { type: "choice", label: "Auswahl", accent: "#6366F1" },
                            { type: "checklist", label: "Checkliste", accent: "#10B981" },
                            { type: "homework", label: "ABC-Protokoll", accent: "#C09D59" },
                            { type: "gratitude", label: "Dankbarkeit", accent: "#EC4899" },
                            { type: "info", label: "Info-Text", accent: "#14B8A6" },
                            { type: "breathing", label: "Atemübung", accent: "#137386" },
                            { type: "video", label: "Web-Video", accent: "#E11D48" }
                          ].find((c) => c.type === block.type) || { type: "reflection", label: "Reflektion", accent: "#3B82F6" };

                          return (
                            <div
                              key={block.id}
                              className="bg-card border border-border/80 rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-all relative border-l-4"
                              style={{ borderLeftColor: cat.accent }}
                            >
                              {/* Block Card Header */}
                              <div className="flex items-center justify-between p-4 bg-secondary/30 border-b border-border select-none">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground">{cat.label}</span>
                                  <span className="text-[10px] text-muted-foreground font-semibold">#{index + 1}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      if (isFirst) return;
                                      const updatedBlocks = [...inlineExercise.blocks];
                                      const [moved] = updatedBlocks.splice(index, 1);
                                      updatedBlocks.splice(index - 1, 0, moved);
                                      setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                    }}
                                    disabled={isFirst}
                                    className="w-7 h-7 rounded-lg bg-background/60 flex items-center justify-center disabled:opacity-30 hover:bg-background transition-colors"
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (isLast) return;
                                      const updatedBlocks = [...inlineExercise.blocks];
                                      const [moved] = updatedBlocks.splice(index, 1);
                                      updatedBlocks.splice(index + 1, 0, moved);
                                      setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                    }}
                                    disabled={isLast}
                                    className="w-7 h-7 rounded-lg bg-background/60 flex items-center justify-center disabled:opacity-30 hover:bg-background transition-colors"
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const duplicated = { ...block, id: `block-${Date.now()}` };
                                      const updatedBlocks = [...inlineExercise.blocks];
                                      updatedBlocks.splice(index + 1, 0, duplicated);
                                      setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                    }}
                                    className="w-7 h-7 rounded-lg bg-background/60 flex items-center justify-center hover:bg-background transition-colors"
                                    title="Duplizieren"
                                  >
                                    <Copy size={12} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const updatedBlocks = inlineExercise.blocks.filter((b: any) => b.id !== block.id);
                                      setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                    }}
                                    className="w-7 h-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
                                    title="Löschen"
                                  >
                                    <Trash2 size={12} className="text-destructive" />
                                  </button>
                                </div>
                              </div>

                              {/* Block Card Body */}
                              <div className="p-4 space-y-4">
                                {/* Content Area */}
                                {(block.type === "reflection" || block.type === "info" || block.type === "homework" || block.type === "gratitude" || block.type === "scale" || block.type === "choice" || block.type === "checklist" || block.type === "breathing" || block.type === "video") && (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                      {block.type === "info" ? "Psychoedukations-Text" :
                                       block.type === "reflection" ? "Reflexionsfrage" :
                                       block.type === "homework" ? "Anweisung zum ABC-Protokoll" :
                                       block.type === "gratitude" ? "Dankbarkeits-Impuls" :
                                       block.type === "scale" ? "Skalenfrage" :
                                       block.type === "choice" || block.type === "checklist" ? "Auswahlfrage" :
                                       block.type === "breathing" ? "Atem-Anweisung" :
                                       "Titel des Videos"}
                                    </label>
                                    
                                    {(block.type === "reflection" || block.type === "info" || block.type === "homework" || block.type === "video") ? (
                                      <textarea
                                        value={block.content || ""}
                                        onChange={(e) => {
                                          const updatedBlocks = inlineExercise.blocks.map((b: any) =>
                                            b.id === block.id ? { ...b, content: e.target.value } : b
                                          );
                                          setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                        }}
                                        rows={block.type === "info" ? 4 : 2}
                                        className="w-full bg-secondary border border-border rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/30"
                                        placeholder="Gebe den Inhalt oder die Frage hier ein..."
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        value={block.content || ""}
                                        onChange={(e) => {
                                          const updatedBlocks = inlineExercise.blocks.map((b: any) =>
                                            b.id === block.id ? { ...b, content: e.target.value } : b
                                          );
                                          setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                        }}
                                        className="w-full bg-secondary border border-border rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/30"
                                        placeholder="Gebe den Inhalt oder die Frage hier ein..."
                                      />
                                    )}
                                  </div>
                                )}

                                {/* Scale labels */}
                                {block.type === "scale" && (
                                  <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                        Beschriftung links (Minimum)
                                      </label>
                                      <input
                                        type="text"
                                        value={block.minLabel || ""}
                                        onChange={(e) => {
                                          const updatedBlocks = inlineExercise.blocks.map((b: any) =>
                                            b.id === block.id ? { ...b, minLabel: e.target.value } : b
                                          );
                                          setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                        }}
                                        placeholder="Gar nicht"
                                        className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs font-semibold focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                        Beschriftung rechts (Maximum)
                                      </label>
                                      <input
                                        type="text"
                                        value={block.maxLabel || ""}
                                        onChange={(e) => {
                                          const updatedBlocks = inlineExercise.blocks.map((b: any) =>
                                            b.id === block.id ? { ...b, maxLabel: e.target.value } : b
                                          );
                                          setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                        }}
                                        placeholder="Sehr stark"
                                        className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs font-semibold focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Choice / Checklist options */}
                                {(block.type === "choice" || block.type === "checklist") && (
                                  <div className="space-y-2 pt-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                      Antwort-Optionen
                                    </label>
                                    {(block.options || []).map((opt: string, optIdx: number) => (
                                      <div key={`opt-${optIdx}`} className="flex items-center gap-2">
                                        <div
                                          className={`w-4 h-4 shrink-0 border-2 ${block.type === "choice" ? "rounded-full" : "rounded-md"}`}
                                          style={{ borderColor: cat.accent }}
                                        />
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) => {
                                            const updatedBlocks = inlineExercise.blocks.map((b: any) => {
                                              if (b.id !== block.id) return b;
                                              const newOpts = [...(b.options || [])];
                                              newOpts[optIdx] = e.target.value;
                                              return { ...b, options: newOpts };
                                            });
                                            setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                          }}
                                          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/25"
                                          placeholder={`Option ${optIdx + 1}...`}
                                        />
                                        {(block.options?.length || 0) > 2 && (
                                          <button
                                            onClick={() => {
                                              const updatedBlocks = inlineExercise.blocks.map((b: any) => {
                                                if (b.id !== block.id) return b;
                                                const newOpts = (b.options || []).filter((_: any, idx: number) => idx !== optIdx);
                                                return { ...b, options: newOpts };
                                              });
                                              setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                            }}
                                            className="text-destructive font-black hover:scale-110 active:scale-90 transition-all text-base px-1"
                                            title="Option entfernen"
                                          >
                                            &times;
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    <button
                                      onClick={() => {
                                        const updatedBlocks = inlineExercise.blocks.map((b: any) => {
                                          if (b.id !== block.id) return b;
                                          const newOpts = [...(b.options || []), `Option ${(b.options?.length || 0) + 1}`];
                                          return { ...b, options: newOpts };
                                        });
                                        setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                      }}
                                      className="w-full border border-dashed border-border rounded-xl py-2 text-center text-xs font-bold hover:bg-secondary transition-all"
                                      style={{ color: cat.accent }}
                                    >
                                      + Option hinzufügen
                                    </button>
                                  </div>
                                )}

                                {/* Video URL */}
                                {block.type === "video" && (
                                  <div className="space-y-1 pt-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                      YouTube / Vimeo Video URL
                                    </label>
                                    <div className="relative flex items-center bg-secondary border border-border rounded-xl p-3">
                                      <Film size={14} className="text-muted-foreground mr-2 shrink-0" />
                                      <input
                                        type="text"
                                        value={block.videoUrl || ""}
                                        onChange={(e) => {
                                          const updatedBlocks = inlineExercise.blocks.map((b: any) =>
                                            b.id === block.id ? { ...b, videoUrl: e.target.value } : b
                                          );
                                          setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                        }}
                                        className="bg-transparent text-xs font-semibold focus:outline-none w-full text-foreground"
                                        placeholder="https://www.youtube.com/watch?v=..."
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Breathing exercise duration */}
                                {block.type === "breathing" && (
                                  <div className="flex items-center justify-between bg-secondary/50 border border-border rounded-xl p-3 select-none">
                                    <span className="text-xs font-bold text-foreground">Dauer der Atemübung</span>
                                    <div className="flex gap-1.5">
                                      {[30, 60, 120, 300].map((sec) => {
                                        const active = block.duration === sec;
                                        return (
                                          <button
                                            key={sec}
                                            onClick={() => {
                                              const updatedBlocks = inlineExercise.blocks.map((b: any) =>
                                                b.id === block.id ? { ...b, duration: sec } : b
                                              );
                                              setInlineExercise({ ...inlineExercise, blocks: updatedBlocks });
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                              active ? "text-white shadow-sm" : "bg-card text-muted-foreground border border-border hover:bg-secondary"
                                            }`}
                                            style={active ? { backgroundColor: cat.accent } : {}}
                                          >
                                            {sec < 60 ? `${sec}s` : `${sec / 60}min`}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
