import { motion, AnimatePresence } from "motion/react";
import {
  Compass, PanelLeftClose, PanelLeftOpen, BookOpen, ClipboardCheck,
  MessageCircle, Calendar, FileText, StickyNote, Flag, Circle, Square, Heart
} from "lucide-react";

interface ProcessPaletteProps {
  showPalette: boolean;
  setShowPalette: (show: boolean) => void;
  setExerciseModalTab?: (tab: "assign" | "existing") => void;
  setShowAddExerciseModal?: (show: boolean) => void;
  handleAddTaskNode?: () => void;
  handleAddReflectionNode?: () => void;
  handleAddAppointmentNode?: () => void;
  handleAddAnamneseNode?: () => void;
  handleAddNoteNode?: () => void;
  handleAddMilestoneNode?: () => void;
  handleAddCustomShape?: (shape: "circle" | "square") => void;
  handleAddCheckinNode?: () => void;
  onAddDocumentClick?: () => void;
  onGenerateTimeline?: () => void;
}

export default function ProcessPalette({
  showPalette,
  setShowPalette,
  setExerciseModalTab,
  setShowAddExerciseModal,
  handleAddTaskNode,
  handleAddReflectionNode,
  handleAddAppointmentNode,
  handleAddAnamneseNode,
  handleAddNoteNode,
  handleAddMilestoneNode,
  handleAddCustomShape,
  handleAddCheckinNode,
  onAddDocumentClick,
  onGenerateTimeline,
}: ProcessPaletteProps) {
  const onAddExerciseClick = () => {
    setExerciseModalTab?.("assign");
    setShowAddExerciseModal?.(true);
  };

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("text/plain", type);
  };

  return (
    <>
      <AnimatePresence>
        {showPalette && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-64 h-full bg-[#FFFDF9] dark:bg-card border-r border-[#DED6C9] dark:border-border flex flex-col z-20 shrink-0 pointer-events-auto relative shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-2">
                <Compass size={16} className="text-primary animate-pulse" />
                <h2 className="text-sm font-black text-foreground">Elemente-Katalog</h2>
              </div>
              <button
                onClick={() => setShowPalette(false)}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground"
              >
                <PanelLeftClose size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Category 1: Therapeutische Elemente */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Therapeutische Elemente
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Exercise Card */}
                  <button
                    onClick={onAddExerciseClick}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, "exercise")}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary hover:bg-muted border border-border text-left transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground">Übung</p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">
                        Aus Vorlagen zuweisen
                      </p>
                    </div>
                  </button>

                  {/* Task Card */}
                  <button
                    onClick={handleAddTaskNode}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, "task")}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary hover:bg-muted border border-border text-left transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <ClipboardCheck size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground">Aufgabe</p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">
                        To-Do für Klienten
                      </p>
                    </div>
                  </button>

                  {/* Reflection Card */}
                  <button
                    onClick={handleAddReflectionNode}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, "reflection")}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary hover:bg-muted border border-border text-left transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                      <MessageCircle size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground">Reflexion</p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">
                        Klienten-Frage stellen
                      </p>
                    </div>
                  </button>

                  {/* Appointment Card */}
                  <button
                    onClick={handleAddAppointmentNode}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, "appointment")}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary hover:bg-muted border border-border text-left transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground">Termin</p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">
                        Nächste Therapiesitzung
                      </p>
                    </div>
                  </button>

                  {/* Anamnese Card */}
                  <button
                    onClick={handleAddAnamneseNode}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, "anamnese")}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary hover:bg-muted border border-border text-left transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground">Anamnese</p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">
                        Klinischer Schritt
                      </p>
                    </div>
                  </button>

                  {/* Check-In Card */}
                  {handleAddCheckinNode && (
                    <button
                      onClick={handleAddCheckinNode}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, "checkin")}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary hover:bg-muted border border-border text-left transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                    >
                      <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
                        <Heart size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-foreground">Check-In</p>
                        <p className="text-[10px] text-muted-foreground truncate font-medium">
                          Stimmungs-Check hinzufügen
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Document Card */}
                  {onAddDocumentClick && (
                    <button
                      onClick={onAddDocumentClick}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, "document")}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary hover:bg-muted border border-border text-left transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-foreground">Dokument</p>
                        <p className="text-[10px] text-muted-foreground truncate font-medium">
                          Aus Bibliothek wählen
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Category 2: Formen & Notizen */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Formen & Notizen
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Note Card */}
                  <button
                    onClick={handleAddNoteNode}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, "note")}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary hover:bg-muted border border-border text-left transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
                      <StickyNote size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground">Notiz</p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">
                        Private Notizen
                      </p>
                    </div>
                  </button>

                  {/* Milestone Card */}
                  <button
                    onClick={handleAddMilestoneNode}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, "milestone")}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary hover:bg-muted border border-border text-left transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                      <Flag size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground">Meilenstein</p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">
                        Erreichte Etappe
                      </p>
                    </div>
                  </button>

                  {/* Shapes Sub-group */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAddCustomShape?.("circle")}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, "shape_circle")}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-secondary hover:bg-muted border border-border text-xs font-black text-foreground transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                    >
                      <Circle size={14} /> Kreis
                    </button>
                    <button
                      onClick={() => handleAddCustomShape?.("square")}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, "shape_square")}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-secondary hover:bg-muted border border-border text-xs font-black text-foreground transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                    >
                      <Square size={14} /> Quadrat
                    </button>
                  </div>
                </div>
              </div>

              {/* Category 3: Automatisierung */}
              {onGenerateTimeline && (
                <div className="space-y-3 pt-2">
                  <div className="border-t border-border my-4" />
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground text-left">
                    Aktionen
                  </h3>
                  <button
                    onClick={onGenerateTimeline}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs transition-all hover:scale-[1.02] shadow-md shadow-violet-500/10"
                  >
                    <Calendar size={14} />
                    <span>Zeitstrahl generieren</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button when palette is closed */}
      {!showPalette && (
        <button
          onClick={() => setShowPalette(true)}
          className="absolute top-6 left-6 p-3 rounded-2xl bg-card border border-border shadow-xl text-foreground hover:bg-secondary z-30 pointer-events-auto transition-transform hover:scale-105"
          title="Elemente einblenden"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}
    </>
  );
}
