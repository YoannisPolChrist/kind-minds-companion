import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { doc, getDoc, setDoc, getDocs, collection, query, where, addDoc, serverTimestamp, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebaseDb";
import { useLanguage } from "../hooks/useLanguage";
import { translate } from "../lib/webLocale";
import { buildNotificationDocumentData } from "../../modules/notifications/utils";
import type { Node, Connection, NodeType } from "./types";
import type { ProcessBaseline, ProcessCheckin } from "./ProcessCompassInsightTiles";
import type { ProcessResourceCandidate } from "./ProcessBaselinePanel";

function getCheckinTime(checkin: ProcessCheckin) {
  if (!checkin) return 0;
  const raw = checkin.createdAt;
  if (raw && typeof raw === "object" && "toDate" in raw && typeof raw.toDate === "function") {
    return raw.toDate().getTime();
  }
  const candidate = raw instanceof Date ? raw : new Date(String(raw || checkin.date || ""));
  const time = candidate.getTime();
  return Number.isFinite(time) ? time : 0;
}

export function useProcessData(
  clientId: string | undefined,
  profileId: string | undefined,
  canvasRef: React.RefObject<HTMLDivElement | null>
) {
  const { locale } = useLanguage();

  // Firestore collections states
  const [client, setClient] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientExercises, setClientExercises] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<ProcessCheckin[]>([]);
  const [clientResources, setClientResources] = useState<ProcessResourceCandidate[]>([]);
  const [baseline, setBaseline] = useState<ProcessBaseline | null>(null);
  const [clientNotes, setClientNotes] = useState<any[]>([]);
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [clientReflections, setClientReflections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Canvas state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Local states for Inspector edits to prevent typing lag
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [localDate, setLocalDate] = useState("");
  const [localDueDate, setLocalDueDate] = useState("");
  const [localPrompt, setLocalPrompt] = useState("");

  // Refs to always access current nodes/connections in async functions/callbacks
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  // Sync local Inspector fields whenever the selected node changes
  useEffect(() => {
    if (!selectedNodeId) {
      setLocalTitle("");
      setLocalDescription("");
      setLocalDate("");
      setLocalDueDate("");
      setLocalPrompt("");
      return;
    }
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;
    setLocalTitle(node.title || "");
    setLocalDescription(node.metadata?.description || "");
    setLocalDate(node.metadata?.date || "");
    setLocalDueDate(node.metadata?.dueDate || "");
    setLocalPrompt(node.metadata?.prompt || "");
  }, [selectedNodeId]); // intentionally only on selection change, not on every nodes update

  // Inline Module Editor states
  const [editingNodeInline, setEditingNodeInline] = useState<Node | null>(null);
  const [inlineExercise, setInlineExercise] = useState<any>(null);
  const [inlineTask, setInlineTask] = useState<any>(null);
  const [inlineReflection, setInlineReflection] = useState<any>(null);
  const [loadingInlineData, setLoadingInlineData] = useState(false);

  // Modals and Palette
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [exerciseModalTab, setExerciseModalTab] = useState<"assign" | "existing">("assign");
  const [selectedTemplateForAssign, setSelectedTemplateForAssign] = useState<any>(null);
  const [assigningExercise, setAssigningExercise] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [documentDropCoords, setDocumentDropCoords] = useState<{ x: number; y: number } | null>(null);
  const [exerciseDropCoords, setExerciseDropCoords] = useState<{ x: number; y: number } | null>(null);

  // Save status states
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "error">("synced");
  const [lastSaved, setLastSaved] = useState<string>("");

  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    subMessage?: string;
    type: "success" | "error";
  }>({ visible: false, message: "", type: "success" });

  const text = useMemo(() => ({
    saved: translate(locale, { de: "Board gespeichert!", en: "Board saved!" }),
    saveError: translate(locale, { de: "Fehler beim Speichern", en: "Error saving board" }),
  }), [locale]);

  // Helpers for canvas calculation
  const getCanvasCenter = useCallback(() => {
    if (canvasRef.current) {
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      return {
        x: (w / 2 - panOffset.x) / zoom - 100,
        y: (h / 2 - panOffset.y) / zoom - 50,
      };
    }
    return { x: 200, y: 200 };
  }, [panOffset, zoom, canvasRef]);

  // Load client, exercises, templates, and board layout
  useEffect(() => {
    if (!profileId) return;

    if (!clientId) {
      void (async () => {
        try {
          const snap = await getDocs(query(
            collection(db, "users"),
            where("role", "==", "client"),
            where("therapistId", "==", profileId)
          ));
          setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c: any) => !c.isArchived));
        } catch (e) {
          console.error("Failed to load clients for Prozesskompass:", e);
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    void (async () => {
      try {
        const [clientSnap, exSnap, tplSnap, boardSnap, tasksSnap, reflectionsSnap, checkinsSnap, resourcesSnap, notesSnap] = await Promise.all([
          getDoc(doc(db, "users", clientId)),
          getDocs(query(collection(db, "exercises"), where("clientId", "==", clientId))),
          getDocs(query(collection(db, "exercise_templates"), where("therapistId", "==", profileId))),
          getDoc(doc(db, "process_boards", clientId)),
          getDocs(query(collection(db, "client_tasks"), where("clientId", "==", clientId))),
          getDocs(query(collection(db, "client_reflections"), where("clientId", "==", clientId))),
          getDocs(query(collection(db, "checkins"), where("uid", "==", clientId))),
          getDocs(query(collection(db, "client_resources"), where("clientId", "==", clientId))),
          getDocs(query(collection(db, "client_notes"), where("clientId", "==", clientId))),
        ]);

        if (clientSnap.exists()) {
          setClient({ id: clientSnap.id, ...clientSnap.data() });
        }

        const exercisesList = exSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
        setClientExercises(exercisesList);
        setTemplates(tplSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t: any) => !t.isArchived));

        const tasksList = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
        const reflectionsList = reflectionsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
        const notesList = notesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

        setClientTasks(tasksList);
        setClientReflections(reflectionsList);
        setClientNotes(notesList);
        const checkinsList = checkinsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ProcessCheckin));
        setCheckins(checkinsList);
        setClientResources(resourcesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ProcessResourceCandidate)));

        let loadedNodes: Node[] = [];
        let loadedConnections: Connection[] = [];

        if (boardSnap.exists()) {
          const boardData = boardSnap.data();
          loadedNodes = boardData.nodes || [];
          loadedConnections = boardData.connections || [];
          setBaseline((boardData.baseline as ProcessBaseline) || null);
        } else {
          // Default welcoming onboarding nodes
          loadedNodes = [
            {
              id: "intro",
              type: "custom_shape",
              shape: "circle",
              x: 100,
              y: 180,
              title: "Start",
              color: "#8B5CF6",
            },
            {
              id: "first_anamnese",
              type: "anamnese",
              x: 280,
              y: 180,
              title: "Erstgespräch & Anamnese",
              metadata: { description: "Kennenlernen und Formulierung der ersten therapeutischen Ziele." },
            },
          ];
          loadedConnections = [
            { id: "conn_init", from: "intro", to: "first_anamnese" },
          ];
        }

        // Merge latest live tasks, reflections, and exercises progress from their own collections
        const mergedNodes = loadedNodes.map(node => {
          if (node.type === "exercise" && node.linkedId) {
            const realEx = exercisesList.find(ex => ex.id === node.linkedId);
            if (realEx) {
              return {
                ...node,
                title: realEx.title || node.title,
                metadata: {
                  ...node.metadata,
                  completed: realEx.completed || false,
                }
              };
            }
          }
          if (node.type === "task" && node.linkedId) {
            const realTask = tasksList.find(t => t.id === node.linkedId);
            if (realTask) {
              return {
                ...node,
                title: realTask.title || node.title,
                metadata: {
                  ...node.metadata,
                  description: realTask.description || node.metadata?.description || "",
                  dueDate: realTask.dueDate || node.metadata?.dueDate || "",
                  completed: realTask.completed || false,
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
                  prompt: realRefl.prompt || node.metadata?.prompt || "",
                  response: realRefl.response || node.metadata?.response || "",
                  completed: realRefl.completed || false,
                }
              };
            }
          }
          return node;
        });

        // Sync check-ins: compare loaded check-ins against board nodes on load
        let checkinNodesAdded = false;
        const currentCheckinNodes = mergedNodes.filter(n => n.type === "checkin");
        
        const sortedCheckins = [...checkinsList].sort((a, b) => {
          const tA = getCheckinTime(a);
          const tB = getCheckinTime(b);
          return tA - tB;
        });

        let nextCheckinX = 100;
        if (currentCheckinNodes.length > 0) {
          nextCheckinX = Math.max(...currentCheckinNodes.map(n => n.x)) + 140;
        }

        sortedCheckins.forEach(checkin => {
          const exists = mergedNodes.some(n => n.type === "checkin" && (n.linkedId === checkin.id || n.metadata?.checkinId === checkin.id));
          if (!exists && checkin.id) {
            const timeMs = getCheckinTime(checkin);
            const formattedDate = timeMs > 0 ? new Date(timeMs).toLocaleDateString(locale === "en" ? "en-US" : "de-DE", { dateStyle: "short" }) : "Kein Datum";
            
            const checkinNode: Node = {
              id: `node_checkin_${checkin.id}`,
              type: "checkin",
              x: nextCheckinX,
              y: 450,
              w: 120,
              h: 120,
              title: `Check-in ${formattedDate}`,
              color: "#EC4899",
              linkedId: checkin.id,
              metadata: {
                mood: checkin.mood,
                energy: checkin.energy,
                note: checkin.note,
                date: formattedDate,
                checkinId: checkin.id
              }
            };
            mergedNodes.push(checkinNode);
            nextCheckinX += 140;
            checkinNodesAdded = true;
          }
        });

        if (checkinNodesAdded) {
          await setDoc(doc(db, "process_boards", clientId), {
            clientId,
            nodes: mergedNodes,
            connections: loadedConnections,
            baseline: boardSnap.exists() ? boardSnap.data().baseline || null : null,
            updatedAt: serverTimestamp(),
          });
        }

        setNodes(mergedNodes);
        setConnections(loadedConnections);
      } catch (e) {
        console.error("Failed to load Prozesskompass board:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId, profileId]);

  // Save visual board
  const handleSave = useCallback(async (
    silent = false,
    customNodes?: Node[],
    customConnections?: Connection[]
  ) => {
    if (!clientId) return;
    if (!silent) setSaving(true);
    setSyncStatus("saving");

    const nodesToSave = customNodes ?? nodesRef.current;
    const connectionsToSave = customConnections ?? connectionsRef.current;

    try {
      await setDoc(doc(db, "process_boards", clientId), {
        clientId,
        nodes: nodesToSave,
        connections: connectionsToSave,
        baseline,
        updatedAt: serverTimestamp(),
      });

      setSyncStatus("synced");
      const now = new Date();
      setLastSaved(now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      if (!silent) {
        setToast({ visible: true, message: text.saved, type: "success" });
      }
    } catch (e) {
      console.error("Failed to save visual board:", e);
      setSyncStatus("error");
      if (!silent) {
        setToast({ visible: true, message: text.saveError, subMessage: "Please check rules or connection.", type: "error" });
      }
    } finally {
      if (!silent) setSaving(false);
    }
  }, [clientId, baseline, locale, text]);

  const handleSaveBaseline = useCallback(async (nextBaseline: ProcessBaseline) => {
    if (!clientId) return;
    setBaseline(nextBaseline);
    try {
      const currentNodes = [...nodesRef.current];
      const hasAnamnese = currentNodes.some(n => n.type === "anamnese" && n.id === "first_anamnese");
      const clientName = `${client?.firstName || ""} ${client?.lastName || ""}`.trim() || "Klient";
      const baselineDate = nextBaseline.date || new Date().toLocaleDateString(locale === "en" ? "en-US" : "de-DE", { dateStyle: "short" });
      const baselineTitle = `Anamnese - ${clientName} - ${baselineDate}`;

      let updatedNodes = currentNodes;
      if (hasAnamnese) {
        updatedNodes = currentNodes.map(n => n.id === "first_anamnese" ? {
          ...n,
          title: baselineTitle,
          metadata: {
            ...n.metadata,
            description: nextBaseline.goal || n.metadata?.description || "",
            date: baselineDate
          }
        } : n);
      } else {
        const center = getCanvasCenter();
        const newAnamneseNode: Node = {
          id: "first_anamnese",
          type: "anamnese",
          x: center.x,
          y: center.y,
          title: baselineTitle,
          metadata: {
            description: nextBaseline.goal || "",
            date: baselineDate
          }
        };
        updatedNodes.push(newAnamneseNode);
      }

      await setDoc(doc(db, "process_boards", clientId), {
        clientId,
        nodes: updatedNodes,
        connections: connectionsRef.current,
        baseline: nextBaseline,
        updatedAt: serverTimestamp(),
      });
      setNodes(updatedNodes);
      setSyncStatus("synced");
      setToast({ visible: true, message: "Anamnese-Basis gespeichert", type: "success" });
    } catch (error) {
      console.error("Failed to save baseline:", error);
      setSyncStatus("error");
      setToast({ visible: true, message: text.saveError, subMessage: "Baseline konnte nicht gespeichert werden.", type: "error" });
    }
  }, [clientId, client, locale, getCanvasCenter, text]);

  // Node operations
  const findFreePosition = useCallback((targetX: number, targetY: number): { x: number; y: number } => {
    let x = targetX;
    let y = targetY;
    let shiftCount = 0;

    const isOccupied = (px: number, py: number) => {
      return nodesRef.current.some(node => {
        const dx = Math.abs(node.x - px);
        const dy = Math.abs(node.y - py);
        return dx < 140 && dy < 140;
      });
    };

    while (isOccupied(x, y) && shiftCount < 20) {
      shiftCount++;
      if (shiftCount % 4 === 0) {
        x = targetX;
        y += 140;
      } else {
        x += 140;
      }
    }

    return { x, y };
  }, []);

  const handleAddCustomShape = useCallback((shape: "circle" | "square", x?: number, y?: number) => {
    const center = getCanvasCenter();
    const targetX = x !== undefined ? x : center.x;
    const targetY = y !== undefined ? y : center.y;
    const { x: finalX, y: finalY } = findFreePosition(targetX, targetY);
    const newNode: Node = {
      id: `node_shape_${Date.now()}`,
      type: "custom_shape",
      shape,
      x: finalX,
      y: finalY,
      title: shape === "circle" ? "Kreis" : "Quadrat",
      color: "#8B5CF6",
    };
    const updated = [...nodesRef.current, newNode];
    setNodes(updated);
    setSelectedNodeId(newNode.id);
    void handleSave(true, updated);
  }, [getCanvasCenter, findFreePosition, handleSave]);

  const handleAddAnamneseNode = useCallback((x?: number, y?: number) => {
    const center = getCanvasCenter();
    const targetX = x !== undefined ? x : center.x;
    const targetY = y !== undefined ? y : center.y;
    const { x: finalX, y: finalY } = findFreePosition(targetX, targetY);
    const newNode: Node = {
      id: `node_anamnese_${Date.now()}`,
      type: "anamnese",
      x: finalX,
      y: finalY,
      title: "Anamnese Schritt",
      metadata: { description: "Beschreibung des therapeutischen Schrittes hier..." },
    };
    const updated = [...nodesRef.current, newNode];
    setNodes(updated);
    setSelectedNodeId(newNode.id);
    void handleSave(true, updated);
  }, [getCanvasCenter, findFreePosition, handleSave]);

  const handleAddAppointmentNode = useCallback((x?: number, y?: number) => {
    const center = getCanvasCenter();
    const targetX = x !== undefined ? x : center.x;
    const targetY = y !== undefined ? y : center.y;
    const { x: finalX, y: finalY } = findFreePosition(targetX, targetY);
    const nextApp = client?.nextAppointment ? new Date(client.nextAppointment).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" }) : "Kein Termin";
    const newNode: Node = {
      id: `node_appointment_${Date.now()}`,
      type: "appointment",
      x: finalX,
      y: finalY,
      title: `Therapiesitzung`,
      metadata: {
        date: nextApp,
        description: "Reguläre therapeutische Begleitung",
      },
    };
    const updated = [...nodesRef.current, newNode];
    setNodes(updated);
    setSelectedNodeId(newNode.id);
    void handleSave(true, updated);
  }, [getCanvasCenter, client, locale, findFreePosition, handleSave]);

  const handleAddExerciseNode = useCallback((exercise: any, x?: number, y?: number) => {
    if (nodesRef.current.some(n => n.type === "exercise" && n.linkedId === exercise.id)) {
      setToast({ visible: true, message: "Übung bereits auf dem Board", type: "error" });
      return;
    }

    const center = getCanvasCenter();
    const targetX = x !== undefined ? x : center.x;
    const targetY = y !== undefined ? y : center.y;
    const { x: finalX, y: finalY } = findFreePosition(targetX, targetY);
    const newNode: Node = {
      id: `node_exercise_${Date.now()}`,
      type: "exercise",
      x: finalX,
      y: finalY,
      title: exercise.title || "Übung",
      linkedId: exercise.id,
      color: exercise.themeColor || "#6366F1",
      metadata: {
        completed: exercise.completed || false,
      },
    };
    const updated = [...nodesRef.current, newNode];
    setNodes(updated);
    setSelectedNodeId(newNode.id);
    setShowAddExerciseModal(false);
    void handleSave(true, updated);
  }, [getCanvasCenter, findFreePosition, handleSave]);

  const handleAssignTemplate = useCallback(async () => {
    if (!selectedTemplateForAssign || !clientId) return;
    setAssigningExercise(true);

    try {
      const docRef = await addDoc(collection(db, "exercises"), {
        clientId,
        therapistId: profileId,
        title: selectedTemplateForAssign.title,
        blocks: selectedTemplateForAssign.blocks || [],
        themeColor: selectedTemplateForAssign.themeColor || null,
        recurrence: "none",
        completed: false,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), buildNotificationDocumentData({
        userId: clientId,
        type: "exercise_assigned",
        exerciseId: docRef.id,
        exerciseTitle: selectedTemplateForAssign.title,
        createdAt: serverTimestamp(),
      }));

      const exSnap = await getDocs(query(collection(db, "exercises"), where("clientId", "==", clientId)));
      const exercisesList = exSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClientExercises(exercisesList);

      const center = getCanvasCenter();
      const targetX = exerciseDropCoords ? exerciseDropCoords.x : center.x;
      const targetY = exerciseDropCoords ? exerciseDropCoords.y : center.y;
      const { x: finalX, y: finalY } = findFreePosition(targetX, targetY);
      const newNode: Node = {
        id: `node_exercise_${Date.now()}`,
        type: "exercise",
        x: finalX,
        y: finalY,
        title: selectedTemplateForAssign.title,
        linkedId: docRef.id,
        color: selectedTemplateForAssign.themeColor || "#6366F1",
        metadata: {
          completed: false,
        },
      };

      const updated = [...nodesRef.current, newNode];
      setNodes(updated);
      setSelectedNodeId(newNode.id);
      setSelectedTemplateForAssign(null);
      setShowAddExerciseModal(false);
      setExerciseDropCoords(null);
      setToast({ visible: true, message: "Übung zugewiesen & Kachel erstellt!", type: "success" });
      void handleSave(true, updated);
    } catch (e) {
      console.error("Assigning template failed:", e);
      setToast({ visible: true, message: "Fehler", subMessage: "Zuweisung fehlgeschlagen.", type: "error" });
    } finally {
      setAssigningExercise(false);
    }
  }, [selectedTemplateForAssign, clientId, profileId, getCanvasCenter, exerciseDropCoords, findFreePosition, handleSave]);

  const handleAddTaskNode = useCallback(async (x?: number, y?: number) => {
    if (!clientId) return;
    const center = getCanvasCenter();
    const targetX = x !== undefined ? x : center.x;
    const targetY = y !== undefined ? y : center.y;
    const { x: finalX, y: finalY } = findFreePosition(targetX, targetY);
    try {
      const docRef = await addDoc(collection(db, "client_tasks"), {
        clientId,
        therapistId: profileId || "",
        title: "Neue Aufgabe",
        description: "",
        completed: false,
        dueDate: "",
        createdAt: serverTimestamp(),
      });

      const newNode: Node = {
        id: `node_task_${Date.now()}`,
        type: "task",
        x: finalX,
        y: finalY,
        title: "Neue Aufgabe",
        linkedId: docRef.id,
        metadata: {
          description: "",
          dueDate: "",
          completed: false,
        },
      };
      const updated = [...nodesRef.current, newNode];
      setNodes(updated);
      setSelectedNodeId(newNode.id);
      setToast({ visible: true, message: "Aufgabe erstellt!", type: "success" });
      void handleSave(true, updated);
    } catch (e) {
      console.error("Failed to create task node:", e);
      setToast({ visible: true, message: "Fehler beim Erstellen der Aufgabe", type: "error" });
    }
  }, [clientId, profileId, getCanvasCenter, findFreePosition, handleSave]);

  const handleAddReflectionNode = useCallback(async (x?: number, y?: number) => {
    if (!clientId) return;
    const center = getCanvasCenter();
    const targetX = x !== undefined ? x : center.x;
    const targetY = y !== undefined ? y : center.y;
    const { x: finalX, y: finalY } = findFreePosition(targetX, targetY);
    try {
      const docRef = await addDoc(collection(db, "client_reflections"), {
        clientId,
        therapistId: profileId || "",
        prompt: "Reflexionsimpuls",
        response: "",
        completed: false,
        createdAt: serverTimestamp(),
      });

      const newNode: Node = {
        id: `node_reflection_${Date.now()}`,
        type: "reflection",
        x: finalX,
        y: finalY,
        title: "Reflexion",
        linkedId: docRef.id,
        metadata: {
          prompt: "Reflexionsimpuls",
          response: "",
          completed: false,
        },
      };
      const updated = [...nodesRef.current, newNode];
      setNodes(updated);
      setSelectedNodeId(newNode.id);
      setToast({ visible: true, message: "Reflexionsimpuls erstellt!", type: "success" });
      void handleSave(true, updated);
    } catch (e) {
      console.error("Failed to create reflection node:", e);
      setToast({ visible: true, message: "Fehler beim Erstellen des Reflexionsimpulses", type: "error" });
    }
  }, [clientId, profileId, getCanvasCenter, findFreePosition, handleSave]);

  const handleAddNoteNode = useCallback((x?: number, y?: number) => {
    const center = getCanvasCenter();
    const targetX = x !== undefined ? x : center.x;
    const targetY = y !== undefined ? y : center.y;
    const { x: finalX, y: finalY } = findFreePosition(targetX, targetY);
    const newNode: Node = {
      id: `node_note_${Date.now()}`,
      type: "note",
      x: finalX,
      y: finalY,
      title: "Notiz",
      color: "#F59E0B",
      metadata: { description: "Hier eigene Gedanken festhalten..." },
    };
    const updated = [...nodesRef.current, newNode];
    setNodes(updated);
    setSelectedNodeId(newNode.id);
    void handleSave(true, updated);
  }, [getCanvasCenter, findFreePosition, handleSave]);

  const handleAddMilestoneNode = useCallback((x?: number, y?: number) => {
    const center = getCanvasCenter();
    const targetX = x !== undefined ? x : center.x;
    const targetY = y !== undefined ? y : center.y;
    const { x: finalX, y: finalY } = findFreePosition(targetX, targetY);
    const newNode: Node = {
      id: `node_milestone_${Date.now()}`,
      type: "milestone",
      x: finalX,
      y: finalY,
      title: "Meilenstein",
      color: "#F43F5E",
      metadata: { description: "Erreichter Zwischenschritt im Therapieprozess." },
    };
    const updated = [...nodesRef.current, newNode];
    setNodes(updated);
    setSelectedNodeId(newNode.id);
    void handleSave(true, updated);
  }, [getCanvasCenter, findFreePosition, handleSave]);

  const handleAddCheckinNode = useCallback((x?: number, y?: number) => {
    const center = getCanvasCenter();
    const targetX = x !== undefined ? x : center.x;
    const targetY = y !== undefined ? y : center.y;
    const { x: finalX, y: finalY } = findFreePosition(targetX, targetY);
    const newNode: Node = {
      id: `node_checkin_${Date.now()}`,
      type: "checkin",
      x: finalX,
      y: finalY,
      title: "Check-In",
      color: "#EC4899",
      metadata: { description: "Wie geht es dem Klienten?" },
    };
    const updated = [...nodesRef.current, newNode];
    setNodes(updated);
    setSelectedNodeId(newNode.id);
    void handleSave(true, updated);
  }, [getCanvasCenter, findFreePosition, handleSave]);

  const handleAddDocumentNode = useCallback((title: string, url: string, description: string, x?: number, y?: number) => {
    const center = getCanvasCenter();
    const targetX = x !== undefined ? x : center.x;
    const targetY = y !== undefined ? y : center.y;
    const { x: finalX, y: finalY } = findFreePosition(targetX, targetY);
    const newNode: Node = {
      id: `node_document_${Date.now()}`,
      type: "document",
      x: finalX,
      y: finalY,
      title: title || "Dokument",
      color: "#3B82F6",
      metadata: {
        description: description || "",
        url: url || "",
        date: new Date().toLocaleDateString(locale === "en" ? "en-US" : "de-DE", { dateStyle: "short" })
      }
    };
    const updated = [...nodesRef.current, newNode];
    setNodes(updated);
    setSelectedNodeId(newNode.id);
    setShowAddDocumentModal(false);
    void handleSave(true, updated);
  }, [getCanvasCenter, locale, findFreePosition, handleSave]);

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    const nodeToDelete = nodesRef.current.find(n => n.id === nodeId);
    const updatedNodes = nodesRef.current.filter(n => n.id !== nodeId);
    const updatedConnections = connectionsRef.current.filter(c => c.from !== nodeId && c.to !== nodeId);

    setNodes(updatedNodes);
    setConnections(updatedConnections);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);

    void handleSave(true, updatedNodes, updatedConnections);

    if (nodeToDelete?.linkedId) {
      try {
        let collectionName = "";
        if (nodeToDelete.type === "exercise") collectionName = "exercises";
        else if (nodeToDelete.type === "task") collectionName = "client_tasks";
        else if (nodeToDelete.type === "reflection") collectionName = "client_reflections";

        if (collectionName) {
          await deleteDoc(doc(db, collectionName, nodeToDelete.linkedId));
        }
      } catch (err) {
        console.error("Failed to delete linked Firestore document:", err);
      }
    }
  }, [selectedNodeId, handleSave]);

  const handleDeleteConnection = useCallback((connId: string) => {
    const updated = connectionsRef.current.filter(c => c.id !== connId);
    setConnections(updated);
    void handleSave(true, nodesRef.current, updated);
  }, [handleSave]);

  const handleUpdateNode = useCallback((updates: Partial<Node>) => {
    if (!selectedNodeId) return;
    const updated = nodesRef.current.map(n => n.id === selectedNodeId ? { ...n, ...updates } : n);
    setNodes(updated);
    void handleSave(true, updated);
  }, [selectedNodeId, handleSave]);

  const handleUpdateNodeMetadata = useCallback((metaUpdates: any) => {
    if (!selectedNodeId) return;
    const updated = nodesRef.current.map(n => n.id === selectedNodeId ? {
      ...n,
      metadata: {
        ...n.metadata,
        ...metaUpdates
      }
    } : n);
    setNodes(updated);
    void handleSave(true, updated);
  }, [selectedNodeId, handleSave]);

  const handleTitleBlur = useCallback(async (nodeId: string, value: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      if (node.type === "task" && node.linkedId) {
        try {
          await updateDoc(doc(db, "client_tasks", node.linkedId), { title: value });
        } catch (err) {
          console.error("Failed to update task title:", err);
        }
      }
    }
    const updated = nodesRef.current.map(n => n.id === nodeId ? { ...n, title: value } : n);
    setNodes(updated);
    void handleSave(true, updated);
  }, [handleSave]);

  const handleDescriptionBlur = useCallback(async (nodeId: string, value: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      if (node.type === "task" && node.linkedId) {
        try {
          await updateDoc(doc(db, "client_tasks", node.linkedId), { description: value });
        } catch (err) {
          console.error("Failed to update task description:", err);
        }
      }
    }
    const updated = nodesRef.current.map(n => n.id === nodeId ? {
      ...n,
      metadata: {
        ...n.metadata,
        description: value
      }
    } : n);
    setNodes(updated);
    void handleSave(true, updated);
  }, [handleSave]);

  const handleDateBlur = useCallback((nodeId: string, value: string) => {
    const updated = nodesRef.current.map(n => n.id === nodeId ? {
      ...n,
      metadata: {
        ...n.metadata,
        date: value
      }
    } : n);
    setNodes(updated);
    void handleSave(true, updated);
  }, [handleSave]);

  const handleDueDateBlur = useCallback(async (nodeId: string, value: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      if (node.type === "task" && node.linkedId) {
        try {
          await updateDoc(doc(db, "client_tasks", node.linkedId), { dueDate: value });
        } catch (err) {
          console.error("Failed to update task dueDate:", err);
        }
      }
    }
    const updated = nodesRef.current.map(n => n.id === nodeId ? {
      ...n,
      metadata: {
        ...n.metadata,
        dueDate: value
      }
    } : n);
    setNodes(updated);
    void handleSave(true, updated);
  }, [handleSave]);

  const handlePromptBlur = useCallback(async (nodeId: string, value: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      if (node.type === "reflection" && node.linkedId) {
        try {
          await updateDoc(doc(db, "client_reflections", node.linkedId), { prompt: value });
        } catch (err) {
          console.error("Failed to update reflection prompt:", err);
        }
      }
    }
    const updated = nodesRef.current.map(n => n.id === nodeId ? {
      ...n,
      metadata: {
        ...n.metadata,
        prompt: value
      }
    } : n);
    setNodes(updated);
    void handleSave(true, updated);
  }, [handleSave]);

  const handleToggleTask = useCallback(async (nodeId: string, completed: boolean) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node || !node.linkedId) return;

    try {
      setSyncStatus("saving");
      await updateDoc(doc(db, "client_tasks", node.linkedId), {
        completed,
        updatedAt: serverTimestamp(),
      });

      // Update nodes state
      const updatedNodes = nodesRef.current.map(n => n.id === nodeId ? {
        ...n,
        metadata: {
          ...n.metadata,
          completed
        }
      } : n);
      setNodes(updatedNodes);

      // Update local clientTasks state
      setClientTasks(prev => prev.map(t => t.id === node.linkedId ? { ...t, completed } : t));

      // Quiet save visual board to sync completed state
      void handleSave(true, updatedNodes);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Failed to toggle task:", err);
      setSyncStatus("error");
      throw err;
    }
  }, [handleSave]);

  // Inline module overlay loaders and savers
  const handleOpenInlineEditor = useCallback(async (node: Node) => {
    if (!node.linkedId) {
      setToast({
        visible: true,
        message: translate(locale, { de: "Kein verknüpftes Modul", en: "No linked module" }),
        subMessage: translate(locale, { de: "Dieses Element ist nicht mit einem Modul verknüpft.", en: "This element is not linked to any module." }),
        type: "error"
      });
      return;
    }
    setEditingNodeInline(node);
    setLoadingInlineData(true);

    try {
      if (node.type === "exercise") {
        const snap = await getDoc(doc(db, "exercises", node.linkedId));
        if (snap.exists()) {
          setInlineExercise({ id: snap.id, ...snap.data() });
        } else {
          setToast({
            visible: true,
            message: "Fehler",
            subMessage: translate(locale, { de: "Übung nicht gefunden.", en: "Exercise not found." }),
            type: "error"
          });
          setEditingNodeInline(null);
        }
      } else if (node.type === "task") {
        const snap = await getDoc(doc(db, "client_tasks", node.linkedId));
        if (snap.exists()) {
          setInlineTask({ id: snap.id, ...snap.data() });
        } else {
          setToast({
            visible: true,
            message: "Fehler",
            subMessage: translate(locale, { de: "Aufgabe nicht gefunden.", en: "Task not found." }),
            type: "error"
          });
          setEditingNodeInline(null);
        }
      } else if (node.type === "reflection") {
        const snap = await getDoc(doc(db, "client_reflections", node.linkedId));
        if (snap.exists()) {
          setInlineReflection({ id: snap.id, ...snap.data() });
        } else {
          setToast({
            visible: true,
            message: "Fehler",
            subMessage: translate(locale, { de: "Reflexion nicht gefunden.", en: "Reflection not found." }),
            type: "error"
          });
          setEditingNodeInline(null);
        }
      }
    } catch (err) {
      console.error("Failed to load inline module data:", err);
      setToast({
        visible: true,
        message: "Fehler beim Laden",
        subMessage: translate(locale, { de: "Daten konnten nicht geladen werden.", en: "Failed to load module data." }),
        type: "error"
      });
      setEditingNodeInline(null);
    } finally {
      setLoadingInlineData(false);
    }
  }, [locale]);

  const handleSaveInlineExercise = useCallback(async (updatedExercise: any) => {
    if (!updatedExercise || !updatedExercise.id) return;
    setInlineExercise(updatedExercise);
    try {
      setSyncStatus("saving");
      await updateDoc(doc(db, "exercises", updatedExercise.id), {
        title: updatedExercise.title || "Unbenannte Übung",
        blocks: updatedExercise.blocks || [],
        updatedAt: serverTimestamp(),
      });
      const updatedNodes = nodesRef.current.map(n => n.linkedId === updatedExercise.id ? { ...n, title: updatedExercise.title } : n);
      setNodes(updatedNodes);
      void handleSave(false, updatedNodes);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Failed to save inline exercise:", err);
      setSyncStatus("error");
    }
  }, [handleSave]);

  const handleSaveInlineTask = useCallback(async (updatedTask: any) => {
    if (!updatedTask || !updatedTask.id) return;
    setInlineTask(updatedTask);
    try {
      setSyncStatus("saving");
      await updateDoc(doc(db, "client_tasks", updatedTask.id), {
        title: updatedTask.title || "Unbenannte Aufgabe",
        description: updatedTask.description || "",
        dueDate: updatedTask.dueDate || "",
        updatedAt: serverTimestamp(),
      });
      const updatedNodes = nodesRef.current.map(n => n.linkedId === updatedTask.id ? {
        ...n,
        title: updatedTask.title,
        metadata: {
          ...n.metadata,
          description: updatedTask.description || "",
          dueDate: updatedTask.dueDate || "",
        }
      } : n);
      setNodes(updatedNodes);
      void handleSave(false, updatedNodes);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Failed to save inline task:", err);
      setSyncStatus("error");
    }
  }, [handleSave]);

  const handleSaveInlineReflection = useCallback(async (updatedReflection: any) => {
    if (!updatedReflection || !updatedReflection.id) return;
    setInlineReflection(updatedReflection);
    try {
      setSyncStatus("saving");
      await updateDoc(doc(db, "client_reflections", updatedReflection.id), {
        prompt: updatedReflection.prompt || "",
        updatedAt: serverTimestamp(),
      });
      const updatedNodes = nodesRef.current.map(n => n.linkedId === updatedReflection.id ? {
        ...n,
        metadata: {
          ...n.metadata,
          prompt: updatedReflection.prompt || "",
        }
      } : n);
      setNodes(updatedNodes);
      void handleSave(false, updatedNodes);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Failed to save inline reflection:", err);
      setSyncStatus("error");
    }
  }, [handleSave]);

  const handleGenerateTimeline = useCallback(async () => {
    if (!clientId) return;
    setSaving(true);
    setSyncStatus("saving");

    try {
      const events: {
        type: "anamnese" | "appointment" | "note" | "task" | "exercise" | "reflection";
        date: Date;
        title: string;
        item: any;
      }[] = [];

      // Add Anamnesebogen as the root starting event
      events.push({
        type: "anamnese",
        date: new Date(0), // Start of epoch
        title: "Erstgespräch & Anamnese",
        item: { id: "anamnese_root" }
      });

      // Map clientNotes
      clientNotes.forEach((n) => {
        const isSession = n.type === "session" || n.authorRole === "therapist";
        const isJournal = n.type === "journal" || n.authorRole === "client";
        const rawDate = n.sessionDate || n.createdAt;
        let parsedDate = new Date();
        if (rawDate) {
          if (typeof rawDate === "object" && "toDate" in rawDate) {
            parsedDate = rawDate.toDate();
          } else {
            parsedDate = new Date(String(rawDate));
          }
        }
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date();
        }

        if (isSession) {
          events.push({
            type: "appointment",
            date: parsedDate,
            title: n.title || "Therapiesitzung",
            item: n
          });
        } else if (isJournal) {
          events.push({
            type: "note",
            date: parsedDate,
            title: n.title || "Tagebucheintrag",
            item: { ...n, isJournal: true }
          });
        }
      });

      // Map clientTasks
      clientTasks.forEach((t) => {
        const rawDate = t.dueDate || t.createdAt;
        let parsedDate = new Date();
        if (rawDate) {
          if (typeof rawDate === "object" && "toDate" in rawDate) {
            parsedDate = rawDate.toDate();
          } else {
            parsedDate = new Date(String(rawDate));
          }
        }
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date();
        }
        events.push({
          type: "task",
          date: parsedDate,
          title: t.title || "Aufgabe",
          item: t
        });
      });

      // Map clientExercises
      clientExercises.forEach((ex) => {
        const rawDate = ex.createdAt;
        let parsedDate = new Date();
        if (rawDate) {
          if (typeof rawDate === "object" && "toDate" in rawDate) {
            parsedDate = rawDate.toDate();
          } else {
            parsedDate = new Date(String(rawDate));
          }
        }
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date();
        }
        events.push({
          type: "exercise",
          date: parsedDate,
          title: ex.title || "Übung",
          item: ex
        });
      });

      // Map clientReflections
      clientReflections.forEach((r) => {
        const rawDate = r.createdAt;
        let parsedDate = new Date();
        if (rawDate) {
          if (typeof rawDate === "object" && "toDate" in rawDate) {
            parsedDate = rawDate.toDate();
          } else {
            parsedDate = new Date(String(rawDate));
          }
        }
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date();
        }
        events.push({
          type: "reflection",
          date: parsedDate,
          title: "Reflexion",
          item: r
        });
      });

      // Sort events ascending chronologically, with secondary title sort for determinism
      events.sort((a, b) => {
        const diff = a.date.getTime() - b.date.getTime();
        if (diff !== 0) return diff;
        return (a.title || "").localeCompare(b.title || "");
      });

      // Generate Nodes
      const generatedNodes: Node[] = [];
      const generatedConnections: Connection[] = [];

      events.forEach((ev, idx) => {
        // Horizontal spacing and oscillating wave vertical coordinates
        const x = 100 + idx * 180;
        let y = 220;
        if (idx > 0) {
          y = idx % 2 === 1 ? 150 : 290;
        }

        const gridX = Math.round(x / 10) * 10;
        const gridY = Math.round(y / 10) * 10;

        let node: Node;

        if (ev.type === "anamnese") {
          node = {
            id: "anamnese_root",
            type: "anamnese",
            x: gridX,
            y: gridY,
            w: 120,
            h: 120,
            title: ev.title,
            metadata: {
              description: "Erste therapeutische Zielerfassung & Baseline Einschätzung."
            }
          };
        } else if (ev.type === "appointment") {
          node = {
            id: `node_appointment_${ev.item.id}`,
            type: "appointment",
            linkedId: ev.item.id,
            x: gridX,
            y: gridY,
            w: 120,
            h: 120,
            title: ev.title,
            metadata: {
              date: ev.item.sessionDate || "",
              description: ev.item.content || ""
            }
          };
        } else if (ev.type === "note") {
          node = {
            id: `node_note_${ev.item.id}`,
            type: "note",
            linkedId: ev.item.id,
            x: gridX,
            y: gridY,
            w: 120,
            h: 120,
            title: ev.title,
            metadata: {
              date: ev.item.sessionDate || "",
              description: ev.item.content || "",
              isJournal: true
            }
          };
        } else if (ev.type === "task") {
          node = {
            id: `node_task_${ev.item.id}`,
            type: "task",
            linkedId: ev.item.id,
            x: gridX,
            y: gridY,
            w: 120,
            h: 120,
            title: ev.title,
            metadata: {
              description: ev.item.description || "",
              dueDate: ev.item.dueDate || "",
              completed: ev.item.completed || false
            }
          };
        } else if (ev.type === "exercise") {
          node = {
            id: `node_exercise_${ev.item.id}`,
            type: "exercise",
            linkedId: ev.item.id,
            x: gridX,
            y: gridY,
            w: 120,
            h: 120,
            title: ev.title,
            color: ev.item.themeColor || "#6366F1",
            metadata: {
              completed: ev.item.completed || false,
              description: ev.item.description || "Klienten-Übung für den Behandlungsverlauf."
            }
          };
        } else {
          // reflection
          node = {
            id: `node_reflection_${ev.item.id}`,
            type: "reflection",
            linkedId: ev.item.id,
            x: gridX,
            y: gridY,
            w: 120,
            h: 120,
            title: ev.title,
            metadata: {
              prompt: ev.item.prompt || "",
              response: ev.item.response || "",
              completed: ev.item.completed || false
            }
          };
        }

        generatedNodes.push(node);

        // Add Connection to previous node in the timeline
        if (idx > 0) {
          generatedConnections.push({
            id: `conn_timeline_${idx}`,
            from: generatedNodes[idx - 1].id,
            to: node.id
          });
        }
      });

      setNodes(generatedNodes);
      setConnections(generatedConnections);
      await handleSave(true, generatedNodes, generatedConnections);

      setToast({
        visible: true,
        message: "Zeitstrahl erfolgreich generiert!",
        subMessage: `${generatedNodes.length} Kacheln wurden chronologisch verbunden.`,
        type: "success"
      });
    } catch (e) {
      console.error("Failed to generate timeline:", e);
      setToast({
        visible: true,
        message: "Fehler beim Generieren",
        subMessage: "Bitte lade die Seite neu und versuche es erneut.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  }, [clientId, clientNotes, clientTasks, clientExercises, clientReflections, handleSave]);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  return {
    client,
    clients,
    searchQuery,
    setSearchQuery,
    clientExercises,
    templates,
    checkins,
    clientResources,
    baseline,
    setBaseline,
    clientNotes,
    clientTasks,
    clientReflections,
    handleGenerateTimeline,
    loading,

    nodes,
    setNodes,
    connections,
    setConnections,
    panOffset,
    setPanOffset,
    zoom,
    setZoom,
    selectedNodeId,
    setSelectedNodeId,
    selectedNode,

    localTitle,
    setLocalTitle,
    localDescription,
    setLocalDescription,
    localDate,
    setLocalDate,
    localDueDate,
    setLocalDueDate,
    localPrompt,
    setLocalPrompt,

    editingNodeInline,
    setEditingNodeInline,
    inlineExercise,
    setInlineExercise,
    inlineTask,
    setInlineTask,
    inlineReflection,
    setInlineReflection,
    loadingInlineData,

    showAddExerciseModal,
    setShowAddExerciseModal,
    exerciseModalTab,
    setExerciseModalTab,
    selectedTemplateForAssign,
    setSelectedTemplateForAssign,
    assigningExercise,
    showPalette,
    setShowPalette,
    showAddDocumentModal,
    setShowAddDocumentModal,
    documentDropCoords,
    setDocumentDropCoords,
    exerciseDropCoords,
    setExerciseDropCoords,
    handleAddDocumentNode,

    saving,
    syncStatus,
    lastSaved,
    toast,
    setToast,

    handleSave,
    handleSaveBaseline,
    handleAddCustomShape,
    handleAddAnamneseNode,
    handleAddAppointmentNode,
    handleAddExerciseNode,
    handleAssignTemplate,
    handleAddTaskNode,
    handleAddReflectionNode,
    handleAddNoteNode,
    handleAddMilestoneNode,
    handleAddCheckinNode,
    handleDeleteNode,
    handleDeleteConnection,
    handleUpdateNode,
    handleUpdateNodeMetadata,

    handleTitleBlur,
    handleDescriptionBlur,
    handleDateBlur,
    handleDueDateBlur,
    handlePromptBlur,

    handleOpenInlineEditor,
    handleSaveInlineExercise,
    handleSaveInlineTask,
    handleSaveInlineReflection,
    handleToggleTask,
    getCanvasCenter,
  };
}
