import { motion, AnimatePresence } from "motion/react";
import { Settings, X, Sparkles, Trash } from "lucide-react";
import type { Node } from "./types";
import { THEME_COLORS } from "./types";

interface ProcessInspectorProps {
  selectedNodeId?: string | null;
  selectedNode: Node | undefined;
  setSelectedNodeId: (id: string | null) => void;
  localTitle: string;
  setLocalTitle: (val: string) => void;
  handleTitleBlur: (id: string, val: string) => void;
  localDescription: string;
  setLocalDescription: (val: string) => void;
  handleDescriptionBlur: (id: string, val: string) => void;
  localDate: string;
  setLocalDate: (val: string) => void;
  handleDateBlur: (id: string, val: string) => void;
  localDueDate: string;
  setLocalDueDate: (val: string) => void;
  handleDueDateBlur: (id: string, val: string) => void;
  localPrompt: string;
  setLocalPrompt: (val: string) => void;
  handlePromptBlur: (id: string, val: string) => void;
  nodes?: Node[];
  handleUpdateNode: (updates: Partial<Node>) => void;
  handleUpdateNodeMetadata?: (metaUpdates: any) => void;
  handleSave?: (silent: boolean, customNodes?: Node[]) => Promise<void>;
  handleDeleteNode: (id: string) => void;
  handleOpenInlineEditor?: (node: Node) => void;
  locale?: string;
  text?: {
    inspector: string;
    titleLabel: string;
    descLabel: string;
    colorLabel: string;
    deleteNode: string;
  };
}

