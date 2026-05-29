import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import {
  Plus, ArrowDown, CheckCircle2, Calendar, FileText,
  BookOpen, ClipboardCheck, MessageCircle, StickyNote, Flag,
  Link2Off, ZoomIn, ZoomOut, Maximize2, Heart, Settings, X
} from "lucide-react";
import type { Node, Connection } from "./types";

import type { ProcessBaseline } from "./ProcessCompassInsightTiles";

interface ProcessCanvasProps {
  nodes: Node[];
  connections: Connection[];
  panOffset: { x: number; y: number };
  zoom: number;
  selectedNodeId: string | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setSelectedNodeId: (id: string | null) => void;
  selectedNodeIds?: string[];
  setSelectedNodeIds?: React.Dispatch<React.SetStateAction<string[]>>;
  toggleNodeSelection?: (id: string, multi: boolean) => void;
  clearSelection?: () => void;
  onNodeClick?: (node: Node) => void;
  onSave: (silent?: boolean, customNodes?: Node[], customConnections?: Connection[]) => Promise<void>;
  isReadOnly?: boolean;
  client?: any;
  clientExercises?: any[];
  locale: string;
  onOpenInlineEditor?: (node: Node) => void;
  text: {
    completed: string;
    pending: string;
    openInBuilder: string;
  };
  baseline?: ProcessBaseline | null;
  clientNotes?: any[];
  clientTasks?: any[];
  clientReflections?: any[];
  onToggleTaskDirectly?: (nodeId: string, currentCompleted: boolean) => Promise<void>;
}

