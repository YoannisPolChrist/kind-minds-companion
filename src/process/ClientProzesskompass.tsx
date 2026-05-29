import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, getDocs, collection, query, where, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebaseDb";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { translate } from "../lib/webLocale";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition } from "../components/motion";
import { BannerToast } from "../components/ui/Toast";
import { ProcessBaselinePanel } from "./ProcessBaselinePanel";
import { ProcessCompassInsightTiles, type ProcessBaseline, type ProcessCheckin } from "./ProcessCompassInsightTiles";
import ProcessCanvas from "./ProcessCanvas";
import NodeContentModal from "./NodeContentModal";
import {
  ArrowLeft, X, Check, Loader2, Play, Settings, Activity
} from "lucide-react";
import type { Node, Connection } from "./types";

function getCheckinTime(checkin: any) {
  if (!checkin) return 0;
  const raw = checkin.createdAt;
  if (raw && typeof raw === "object" && "toDate" in raw && typeof raw.toDate === "function") {
    return raw.toDate().getTime();
  }
  if (raw && (typeof raw === "string" || typeof raw === "number")) {
    return new Date(raw).getTime();
  }
  return 0;
}

export default function ClientProzesskompass() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { locale } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [checkins, setCheckins] = useState<ProcessCheckin[]>([]);
  const [baseline, setBaseline] = useState<ProcessBaseline | null>(null);
  const [clientNotes, setClientNotes] = useState<any[]>([]);
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [clientReflections, setClientReflections] = useState<any[]>([]);
  
  // Canvas Zoom/Pan State
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showInsights, setShowInsights] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [contentModalNode, setContentModalNode] = useState<any>(null);
  
  const toggleNodeSelection = useCallback((id: string, multi: boolean) => {
    setSelectedNodeIds(prev => {
      if (!multi) return [id];
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedNodeIds([]), []);

  // Inspector Dragging State
  const [inspectorPosition, setInspectorPosition] = useState({ x: 0, y: 0 });
  const [isInspectorDragging, setIsInspectorDragging] = useState(false);
  const inspectorDragStart = useRef({ x: 0, y: 0 });
  const inspectorPositionStart = useRef({ x: 0, y: 0 });

  // Reset position offset when selectedNode changes
  useEffect(() => {
    setInspectorPosition({ x: 0, y: 0 });
  }, [selectedNodeId]);

  const handleInspectorPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("textarea") || target.closest("select")) {
      return;
    }
    setIsInspectorDragging(true);
    inspectorDragStart.current = { x: e.clientX, y: e.clientY };
    inspectorPositionStart.current = { ...inspectorPosition };
    e.stopPropagation();
  };

  useEffect(() => {
    if (!isInspectorDragging) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - inspectorDragStart.current.x;
      const dy = e.clientY - inspectorDragStart.current.y;
      setInspectorPosition({
        x: inspectorPositionStart.current.x + dx,
        y: inspectorPositionStart.current.y + dy,
      });
    };

    const handleWindowPointerUp = () => {
      setIsInspectorDragging(false);
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: true });
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [isInspectorDragging]);

  // Inspector interactive state
  const [submittingReflection, setSubmittingReflection] = useState(false);
  const [localResponse, setLocalResponse] = useState("");

  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    subMessage?: string;
    type: "success" | "error";
  }>({ visible: false, message: "", type: "success" });

  const text = useMemo(() => ({
    title: translate(locale, { de: "Mein Prozesskompass", en: "My Process Compass" }),
    subtitle: translate(locale, { de: "Dein persönlicher Behandlungsverlauf und nächste Schritte.", en: "Your personal treatment journey and next steps." }),
    back: translate(locale, { de: "Zurück", en: "Back" }),
    completed: translate(locale, { de: "Erledigt", en: "Completed" }),
    pending: translate(locale, { de: "Offen", en: "Pending" }),
    inspectorTitle: translate(locale, { de: "Details", en: "Details" }),
    startExercise: translate(locale, { de: "Übung starten", en: "Start Exercise" }),
    responseLabel: translate(locale, { de: "Deine Reflexion", en: "Your Reflection" }),
    responsePlaceholder: translate(locale, { de: "Schreibe hier deine Gedanken auf...", en: "Write down your thoughts here..." }),
    submitResponse: translate(locale, { de: "Antwort absenden", en: "Submit Response" }),
    editResponse: translate(locale, { de: "Antwort bearbeiten", en: "Edit Response" }),
    noContent: translate(locale, { de: "Noch keine Elemente auf deinem Board platziert.", en: "No elements placed on your board yet." }),
  }), [locale]);

  // Load visual board and sync with live client collections
  useEffect(() => {
    if (!profile?.id) return;

    void (async () => {
      try {
        const [boardSnap, exercisesSnap, tasksSnap, reflectionsSnap, checkinsSnap, notesSnap] = await Promise.all([
          getDoc(doc(db, "process_boards", profile.id)),
          getDocs(query(collection(db, "exercises"), where("clientId", "==", profile.id))),
          getDocs(query(collection(db, "client_tasks"), where("clientId", "==", profile.id))),
          getDocs(query(collection(db, "client_reflections"), where("clientId", "==", profile.id))),
          getDocs(query(collection(db, "checkins"), where("uid", "==", profile.id))),
          getDocs(query(collection(db, "client_notes"), where("clientId", "==", profile.id))),
        ]);

        const exercisesList = exercisesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const tasksList = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const reflectionsList = reflectionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const notesList = notesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setClientTasks(tasksList);
        setClientReflections(reflectionsList);
        setClientNotes(notesList);
        
        const checkinsList = checkinsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ProcessCheckin));
        setCheckins(checkinsList);

        let loadedNodes: Node[] = [];
        let loadedConnections: Connection[] = [];

        if (boardSnap.exists()) {
          const boardData = boardSnap.data();
          loadedNodes = boardData.nodes || [];
          loadedConnections = boardData.connections || [];
          setBaseline((boardData.baseline as ProcessBaseline) || null);
        }

        // Merge latest live states
        const mergedNodes = loadedNodes.map(node => {
          if (node.type === "exercise" && node.linkedId) {
            const realEx = exercisesList.find(ex => ex.id === node.linkedId);
            if (realEx) {
              return {
                ...node,
                title: (realEx as any).title || node.title,
                metadata: {
                  ...node.metadata,
                  completed: (realEx as any).completed || false,
                }
              };
            }
          }
          if (node.type === "task" && node.linkedId) {
            const realTask = tasksList.find(t => t.id === node.linkedId);
            if (realTask) {
              return {
                ...node,
                title: (realTask as any).title || node.title,
                metadata: {
                  ...node.metadata,
                  description: (realTask as any).description || node.metadata?.description || "",
                  dueDate: (realTask as any).dueDate || node.metadata?.dueDate || "",
                  completed: (realTask as any).completed || false,
                }
              };
            }
          }
          if (node.type === "reflection" && node.linkedId) {
            const realRefl = reflectionsList.find(r => r.id === node.linkedId);
            if (realRefl) {
              return {
                ...node,
                metadata: {
                  ...node.metadata,
                  prompt: (realRefl as any).prompt || node.metadata?.prompt || "",
                  response: (realRefl as any).response || node.metadata?.response || "",
                  completed: (realRefl as any).completed || false,
                }
              };
            }
          }
          if (node.type === "checkin") {
            const checkinId = node.linkedId || node.metadata?.checkinId;
            const realCheckin = checkinsList.find(c => c.id === checkinId);
            if (realCheckin) {
              const timeMs = getCheckinTime(realCheckin);
              const formattedDate = timeMs > 0 ? new Date(timeMs).toLocaleDateString(locale === "en" ? "en-US" : "de-DE", { dateStyle: "short" }) : (realCheckin.date || "Kein Datum");
              return {
                ...node,
                metadata: {
                  ...node.metadata,
                  mood: realCheckin.mood,
                  energy: realCheckin.energy,
                  note: realCheckin.note,
                  date: formattedDate,
                  completed: true,
                }
              };
            }
          }
          return node;
        });

        setNodes(mergedNodes);
        setConnections(loadedConnections);
      } catch (err) {
        console.error("Failed to load client visual board:", err);
        setToast({ visible: true, message: "Fehler beim Laden", subMessage: "Bitte lade die Seite neu.", type: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  // Node Selection
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  useEffect(() => {
    if (selectedNode?.type === "reflection") {
      setLocalResponse(selectedNode.metadata?.response || "");
    } else {
      setLocalResponse("");
    }
  }, [selectedNodeId, selectedNode]);

  // Task Completion Action
  const handleToggleTask = async (nodeId: string, nextCompleted: boolean) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.linkedId) return;

    try {
      // Update in Firestore
      await updateDoc(doc(db, "client_tasks", node.linkedId), {
        completed: nextCompleted,
        updatedAt: serverTimestamp(),
      });

      // Update locally
      setNodes(prev => prev.map(n => n.id === nodeId ? {
        ...n,
        metadata: {
          ...n.metadata,
          completed: nextCompleted,
        }
      } : n));

      setToast({ visible: true, message: translate(locale, { de: "Aufgabe aktualisiert!", en: "Task updated!" }), type: "success" });
    } catch (err) {
      console.error("Failed to update task completion:", err);
      setToast({ visible: true, message: "Fehler beim Aktualisieren der Aufgabe", type: "error" });
    }
  };

  // Reflection Submission Action
  const handleSubmitReflection = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.linkedId || !localResponse.trim()) return;

    setSubmittingReflection(true);
    try {
      await updateDoc(doc(db, "client_reflections", node.linkedId), {
        response: localResponse,
        completed: true,
        respondedAt: serverTimestamp(),
      });

      setNodes(prev => prev.map(n => n.id === nodeId ? {
        ...n,
        metadata: {
          ...n.metadata,
          response: localResponse,
          completed: true,
        }
      } : n));

      setToast({ visible: true, message: translate(locale, { de: "Reflexion eingereicht!", en: "Reflection submitted!" }), type: "success" });
    } catch (err) {
      console.error("Failed to submit reflection:", err);
      setToast({ visible: true, message: "Fehler beim Senden", type: "error" });
    } finally {
      setSubmittingReflection(false);
    }
  };

  const handleUpdateNode = async (nodeId: string, updates: Partial<Node>) => {
    const updatedNodes = nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n);
    setNodes(updatedNodes);
    if (profile?.id) {
      try {
        await setDoc(doc(db, "process_boards", profile.id), {
          clientId: profile.id,
          nodes: updatedNodes,
          connections,
          baseline,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to update client board node:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  return (
    <PageTransition className="h-screen bg-[#F4F1EE] dark:bg-background relative flex flex-col overflow-hidden select-none">
      {/* Header Panel */}
      <div className="bg-[#FFFDF9]/90 dark:bg-background/80 backdrop-blur-md border-b border-[#DED6C9] dark:border-border py-4 px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => navigate("/dashboard")}
            className="p-2.5 rounded-xl bg-secondary text-foreground hover:bg-muted"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={18} />
          </motion.button>
          <div>
            <h1 className="text-lg font-black text-foreground">{text.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{text.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        {/* Canvas Area */}
        <ProcessCanvas
          nodes={nodes}
          connections={connections}
          panOffset={panOffset}
          zoom={zoom}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          setSelectedNodeIds={setSelectedNodeIds}
          toggleNodeSelection={toggleNodeSelection}
          clearSelection={clearSelection}
          onNodeClick={(node) => setContentModalNode(node)}
          setNodes={setNodes}
          setConnections={setConnections}
          setPanOffset={setPanOffset}
          setZoom={setZoom}
          setSelectedNodeId={setSelectedNodeId}
          onSave={async () => {}}
          isReadOnly={true}
          locale={locale}
          text={{
            completed: text.completed,
            pending: text.pending,
            openInBuilder: "",
          }}
          baseline={baseline}
          clientNotes={clientNotes}
          clientTasks={clientTasks}
          clientReflections={clientReflections}
          onToggleTaskDirectly={handleToggleTask}
        />
        
        <NodeContentModal
          node={contentModalNode}
          onClose={() => setContentModalNode(null)}
          clientId={profile?.id}
          onUpdateNode={handleUpdateNode}
          baseline={baseline}
          isReadOnly={false}
        />

        {/* Sidebar Inspector Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-4 max-h-[calc(100%-2rem)] w-80 bg-[#FFFDF9]/95 dark:bg-card/95 backdrop-blur-md border border-[#DED6C9] dark:border-border flex flex-col z-30 rounded-[2.2rem] shadow-2xl pointer-events-auto overflow-hidden select-none cursor-default"
              style={{
                right: `${16 - inspectorPosition.x}px`,
                top: `${16 + inspectorPosition.y}px`,
              }}
            >
              <div 
                onPointerDown={handleInspectorPointerDown}
                className="flex items-center justify-between border-b border-[#DED6C9] dark:border-border p-5 cursor-grab active:cursor-grabbing hover:bg-muted/30 select-none shrink-0"
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5 shrink-0 mr-1 opacity-40">
                    <span className="w-3.5 h-0.5 bg-foreground rounded-full"></span>
                    <span className="w-3.5 h-0.5 bg-foreground rounded-full"></span>
                    <span className="w-3.5 h-0.5 bg-foreground rounded-full"></span>
                  </div>
                  <Settings size={16} className="text-primary" />
                  <h2 className="text-sm font-black text-foreground">{text.inspectorTitle}</h2>
                </div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1.5 rounded-xl hover:bg-secondary"
                >
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Node Title & Description (Read-Only) */}
                <div className="space-y-1">
                  <h3 className="text-base font-black text-foreground">{selectedNode.title}</h3>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {selectedNode.type.toUpperCase()}
                  </span>
                </div>

                {selectedNode.metadata?.description && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Beschreibung</label>
                    <p className="text-xs text-foreground leading-relaxed bg-secondary rounded-xl p-3 border border-border">
                      {selectedNode.metadata.description}
                    </p>
                  </div>
                )}

                {/* Specific Node Types Interactive Options */}
                
                {/* Task Node */}
                {selectedNode.type === "task" && (
                  <div className="space-y-4 border-t border-border pt-4">
                    {selectedNode.metadata?.dueDate && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fälligkeitsdatum</label>
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {selectedNode.metadata.dueDate}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => handleToggleTask(selectedNode.id, !selectedNode.metadata?.completed)}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                        selectedNode.metadata?.completed
                          ? "bg-success/10 border border-success/20 text-success"
                          : "bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/15"
                      }`}
                    >
                      <Check size={14} />
                      {selectedNode.metadata?.completed ? "Als offen markieren" : "Erledigt markieren"}
                    </button>
                  </div>
                )}

                {/* Reflection Node */}
                {selectedNode.type === "reflection" && (
                  <div className="space-y-4 border-t border-border pt-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Therapeutischer Impuls</label>
                      <p className="text-xs italic text-foreground leading-relaxed bg-secondary rounded-xl p-3 border border-border font-medium">
                        "{selectedNode.metadata?.prompt}"
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{text.responseLabel}</label>
                      <textarea
                        value={localResponse}
                        onChange={(e) => setLocalResponse(e.target.value)}
                        placeholder={text.responsePlaceholder}
                        rows={5}
                        className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs text-foreground resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <button
                      onClick={() => handleSubmitReflection(selectedNode.id)}
                      disabled={submittingReflection || !localResponse.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black shadow-md shadow-primary/15 disabled:opacity-50"
                    >
                      {submittingReflection ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Senden...
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          {selectedNode.metadata?.completed ? text.editResponse : text.submitResponse}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Exercise Node */}
                {selectedNode.type === "exercise" && selectedNode.linkedId && (
                  <div className="space-y-4 border-t border-border pt-4">
                    <button
                      onClick={() => navigate(`/exercise/${selectedNode.linkedId}`)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black shadow-md shadow-primary/15"
                    >
                      <Play size={12} fill="currentColor" />
                      {text.startExercise}
                    </button>
                  </div>
                )}

                {/* Appointment Node */}
                {selectedNode.type === "appointment" && selectedNode.metadata?.date && (
                  <div className="space-y-4 border-t border-border pt-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nächster Termin</label>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                        {selectedNode.metadata.date}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BannerToast visible={toast.visible} message={toast.message} type={toast.type} onDone={() => setToast({ ...toast, visible: false })} />
    </PageTransition>
  );
}