export default function ProcessInspector({
  selectedNode,
  setSelectedNodeId,
  localTitle,
  setLocalTitle,
  handleTitleBlur,
  localDescription,
  setLocalDescription,
  handleDescriptionBlur,
  localDate,
  setLocalDate,
  handleDateBlur,
  localDueDate,
  setLocalDueDate,
  handleDueDateBlur,
  localPrompt,
  setLocalPrompt,
  handlePromptBlur,
  nodes = [],
  handleUpdateNode,
  handleSave,
  handleDeleteNode,
  handleOpenInlineEditor,
  text = { inspector: "Kachel Details", titleLabel: "Titel / Text", descLabel: "Beschreibung", colorLabel: "Farbe", deleteNode: "Kachel löschen" },
}: ProcessInspectorProps) {
  return (
    <AnimatePresence>
      {selectedNode && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-80 h-full bg-card border-l border-border flex flex-col z-20 shrink-0 pointer-events-auto relative shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border p-5">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-primary" />
              <h2 className="text-sm font-black text-foreground">{text.inspector}</h2>
            </div>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="p-1.5 rounded-xl hover:bg-secondary"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Title edit */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {text.titleLabel}
              </label>
              <input
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={(e) => handleTitleBlur(selectedNode.id, e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* Description edit for Anamnese, Appointment, Exercise, Task, Note, Milestone */}
            {(selectedNode.type === "anamnese" ||
              selectedNode.type === "appointment" ||
              selectedNode.type === "exercise" ||
              selectedNode.type === "task" ||
              selectedNode.type === "note" ||
              selectedNode.type === "milestone") && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {text.descLabel}
                </label>
                <textarea
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  onBlur={(e) => handleDescriptionBlur(selectedNode.id, e.target.value)}
                  className="w-full h-24 bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Date edit for Appointment */}
            {selectedNode.type === "appointment" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Datum / Zeit
                </label>
                <input
                  type="text"
                  value={localDate}
                  onChange={(e) => setLocalDate(e.target.value)}
                  onBlur={(e) => handleDateBlur(selectedNode.id, e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Task dueDate edit */}
            {selectedNode.type === "task" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Fälligkeitsdatum
                </label>
                <input
                  type="date"
                  value={localDueDate}
                  onChange={(e) => setLocalDueDate(e.target.value)}
                  onBlur={(e) => handleDueDateBlur(selectedNode.id, e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Reflection prompt edit */}
            {selectedNode.type === "reflection" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Reflexionsimpuls / Frage
                </label>
                <textarea
                  value={localPrompt}
                  onChange={(e) => setLocalPrompt(e.target.value)}
                  onBlur={(e) => handlePromptBlur(selectedNode.id, e.target.value)}
                  className="w-full h-24 bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Read-only client response */}
            {selectedNode.type === "reflection" && selectedNode.metadata?.response && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Antwort des Klienten
                </label>
                <div className="w-full bg-secondary border border-border rounded-xl p-3 text-xs text-foreground min-h-[4rem] whitespace-pre-wrap select-text">
                  {selectedNode.metadata.response}
                </div>
              </div>
            )}

            {/* Color customizer for custom shapes, exercise, note, milestone */}
            {(selectedNode.type === "custom_shape" ||
              selectedNode.type === "exercise" ||
              selectedNode.type === "note" ||
              selectedNode.type === "milestone") && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {text.colorLabel}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {THEME_COLORS.map((col) => (
                    <button
                      key={col.value}
                      onClick={() => {
                        handleUpdateNode({ color: col.value });
                        const updated = nodes.map((n) =>
                          n.id === selectedNode.id ? { ...n, color: col.value } : n
                        );
                        void handleSave?.(true, updated);
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        selectedNode.color === col.value
                          ? "scale-110 border-foreground shadow-md"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: col.value }}
                      title={col.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Border Customizer */}
            <div className="space-y-4 pt-4 border-t border-border/60">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Rahmen anpassen
              </h4>

              {/* Border Style */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground">Stil</label>
                <select
                  value={selectedNode.borderStyle || "none"}
                  onChange={(e) => {
                    const val = e.target.value;
                    const styleVal = val === "none" ? undefined : val;
                    handleUpdateNode({ borderStyle: styleVal });
                    const updated = nodes.map((n) =>
                      n.id === selectedNode.id ? { ...n, borderStyle: styleVal } : n
                    );
                    void handleSave?.(true, updated);
                  }}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="none">Kein Rahmen</option>
                  <option value="solid">Durchgezogen (Solid)</option>
                  <option value="dashed">Gestrichelt (Dashed)</option>
                  <option value="dotted">Gepunktet (Dotted)</option>
                  <option value="double">Doppelt (Double)</option>
                </select>
              </div>

              {/* Border Width */}
              {selectedNode.borderStyle && selectedNode.borderStyle !== "none" && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                      <span>Breite</span>
                      <span>{selectedNode.borderWidth || 2}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={selectedNode.borderWidth || 2}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleUpdateNode({ borderWidth: val });
                        const updated = nodes.map((n) =>
                          n.id === selectedNode.id ? { ...n, borderWidth: val } : n
                        );
                        void handleSave?.(true, updated);
                      }}
                      className="w-full accent-primary bg-secondary h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Border Color */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground">Rahmenfarbe</label>
                    <div className="flex gap-2 flex-wrap">
                      {THEME_COLORS.map((col) => (
                        <button
                          key={`border-col-${col.value}`}
                          onClick={() => {
                            handleUpdateNode({ borderColor: col.value });
                            const updated = nodes.map((n) =>
                              n.id === selectedNode.id ? { ...n, borderColor: col.value } : n
                            );
                            void handleSave?.(true, updated);
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            selectedNode.borderColor === col.value
                              ? "scale-110 border-foreground shadow-md"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: col.value }}
                          title={col.name}
                        />
                      ))}
                      {/* Color picker */}
                      <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border flex items-center justify-center bg-secondary hover:bg-muted cursor-pointer">
                        <input
                          type="color"
                          value={selectedNode.borderColor || "#8B5CF6"}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateNode({ borderColor: val });
                            const updated = nodes.map((n) =>
                              n.id === selectedNode.id ? { ...n, borderColor: val } : n
                            );
                            void handleSave?.(true, updated);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Sparkles size={12} className="text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border space-y-3">
              {(selectedNode.type === "exercise" ||
                selectedNode.type === "task" ||
                selectedNode.type === "reflection") && (
                <button
                  onClick={() => handleOpenInlineEditor?.(selectedNode)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-md shadow-primary/10 transition-colors"
                >
                  <Sparkles size={14} className="animate-pulse" /> Modul bearbeiten
                </button>
              )}
              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold transition-colors"
              >
                <Trash size={14} /> {text.deleteNode}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