export default function ProcessCanvas({
  nodes,
  connections,
  panOffset,
  zoom,
  selectedNodeId,
  setNodes,
  setConnections,
  setPanOffset,
  setZoom,
  setSelectedNodeId,
  selectedNodeIds,
  setSelectedNodeIds,
  toggleNodeSelection,
  clearSelection,
  onNodeClick,
  onSave,
  isReadOnly = false,
  client,
  clientExercises = [],
  locale,
  onOpenInlineEditor,
  text,
  baseline = null,
  clientNotes = [],
  clientTasks = [],
  clientReflections = [],
  onToggleTaskDirectly,
}: ProcessCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Canvas filter states
  const [showAppointments, setShowAppointments] = useState(true);
  const [showDiaries, setShowDiaries] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showExercises, setShowExercises] = useState(true);
  const [showReflections, setShowReflections] = useState(true);
  const [showCheckins, setShowCheckins] = useState(true);

  // Filtered nodes and connections before drawing
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      if (node.type === "anamnese") return true; // always show anamnese
      if (node.type === "appointment" && !showAppointments) return false;
      if (node.type === "note" && !showDiaries) return false;
      if (node.type === "task" && !showTasks) return false;
      if (node.type === "exercise" && !showExercises) return false;
      if (node.type === "reflection" && !showReflections) return false;
      if (node.type === "checkin" && !showCheckins) return false;
      return true;
    });
  }, [nodes, showAppointments, showDiaries, showTasks, showExercises, showReflections, showCheckins]);

  const filteredConnections = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return connections.filter(conn => visibleNodeIds.has(conn.from) && visibleNodeIds.has(conn.to));
  }, [connections, filteredNodes]);

  // Dragging and connecting states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [connectingTempCoords, setConnectingTempCoords] = useState<{ x: number; y: number } | null>(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);

  // Resizing state
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const [resizeStartSize, setResizeStartSize] = useState({ w: 0, h: 0 });
  const [resizeStartCoords, setResizeStartCoords] = useState({ x: 0, y: 0 });
  const [resizeDirection, setResizeDirection] = useState<"e" | "s" | "se" | null>(null);

  // Marquee Selection state
  const [selectionRect, setSelectionRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  // Spacebar tracking
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSpacePressedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        if (!isSpacePressedRef.current) {
          isSpacePressedRef.current = true;
          setIsSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Synchronous refs to prevent React state batching race conditions during rapid trackpad/mouse-wheel zooms
  const latestZoomRef = useRef(zoom);
  const latestPanRef = useRef(panOffset);

  useEffect(() => {
    latestZoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    latestPanRef.current = panOffset;
  }, [panOffset]);

  // Track if active mouse wheel zooming is happening to bypass CSS transition lag
  const [isWheelZooming, setIsWheelZooming] = useState(false);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    
    // Non-passive wheel listener to strictly prevent browser scrolling/zooming
    const preventDefaultWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    
    el.addEventListener("wheel", preventDefaultWheel, { passive: false });

    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      el.removeEventListener("wheel", preventDefaultWheel);
    };
  }, []);

  const [showFilters, setShowFilters] = useState(true);

  // Node dimension utilities
  const getNodeDimensions = useCallback((node: Node) => {
    if (node.w && node.h) return { w: node.w, h: node.h };
    if (node.type === "anamnese") return { w: 280, h: 160 };
    if (node.type === "exercise") return { w: 240, h: 140 };
    if (node.type === "task") return { w: 240, h: 140 };
    if (node.type === "reflection") return { w: 240, h: 150 };
    if (node.type === "checkin") return { w: 240, h: 150 };
    if (node.type === "appointment") return { w: 240, h: 140 };
    if (node.type === "note") return { w: 240, h: 140 };
    if (node.type === "milestone") return { w: 240, h: 140 };
    return { w: 160, h: 120 };
  }, []);

  const getNodeCenter = useCallback((node: Node) => {
    const { w, h } = getNodeDimensions(node);
    return {
      x: node.x + w / 2,
      y: node.y + h / 2,
    };
  }, [getNodeDimensions]);

  // Precise bounding box intersection math for neat line anchor points
  const getNodeRadius = useCallback((node: Node, dx: number, dy: number) => {
    const { w, h } = getNodeDimensions(node);
    if (dx === 0 && dy === 0) return 0;
    
    // For circles, the radius is exactly half the width
    if (
      (node.type === "custom_shape" && node.shape === "circle") ||
      node.type === "appointment"
    ) {
      return w / 2 + 6;
    }

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const scaleX = (w / 2) / absDx;
    const scaleY = (h / 2) / absDy;
    const scale = Math.min(scaleX, scaleY);

    return scale * Math.sqrt(dx * dx + dy * dy) + 6; // added padding
  }, [getNodeDimensions]);

  const getNodeColors = useCallback((node: Node) => {
    let baseColor = node.color || "";
    
    if (!baseColor || baseColor === "default") {
      if (node.type === "reflection" || node.type === "checkin" || node.type === "milestone") {
        baseColor = "#F43F5E";
      } else if (node.type === "anamnese" || node.type === "exercise") {
        baseColor = "#8B5CF6";
      } else if (node.type === "appointment") {
        baseColor = "#10B981";
      } else if (node.type === "task") {
        baseColor = "#F59E0B";
      } else if (node.type === "note") {
        baseColor = "#3B82F6";
      } else {
        baseColor = "#9CA3AF";
      }
    }

    const borderColor = node.borderColor || baseColor;

    return {
      accent: baseColor,
      border: borderColor,
    };
  }, []);

  const isNodeIntersecting = useCallback((node: Node, rect: typeof selectionRect) => {
    if (!rect) return false;
    const { w, h } = getNodeDimensions(node);
    const x1 = Math.min(rect.startX, rect.endX);
    const x2 = Math.max(rect.startX, rect.endX);
    const y1 = Math.min(rect.startY, rect.endY);
    const y2 = Math.max(rect.startY, rect.endY);
    
    const nx1 = node.x;
    const nx2 = node.x + w;
    const ny1 = node.y;
    const ny2 = node.y + h;
    
    return !(nx2 < x1 || nx1 > x2 || ny2 < y1 || ny1 > y2);
  }, [getNodeDimensions]);

  const getIconForNodeType = useCallback((type: string, size = 18) => {
    switch (type) {
      case "exercise":
        return <BookOpen size={size} />;
      case "anamnese":
        return <FileText size={size} />;
      case "appointment":
        return <Calendar size={size} />;
      case "task":
        return <ClipboardCheck size={size} />;
      case "reflection":
        return <MessageCircle size={size} />;
      case "note":
        return <StickyNote size={size} />;
      case "milestone":
        return <Flag size={size} />;
      case "checkin":
        return <Heart size={size} />;
      default:
        return null;
    }
  }, []);

  const getSubtitleForNodeType = useCallback((node: Node): string | null => {
    const { type, metadata } = node;
    if (type === "appointment") {
      if (!metadata?.date) return null;
      return metadata.date.replace(/:\d{2}$/, "");
    }
    if (type === "task") {
      if (metadata?.dueDate) {
        return `Bis: ${metadata.dueDate}`;
      }
      return null;
    }
    if (type === "checkin") {
      const moodVal = typeof metadata?.mood === "number" ? metadata.mood : null;
      if (moodVal !== null) {
        return `Stimmung: ${moodVal}/5`;
      }
      return metadata?.date || null;
    }
    if (type === "note") {
      return metadata?.date ? metadata.date.split(",")[0] : null;
    }
    if (type === "milestone") {
      return metadata?.date || "Meilenstein";
    }
    if (type === "reflection") {
      if (metadata?.response) {
        return "Beantwortet";
      }
      return metadata?.date || null;
    }
    if (type === "exercise") {
      return metadata?.completed ? "Erledigt" : "Offen";
    }
    return null;
  }, []);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - panOffset.x) / zoom,
      y: (clientY - rect.top - panOffset.y) / zoom,
    };
  }, [panOffset, zoom]);

  const getCanvasCoordsStable = useCallback((clientX: number, clientY: number, panX: number, panY: number, currentZoom: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - panX) / currentZoom,
      y: (clientY - rect.top - panY) / currentZoom,
    };
  }, []);

  // Keep values in a Ref so window listener is perfectly stable and never needs re-binding
  const stateRef = useRef({
    isPanning,
    panOffset,
    zoom,
    panStart,
    draggedNodeId,
    dragStartOffset,
    resizingNodeId,
    resizeStartSize,
    resizeStartCoords,
    resizeDirection,
    selectionRect,
    connectingFromId,
    isReadOnly,
    nodes,
    selectedNodeIds,
  });

  useEffect(() => {
    stateRef.current = {
      isPanning,
      panOffset,
      zoom,
      panStart,
      draggedNodeId,
      dragStartOffset,
      resizingNodeId,
      resizeStartSize,
      resizeStartCoords,
      resizeDirection,
      selectionRect,
      connectingFromId,
      isReadOnly,
      nodes,
      selectedNodeIds,
    };
  });

  // Canvas Pointer Pan/Zoom Handlers
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const isTouch = e.pointerType === "touch";
    const isMiddleClick = e.button === 1;
    const isRightClick = e.button === 2;
    const isSpace = isSpacePressedRef.current;

    if (isTouch || isMiddleClick || isRightClick || isSpace) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else if (e.button === 0) {
      // Left click on canvas empty space starts marquee select
      if (clearSelection) clearSelection();
      else setSelectedNodeId(null);
      
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setSelectionRect({
        startX: coords.x,
        startY: coords.y,
        endX: coords.x,
        endY: coords.y,
      });
    }
    
    if (onOpenInlineEditor) {
      onOpenInlineEditor(null as any);
    }
  };

  // Stable window event listeners for robust dragging/panning/resizing/connecting
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      const state = stateRef.current;
      if (!state.draggedNodeId && !state.isPanning && !state.resizingNodeId && !state.connectingFromId && !state.selectionRect) {
        return;
      }

      if (state.isPanning) {
        setPanOffset({
          x: e.clientX - state.panStart.x,
          y: e.clientY - state.panStart.y,
        });
      } else if (state.resizingNodeId && !state.isReadOnly) {
        const coords = getCanvasCoordsStable(e.clientX, e.clientY, state.panOffset.x, state.panOffset.y, state.zoom);
        const deltaX = coords.x - state.resizeStartCoords.x;
        const deltaY = coords.y - state.resizeStartCoords.y;
        
        let newW = state.resizeStartSize.w;
        let newH = state.resizeStartSize.h;
        
        if (state.resizeDirection === "e" || state.resizeDirection === "se") {
          newW = state.resizeStartSize.w + deltaX;
          newW = Math.round(newW / 10) * 10;
          newW = Math.max(120, newW);
        }
        
        if (state.resizeDirection === "s" || state.resizeDirection === "se") {
          newH = state.resizeStartSize.h + deltaY;
          newH = Math.round(newH / 10) * 10;
          newH = Math.max(80, newH);
        }
        
        setNodes(prev => prev.map(n => n.id === state.resizingNodeId ? { ...n, w: newW, h: newH } : n));
      } else if (state.selectionRect) {
        const coords = getCanvasCoordsStable(e.clientX, e.clientY, state.panOffset.x, state.panOffset.y, state.zoom);
        setSelectionRect(prev => prev ? {
          ...prev,
          endX: coords.x,
          endY: coords.y,
        } : null);
      } else if (state.draggedNodeId && !state.isReadOnly) {
        const coords = getCanvasCoordsStable(e.clientX, e.clientY, state.panOffset.x, state.panOffset.y, state.zoom);
        const newX = coords.x - state.dragStartOffset.x;
        const newY = coords.y - state.dragStartOffset.y;
        
        setNodes(prev => {
          const draggedNode = prev.find(n => n.id === state.draggedNodeId);
          if (!draggedNode) return prev;
          
          const snappedX = Math.round(newX / 10) * 10;
          const snappedY = Math.round(newY / 10) * 10;
          const dx = snappedX - draggedNode.x;
          const dy = snappedY - draggedNode.y;
          
          if (dx === 0 && dy === 0) return prev;
          
          const isMultiDrag = state.selectedNodeIds && state.selectedNodeIds.includes(state.draggedNodeId);
          return prev.map(n => {
            if (isMultiDrag ? state.selectedNodeIds!.includes(n.id) : n.id === state.draggedNodeId) {
              return { ...n, x: n.x + dx, y: n.y + dy };
            }
            return n;
          });
        });
      } else if (state.connectingFromId && !state.isReadOnly) {
        const coords = getCanvasCoordsStable(e.clientX, e.clientY, state.panOffset.x, state.panOffset.y, state.zoom);
        setConnectingTempCoords(coords);
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      const state = stateRef.current;
      setIsPanning(false);
      
      if (state.selectionRect) {
        const rect = state.selectionRect;
        const x1 = Math.min(rect.startX, rect.endX);
        const x2 = Math.max(rect.startX, rect.endX);
        const y1 = Math.min(rect.startY, rect.endY);
        const y2 = Math.max(rect.startY, rect.endY);

        // Find all intersecting nodes
        const intersectingNodeIds = state.nodes.filter(node => {
          const { w, h } = getNodeDimensions(node);
          const nx1 = node.x;
          const nx2 = node.x + w;
          const ny1 = node.y;
          const ny2 = node.y + h;
          
          return !(nx2 < x1 || nx1 > x2 || ny2 < y1 || ny1 > y2);
        }).map(n => n.id);

        if (setSelectedNodeIds) {
          setSelectedNodeIds(prev => {
            if (e.shiftKey) {
              const next = [...prev];
              intersectingNodeIds.forEach(id => {
                if (!next.includes(id)) next.push(id);
              });
              return next;
            } else {
              return intersectingNodeIds;
            }
          });
          if (intersectingNodeIds.length > 0) {
            setSelectedNodeId(intersectingNodeIds[0]);
          } else {
            setSelectedNodeId(null);
          }
        } else if (toggleNodeSelection) {
          if (e.shiftKey) {
            intersectingNodeIds.forEach(id => {
              if (!state.selectedNodeIds || !state.selectedNodeIds.includes(id)) {
                toggleNodeSelection(id, true);
              }
            });
          } else {
            if (intersectingNodeIds.length > 0) {
              setSelectedNodeId(intersectingNodeIds[0]);
              intersectingNodeIds.slice(1).forEach(id => {
                toggleNodeSelection(id, true);
              });
            } else {
              setSelectedNodeId(null);
            }
          }
        } else {
          if (intersectingNodeIds.length > 0) {
            setSelectedNodeId(intersectingNodeIds[0]);
          } else {
            setSelectedNodeId(null);
          }
        }

        setSelectionRect(null);
      }

      if (!state.isReadOnly && (state.draggedNodeId || state.resizingNodeId)) {
        void onSave(true);
      }
      
      setDraggedNodeId(null);
      setResizingNodeId(null);
      setResizeDirection(null);
      setConnectingFromId(null);
      setConnectingTempCoords(null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: true });
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [onSave, getCanvasCoordsStable]);

  const handleZoom = useCallback((newZoom: number, clientX?: number, clientY?: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      setZoom(newZoom);
      return;
    }

    let focalX = rect.width / 2;
    let focalY = rect.height / 2;

    if (clientX !== undefined && clientY !== undefined) {
      focalX = clientX - rect.left;
      focalY = clientY - rect.top;
    }

    const currentZoom = latestZoomRef.current;
    const currentPan = latestPanRef.current;

    const nextPanX = focalX - (focalX - currentPan.x) * (newZoom / currentZoom);
    const nextPanY = focalY - (focalY - currentPan.y) * (newZoom / currentZoom);

    // Synchronously update the refs so concurrent event ticks read consistent coordinates
    latestZoomRef.current = newZoom;
    latestPanRef.current = { x: nextPanX, y: nextPanY };

    // Batch schedule React state updates
    setPanOffset({ x: nextPanX, y: nextPanY });
    setZoom(newZoom);
  }, [setZoom, setPanOffset]);

  const handleRecenter = () => {
    // Center dynamically on filteredNodes (visible elements) instead of invisible filtered nodes
    if (filteredNodes.length === 0) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    filteredNodes.forEach(node => {
      const { w, h } = getNodeDimensions(node);
      if (node.x < minX) minX = node.x;
      if (node.x + w > maxX) maxX = node.x + w;
      if (node.y < minY) minY = node.y;
      if (node.y + h > maxY) maxY = node.y + h;
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const W = rect.width || 800;
      const H = rect.height || 600;

      // Provide comfortable padding boundary
      const padding = 160;
      const boardW = (maxX - minX) + padding;
      const boardH = (maxY - minY) + padding;

      const optimalZoom = Math.max(0.4, Math.min(1.2, Math.min(W / boardW, H / boardH)));

      latestZoomRef.current = optimalZoom;
      latestPanRef.current = {
        x: W / 2 - centerX * optimalZoom,
        y: H / 2 - centerY * optimalZoom
      };

      setZoom(optimalZoom);
      setPanOffset({
        x: W / 2 - centerX * optimalZoom,
        y: H / 2 - centerY * optimalZoom
      });
    } else {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Auto-recenter on initial load
  const hasAutoCenteredRef = useRef(false);
  useEffect(() => {
    if (filteredNodes.length > 0 && !hasAutoCenteredRef.current) {
      hasAutoCenteredRef.current = true;
      const timer = setTimeout(() => {
        handleRecenter();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [filteredNodes, handleRecenter]);

  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    setIsWheelZooming(true);
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    }
    wheelTimeoutRef.current = setTimeout(() => {
      setIsWheelZooming(false);
    }, 150);

    const currentZoom = latestZoomRef.current;
    // Trackpad pinch or scroll deltaY
    let newZoom = currentZoom * (1 - e.deltaY * 0.005);
    newZoom = Math.max(0.1, Math.min(3.0, newZoom));
    handleZoom(newZoom, e.clientX, e.clientY);
  };

  // Start connecting from edge handle
  const handleStartConnection = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (isReadOnly) return;
    setConnectingFromId(nodeId);

    const fromNode = nodes.find(n => n.id === nodeId);
    if (fromNode) {
      const center = getNodeCenter(fromNode);
      const { h } = getNodeDimensions(fromNode);
      setConnectingTempCoords({
        x: center.x,
        y: fromNode.y + h + 5,
      });
    }
  };

  // Release link draw on top of a target node
  const handleNodePointerUp = (e: React.PointerEvent, targetId: string) => {
    if (isReadOnly) return;
    if (connectingFromId && connectingFromId !== targetId) {
      const exists = connections.some(c => (c.from === connectingFromId && c.to === targetId) || (c.from === targetId && c.to === connectingFromId));
      if (!exists) {
        const newConn = {
          id: `conn_${Date.now()}`,
          from: connectingFromId,
          to: targetId,
        };
        const updated = [...connections, newConn];
        setConnections(updated);
        void onSave(true, undefined, updated);
      }
    }
    setConnectingFromId(null);
    setConnectingTempCoords(null);
  };

  // Start resizing
  const handleStartResize = (e: React.PointerEvent, nodeId: string, dir: "e" | "s" | "se") => {
    e.stopPropagation();
    e.preventDefault();
    if (isReadOnly) return;
    setResizingNodeId(nodeId);
    setResizeDirection(dir);

    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const { w, h } = getNodeDimensions(node);
      setResizeStartSize({ w, h });
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setResizeStartCoords({ x: coords.x, y: coords.y });
    }
  };

  const clickStartCoords = useRef({ x: 0, y: 0 });

  // Drag node start
  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    clickStartCoords.current = { x: e.clientX, y: e.clientY };
    
    if (e.shiftKey && toggleNodeSelection) {
      toggleNodeSelection(nodeId, true);
    } else {
      if (selectedNodeIds && !selectedNodeIds.includes(nodeId)) {
        if (toggleNodeSelection) toggleNodeSelection(nodeId, false);
        else setSelectedNodeId(nodeId);
      } else if (!selectedNodeIds) {
        setSelectedNodeId(nodeId);
      }
    }

    if (isReadOnly) return;
    setDraggedNodeId(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setDragStartOffset({
        x: coords.x - node.x,
        y: coords.y - node.y,
      });
    }
  };

  const handleNodeClick = (e: React.MouseEvent, node: Node) => {
    e.stopPropagation();
    // Only trigger click if mouse didn't move significantly (i.e. it wasn't a drag)
    const dx = Math.abs(e.clientX - clickStartCoords.current.x);
    const dy = Math.abs(e.clientY - clickStartCoords.current.y);
    if (dx < 5 && dy < 5 && onNodeClick) {
      onNodeClick(node);
    }
  };

  // Delete connection
  const handleDeleteConnection = (connId: string) => {
    if (isReadOnly) return;
    const updatedConnections = connections.filter(c => c.id !== connId);
    setConnections(updatedConnections);
    setHoveredConnectionId(null);
    void onSave(true, undefined, updatedConnections);
  };

  const isInteracting = isPanning || draggedNodeId !== null || resizingNodeId !== null || connectingFromId !== null || isWheelZooming;

  return (
    <div
      ref={canvasRef}
      className={`absolute inset-0 overflow-hidden bg-[#F4F1EE] dark:bg-background ${
        isPanning
          ? "cursor-grabbing"
          : isSpacePressed
          ? "cursor-grab"
          : "cursor-default"
      }`}
      onPointerDown={handleCanvasPointerDown}
      onWheel={handleCanvasWheel}
      style={{ touchAction: "none", overscrollBehavior: "none" }}
    >
      {/* Dot Grid Background */}
      <div
        id="dot-grid-bg"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
          backgroundImage: `radial-gradient(circle, rgba(31,58,95,0.18) 1.5px, transparent 1.5px)`,
          opacity: 0.95,
          transition: isInteracting ? "none" : "background-size 450ms cubic-bezier(0.16, 1, 0.3, 1), background-position 450ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* Zoomed & Panned Canvas Content */}
      <div
        className="absolute origin-top-left pointer-events-none"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          width: "100%",
          height: "100%",
          transition: isInteracting ? "none" : "transform 450ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* SVG Connections Layer (underneath nodes) */}
        <svg className="absolute inset-0 overflow-visible pointer-events-none z-0">
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#1A1A1A" />
            </marker>
          </defs>

          {filteredConnections.map((conn) => {
            const fromNode = nodes.find((n) => n.id === conn.from);
            const toNode = nodes.find((n) => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            const C1 = getNodeCenter(fromNode);
            const C2 = getNodeCenter(toNode);

            const dx = C2.x - C1.x;
            const dy = C2.y - C1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist === 0) return null;

            const r1 = getNodeRadius(fromNode, dx, dy);
            const r2 = getNodeRadius(toNode, -dx, -dy);

            if (dist < r1 + r2) return null;

            const x1 = C1.x + (dx / dist) * r1;
            const y1 = C1.y + (dy / dist) * r1;
            const x2 = C2.x - (dx / dist) * r2;
            const y2 = C2.y - (dy / dist) * r2;

            const isHovered = hoveredConnectionId === conn.id;

            return (
              <g key={conn.id}>
                {/* Glowing highlight line */}
                {isHovered && !isReadOnly && (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#8B5CF6"
                    strokeWidth={6}
                    opacity={0.35}
                    strokeLinecap="round"
                  />
                )}
                {/* Visual Line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isHovered && !isReadOnly ? "#8B5CF6" : "#1A1A1A"}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  markerEnd="url(#arrow)"
                  className="transition-colors"
                />
                {/* Hover/Tap detector path */}
                {!isReadOnly && (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth={20}
                    strokeLinecap="round"
                    className="cursor-pointer pointer-events-auto"
                    onMouseEnter={() => setHoveredConnectionId(conn.id)}
                    onMouseLeave={() => setHoveredConnectionId(null)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHoveredConnectionId(prev => prev === conn.id ? null : conn.id);
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* Temporary connection line during drag */}
          {connectingFromId && connectingTempCoords && !isReadOnly && (() => {
            const fromNode = nodes.find((n) => n.id === connectingFromId);
            if (!fromNode) return null;
            const C1 = getNodeCenter(fromNode);
            return (
              <line
                x1={C1.x}
                y1={C1.y}
                x2={connectingTempCoords.x}
                y2={connectingTempCoords.y}
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            );
          })()}
        </svg>

        {/* Interactive connection delete handles */}
        {!isReadOnly && filteredConnections.map((conn) => {
          const fromNode = nodes.find((n) => n.id === conn.from);
          const toNode = nodes.find((n) => n.id === conn.to);
          if (!fromNode || !toNode) return null;

          const C1 = getNodeCenter(fromNode);
          const C2 = getNodeCenter(toNode);
          const midX = (C1.x + C2.x) / 2;
          const midY = (C1.y + C2.y) / 2;

          const isHovered = hoveredConnectionId === conn.id;

          return (
            <div
              key={`del-${conn.id}`}
              style={{
                position: "absolute",
                left: `${midX}px`,
                top: `${midY}px`,
                transform: "translate(-50%, -50%)",
              }}
              className={`pointer-events-auto transition-opacity duration-200 z-10 ${
                isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
              }`}
              onMouseEnter={() => setHoveredConnectionId(conn.id)}
              onMouseLeave={() => setHoveredConnectionId(null)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleDeleteConnection(conn.id)}
                className="p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive-dark shadow-md"
              >
                <Link2Off size={11} />
              </button>
            </div>
          );
        })}

        {/* Nodes Render Layer */}
        {filteredNodes.map((node) => {
          const isSelected = selectedNodeId === node.id || (selectedNodeIds && selectedNodeIds.includes(node.id));
          const isHighlighted = isSelected || isNodeIntersecting(node, selectionRect);
          const { w, h } = getNodeDimensions(node);
          const isCircle = node.type === "appointment" || (node.type === "custom_shape" && node.shape === "circle");
          const roundedClass = isCircle ? "rounded-full" : "rounded-3xl";
          const colors = getNodeColors(node);

          return (
            <div
              key={node.id}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onPointerUp={(e) => handleNodePointerUp(e, node.id)}
              onClick={(e) => handleNodeClick(e, node)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (onOpenInlineEditor && (node.type === "exercise" || node.type === "task" || node.type === "reflection")) {
                  void onOpenInlineEditor(node);
                }
              }}
              className={`absolute pointer-events-auto transition-all duration-300 z-10 group overflow-hidden ${roundedClass} bg-card backdrop-blur-xl ${
                isHighlighted
                  ? "ring-2 ring-offset-2 z-20 scale-[1.02]"
                  : "hover:-translate-y-1 shadow-md"
              }`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${w}px`,
                height: `${h}px`,
                cursor: isReadOnly ? "default" : "grab",
                borderStyle: node.borderStyle === "none" ? "none" : (node.borderStyle || "solid"),
                borderWidth: node.borderStyle === "none" ? "0px" : (node.borderWidth !== undefined ? `${node.borderWidth}px` : "2px"),
                borderColor: node.borderStyle === "none" ? "transparent" : colors.border,
                boxShadow: isHighlighted 
                  ? `0 20px 40px -12px ${colors.accent}60, 0 0 0 2px ${colors.accent}40`
                  : `0 10px 30px -10px ${colors.accent}40, 0 4px 12px rgba(0,0,0,0.08)`,
                touchAction: "none",
                ...(isHighlighted ? { '--tw-ring-color': colors.accent } as any : {})
              }}
            >
              {/* Premium Background Tint */}
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ 
                  backgroundColor: colors.accent,
                  opacity: 0.12
                }} 
              />
              {/* Premium Gradient Overlay */}
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ background: `linear-gradient(135deg, ${colors.accent}40, transparent)` }} 
              />
              
              {/* Edge/Corner Resizing Handles */}
              {!isReadOnly && (
                <>
                  {/* East edge resize handle */}
                  <div
                    onPointerDown={(e) => handleStartResize(e, node.id, "e")}
                    style={{ touchAction: "none" }}
                    className="absolute top-0 right-0 w-1.5 h-full cursor-ew-resize flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Breite anpassen"
                  >
                    <div 
                      className="w-[2px] h-8 rounded-full" 
                      style={{ backgroundColor: colors.accent }} 
                    />
                  </div>

                  {/* South edge resize handle */}
                  <div
                    onPointerDown={(e) => handleStartResize(e, node.id, "s")}
                    style={{ touchAction: "none" }}
                    className="absolute bottom-0 left-0 w-full h-1.5 cursor-ns-resize flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Höhe anpassen"
                  >
                    <div 
                      className="h-[2px] w-8 rounded-full" 
                      style={{ backgroundColor: colors.accent }} 
                    />
                  </div>

                  {/* South-East corner resize handle */}
                  <div
                    onPointerDown={(e) => handleStartResize(e, node.id, "se")}
                    style={{ touchAction: "none" }}
                    className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize flex items-center justify-center z-30 opacity-60 hover:opacity-100 transition-opacity"
                    title="Größe anpassen"
                  >
                    <svg width="8" height="8" viewBox="0 0 10 10" style={{ color: colors.accent }}>
                      <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="8" y1="5" x2="5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="8" y1="8" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </>
              )}
              {/* Connection Point bottom center */}
              {!isReadOnly && (
                <div
                  className={`absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-crosshair transition-opacity shadow-md z-20 ${
                    isHighlighted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                  onPointerDown={(e) => handleStartConnection(e, node.id)}
                  style={{ touchAction: "none" }}
                  title="Verbindungslinie ziehen"
                >
                  <ArrowDown size={12} />
                </div>
              )}

              {/* Uniform Whiteboard Cards Render Layout */}
              {node.type !== "custom_shape" ? (
                node.type === "checkin" ? (
                  <div className="flex flex-col justify-between p-3.5 h-full w-full select-none relative">
                    {/* Top row: Heart Icon & Mood Emoji */}
                    <div className="flex items-center justify-between w-full shrink-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Heart size={14} className="text-pink-500 fill-pink-500 shrink-0" />
                        <span className="text-[8.5px] font-black uppercase tracking-wider opacity-60 text-pink-700 dark:text-pink-400 truncate">
                          Check-In
                        </span>
                      </div>
                      <span className="text-sm leading-none shrink-0" title={`Stimmung: ${node.metadata?.mood || '?'}/5`}>
                        {typeof node.metadata?.mood === "number"
                          ? node.metadata.mood >= 4
                            ? "😊"
                            : node.metadata.mood >= 3
                            ? "😐"
                            : "😔"
                          : "💭"}
                      </span>
                    </div>

                    {/* Center: Title / Note */}
                    <div className="flex-1 flex flex-col justify-center my-1 min-w-0">
                      <h3 
                        className="text-[11px] font-extrabold text-foreground line-clamp-2 leading-snug break-words"
                        style={{ color: colors.accent }}
                      >
                        {node.title}
                      </h3>
                      {node.metadata?.note && (
                        <p 
                          className="text-[9px] italic opacity-85 truncate max-w-full mt-0.5"
                          style={{ color: colors.accent }}
                          title={node.metadata.note}
                        >
                          "{node.metadata.note}"
                        </p>
                      )}
                    </div>

                    {/* Bottom: Progress sliders */}
                    <div className="w-full space-y-1 mt-auto shrink-0">
                      {typeof node.metadata?.mood === "number" && (
                        <div className="flex items-center gap-1">
                          <span className="text-[7.5px] font-black opacity-75 w-5 text-left shrink-0" style={{ color: colors.accent }}>Stimm.</span>
                          <div className="flex-1 h-1 bg-pink-100 dark:bg-pink-950/40 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pink-500 rounded-full"
                              style={{ width: `${(node.metadata.mood / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-[7.5px] font-black opacity-75 shrink-0" style={{ color: colors.accent }}>{node.metadata.mood}/5</span>
                        </div>
                      )}
                      {typeof node.metadata?.energy === "number" && (
                        <div className="flex items-center gap-1">
                          <span className="text-[7.5px] font-black opacity-75 w-5 text-left shrink-0" style={{ color: colors.accent }}>Energ.</span>
                          <span className="text-[7.5px] font-black opacity-75 w-5 text-left shrink-0 text-foreground">Energ.</span>
                          <div className="flex-1 h-1 bg-orange-100 dark:bg-orange-950/40 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${(node.metadata.energy / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-[7.5px] font-black opacity-75 shrink-0 text-foreground">{node.metadata.energy}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-between p-3.5 h-full w-full select-none relative z-10">
                    {/* Top Row: Icon & Type Label & Completed Badge */}
                    <div className="flex items-center justify-between w-full gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="shrink-0" style={{ color: colors.accent }}>
                          {getIconForNodeType(node.type, 14)}
                        </div>
                        <span className="text-[8.5px] font-black uppercase tracking-wider truncate" style={{ color: colors.accent }}>
                          {node.type === "anamnese" ? "Anamnese" :
                           node.type === "exercise" ? "Übung" :
                           node.type === "task" ? "Aufgabe" :
                           node.type === "reflection" ? "Reflexion" :
                           node.type === "appointment" ? "Termin" :
                           node.type === "note" ? "Notiz" :
                           node.type === "milestone" ? "Meilenstein" : node.type}
                        </span>
                      </div>
                      
                      {/* Completed/Pending Status Indicator */}
                      {node.metadata?.completed !== undefined && (
                        <div className={`text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none shrink-0 ${
                          node.metadata.completed
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                        }`}>
                          {node.metadata.completed ? "Erledigt" : "Offen"}
                        </div>
                      )}
                    </div>

                    {/* Middle: Title & Description / Prompt */}
                    <div className="flex-1 flex flex-col justify-center min-w-0 my-1">
                      <h3 
                        className="text-[11px] font-extrabold line-clamp-2 leading-snug break-words text-foreground"
                      >
                        {node.title}
                      </h3>
                      {node.metadata?.description && (
                        <p className="text-[9px] text-muted-foreground leading-tight line-clamp-2 mt-0.5 break-words">
                          {node.metadata.description}
                        </p>
                      )}
                      {node.type === "reflection" && node.metadata?.prompt && (
                        <p 
                          className="text-[9px] line-clamp-2 leading-normal mt-0.5 italic font-medium opacity-80"
                          style={{ color: colors.accent }}
                        >
                          "{node.metadata.prompt}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Row: Date / Details */}
                    {(() => {
                      const subtitle = getSubtitleForNodeType(node);
                      if (!subtitle && !node.metadata?.date && !node.metadata?.dueDate) return <div className="h-1.5 shrink-0" />; // spacer
                      const displayDate = subtitle || node.metadata?.date || node.metadata?.dueDate;
                      return (
                        <div 
                          className="mt-auto pt-1 border-t border-border flex justify-between items-center text-[8px] font-bold shrink-0 leading-none"
                          style={{ color: colors.accent }}
                        >
                          <span>{displayDate}</span>
                        </div>
                      );
                    })()}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center text-center p-3 h-full w-full select-none">
                  <span className="text-[11px] font-black text-foreground break-all line-clamp-3 leading-tight">
                    {node.title}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Marquee Selection Rectangle */}
        {selectionRect && (
          <div
            className="absolute border border-[#8B5CF6]/50 bg-[#8B5CF6]/8 rounded-md z-30 pointer-events-none"
            style={{
              left: `${Math.min(selectionRect.startX, selectionRect.endX)}px`,
              top: `${Math.min(selectionRect.startY, selectionRect.endY)}px`,
              width: `${Math.abs(selectionRect.endX - selectionRect.startX)}px`,
              height: `${Math.abs(selectionRect.endY - selectionRect.startY)}px`,
              boxShadow: "0 0 12px rgba(139, 92, 246, 0.15)",
            }}
          />
        )}

         {/* Floating Canvas Filters (Bottom Left) */}
      <motion.div 
        drag
        dragMomentum={false}
        className="absolute bottom-6 left-6 flex flex-wrap gap-2 z-20 pointer-events-auto select-none cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {!showFilters ? (
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center justify-center bg-card/85 backdrop-blur-xl border border-border/80 p-3 rounded-2xl shadow-xl hover:bg-secondary transition-colors text-foreground"
            title="Filter anzeigen"
          >
            <Settings size={18} />
          </button>
        ) : (
          <div className="flex bg-card/85 backdrop-blur-xl border border-border/80 p-1.5 rounded-2xl shadow-xl gap-1 items-center">
            <button
              onClick={() => setShowFilters(false)}
              className="p-1.5 mr-1 text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
              title="Filter ausblenden"
            >
              <X size={14} />
            </button>
            <button
            onClick={() => {
              setShowAppointments(true);
              setShowDiaries(true);
              setShowTasks(true);
              setShowExercises(true);
              setShowReflections(true);
              setShowCheckins(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all ${
              showAppointments && showDiaries && showTasks && showExercises && showReflections && showCheckins
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Alle
          </button>
          
          <button
            onClick={() => setShowAppointments(!showAppointments)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase flex items-center gap-1.5 transition-all ${
              showAppointments
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                : "text-muted-foreground hover:bg-secondary opacity-60"
            }`}
          >
            <Calendar size={10} />
            Termine
          </button>

          <button
            onClick={() => setShowDiaries(!showDiaries)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase flex items-center gap-1.5 transition-all ${
              showDiaries
                ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20"
                : "text-muted-foreground hover:bg-secondary opacity-60"
            }`}
          >
            <StickyNote size={10} />
            Tagebuch
          </button>

          <button
            onClick={() => setShowTasks(!showTasks)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase flex items-center gap-1.5 transition-all ${
              showTasks
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                : "text-muted-foreground hover:bg-secondary opacity-60"
            }`}
          >
            <ClipboardCheck size={10} />
            Aufgaben
          </button>

          <button
            onClick={() => setShowExercises(!showExercises)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase flex items-center gap-1.5 transition-all ${
              showExercises
                ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20"
                : "text-muted-foreground hover:bg-secondary opacity-60"
            }`}
          >
            <BookOpen size={10} />
            Übungen
          </button>

          <button
            onClick={() => setShowReflections(!showReflections)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase flex items-center gap-1.5 transition-all ${
              showReflections
                ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20"
                : "text-muted-foreground hover:bg-secondary opacity-60"
            }`}
          >
            <MessageCircle size={10} />
            Reflexionen
          </button>

          <button
            onClick={() => setShowCheckins(!showCheckins)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase flex items-center gap-1.5 transition-all ${
              showCheckins
                ? "bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-500/20"
                : "text-muted-foreground hover:bg-secondary opacity-60"
            }`}
          >
            <Heart size={10} />
            Check-Ins
          </button>
        </div>
        )}
      </motion.div>
      </div>

      {/* Floating Canvas Controls (Zoom In, Zoom Out, Maximize) */}
      <div 
        className="absolute bottom-6 right-6 flex flex-col gap-2 z-20 pointer-events-auto"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
          <button
            onClick={() => handleZoom(Math.min(2.0, zoom + 0.1))}
            className="p-3 text-foreground hover:bg-secondary border-b border-border flex items-center justify-center transition-colors"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => handleZoom(Math.max(0.3, zoom - 0.1))}
            className="p-3 text-foreground hover:bg-secondary border-b border-border flex items-center justify-center transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={handleRecenter}
            className="p-3 text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
            title="Ansicht zentrieren"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
