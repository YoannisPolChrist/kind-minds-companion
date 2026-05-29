import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import {
  Plus, CheckCircle2, Calendar, FileText,
  BookOpen, ClipboardCheck, MessageCircle, StickyNote, Flag,
  Link2Off, ZoomIn, ZoomOut, Maximize2, Heart
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
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
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
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  // Node dimension utilities
  const getNodeDimensions = useCallback((node: Node) => {
    if (node.type !== "custom_shape") {
      return { w: 120, h: 120 };
    }
    if (node.w && node.h) return { w: node.w, h: node.h };
    return { w: 120, h: 120 };
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

  const getPastelColor = useCallback((color: string | undefined, type: string) => {
    let baseColor = color || "";
    if (!baseColor) {
      if (type === "reflection" || type === "checkin" || type === "milestone") {
        baseColor = "#F43F5E";
      } else if (type === "anamnese" || type === "exercise") {
        baseColor = "#8B5CF6";
      } else if (type === "appointment") {
        baseColor = "#10B981";
      } else if (type === "task") {
        baseColor = "#F59E0B";
      } else if (type === "note") {
        baseColor = "#3B82F6";
      } else {
        baseColor = "#9CA3AF";
      }
    }

    const c = baseColor.toUpperCase();
    const isPink = c === "#F43F5E" || c === "#EC4899" || type === "reflection" || type === "checkin" || type === "milestone";

    let bg = "#F9FAFB";
    let border = "#D1D5DB";
    let text = "#1A1A1A";

    if (isPink) {
      bg = "#FFE4E6"; // pastel pink/rose
      border = "#1A1A1A"; // heavy black
      text = "#1A1A1A";
    } else if (c === "#8B5CF6" || c === "#A78BFA" || type === "anamnese" || type === "exercise") {
      bg = "#F3E8FF"; // pastel purple
      border = "#C084FC";
      text = "#5B21B6";
    } else if (c === "#10B981" || c === "#34D399" || type === "appointment") {
      bg = "#D1FAE5"; // pastel green
      border = "#34D399";
      text = "#065F46";
    } else if (c === "#F59E0B" || c === "#FBBF24" || type === "task") {
      bg = "#FEF3C7"; // pastel yellow/amber
      border = "#FCD34D";
      text = "#78350F";
    } else if (c === "#3B82F6" || c === "#60A5FA" || type === "note") {
      bg = "#EFF6FF"; // pastel blue
      border = "#93C5FD";
      text = "#1E40AF";
    } else {
      if (c.startsWith("#") && c.length === 7) {
        bg = c + "1A";
        border = c;
        text = c;
      }
    }

    return {
      bg,
      border,
      text,
      isHeavyBorder: isPink
    };
  }, []);

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

  // Canvas Pointer Pan/Zoom Handlers
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).id === "dot-grid-bg") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      setSelectedNodeId(null);
      setHoveredConnectionId(null); // Clear connection state on empty background tap
      
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (resizingNodeId && !isReadOnly) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const deltaX = coords.x - resizeStartCoords.x;
      const deltaY = coords.y - resizeStartCoords.y;
      
      let newW = resizeStartSize.w + deltaX;
      let newH = resizeStartSize.h + deltaY;
      
      newW = Math.round(newW / 10) * 10;
      newH = Math.round(newH / 10) * 10;
      
      newW = Math.max(120, newW);
      newH = Math.max(80, newH);
      
      setNodes(prev => prev.map(n => n.id === resizingNodeId ? { ...n, w: newW, h: newH } : n));
    } else if (draggedNodeId && !isReadOnly) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const newX = coords.x - dragStartOffset.x;
      const newY = coords.y - dragStartOffset.y;
      setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x: Math.round(newX / 10) * 10, y: Math.round(newY / 10) * 10 } : n)); // 10px grid snap
    } else if (connectingFromId && connectingTempCoords && !isReadOnly) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setConnectingTempCoords(coords);
    }
  };

  const handleCanvasPointerUp = (e?: React.PointerEvent) => {
    setIsPanning(false);
    if (!isReadOnly && (draggedNodeId || resizingNodeId)) {
      void onSave(true);
    }
    
    // Safety release for browser-specific stuck pointer captures
    if (e && e.currentTarget) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }
    
    setDraggedNodeId(null);
    setResizingNodeId(null);
    setConnectingFromId(null);
    setConnectingTempCoords(null);
  };

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

  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // Set isWheelZooming state and clear previous timeout to bypass transitional lagging
    setIsWheelZooming(true);
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    }
    wheelTimeoutRef.current = setTimeout(() => {
      setIsWheelZooming(false);
    }, 150);

    const zoomFactor = 0.05;
    const currentZoom = latestZoomRef.current;
    let newZoom = currentZoom - e.deltaY * zoomFactor * 0.01;
    newZoom = Math.max(0.3, Math.min(2.0, newZoom));
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
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
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
  const handleStartResize = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (isReadOnly) return;
    setResizingNodeId(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const { w, h } = getNodeDimensions(node);
      setResizeStartSize({ w, h });
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setResizeStartCoords({ x: coords.x, y: coords.y });
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }
  };

  // Drag node start
  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    if (isReadOnly) return;
    setDraggedNodeId(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setDragStartOffset({
        x: coords.x - node.x,
        y: coords.y - node.y,
      });
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
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
      className="flex-1 h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-[#F4F1EE] dark:bg-background"
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerUp}
      onWheel={handleCanvasWheel}
      style={{ touchAction: "none" }}
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
          const isSelected = selectedNodeId === node.id;
          const { w, h } = getNodeDimensions(node);
          const isCircle = node.type === "appointment" || (node.type === "custom_shape" && node.shape === "circle");
          const roundedClass = isCircle ? "rounded-full" : "rounded-3xl";
          const colors = getPastelColor(node.color, node.type);

          return (
            <div
              key={node.id}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onPointerUp={(e) => handleNodePointerUp(e, node.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (onOpenInlineEditor && (node.type === "exercise" || node.type === "task" || node.type === "reflection")) {
                  void onOpenInlineEditor(node);
                }
              }}
              className={`absolute pointer-events-auto transition-[background-color,border-color,box-shadow,ring] duration-200 z-10 group ${roundedClass} ${
                isSelected
                  ? "ring-4 ring-[#8B5CF6]/50 shadow-xl shadow-[#1F3A5F]/10"
                  : "shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
              }`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${w}px`,
                height: `${h}px`,
                cursor: isReadOnly ? "default" : "grab",
                borderStyle: "solid",
                borderWidth: colors.isHeavyBorder ? "3px" : "1.5px",
                borderColor: colors.border,
                backgroundColor: colors.bg,
                touchAction: "none",
              }}
            >
              {/* Resize Handle */}
              {isSelected && !isReadOnly && node.type === "custom_shape" && (
                <div
                  onPointerDown={(e) => handleStartResize(e, node.id)}
                  style={{ touchAction: "none" }}
                  className="absolute bottom-2 right-2 w-3.5 h-3.5 cursor-se-resize flex items-center justify-center z-30 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground hover:text-primary">
                    <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="8" y1="5" x2="5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="8" y1="8" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
              {/* Connection Point bottom center */}
              {!isReadOnly && (
                <div
                  className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-20"
                  onPointerDown={(e) => handleStartConnection(e, node.id)}
                  style={{ touchAction: "none" }}
                >
                  <Plus size={12} />
                </div>
              )}

              {/* Uniform Whiteboard Cards Render Layout */}
              {node.type !== "custom_shape" ? (
                node.type === "checkin" ? (
                  <div className="flex flex-col justify-between p-2.5 h-full w-full select-none relative">
                    {/* Top row: Heart Icon & Mood Emoji */}
                    <div className="flex items-center justify-between w-full shrink-0">
                      <Heart size={14} className="text-pink-500 fill-pink-500 shrink-0" />
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
                    <div className="flex-1 flex flex-col justify-center items-center my-0.5 min-w-0 text-center">
                      <h3 
                        className="text-[9px] font-black text-foreground line-clamp-2 leading-snug break-words"
                        style={{ color: colors.text }}
                      >
                        {node.title}
                      </h3>
                      {node.metadata?.note && (
                        <p 
                          className="text-[7.5px] italic opacity-85 truncate max-w-full mt-0.5 px-0.5"
                          style={{ color: colors.text }}
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
                          <span className="text-[7px] font-black opacity-75 w-4 text-left shrink-0" style={{ color: colors.text }}>Sti</span>
                          <div className="flex-1 h-1 bg-pink-100 dark:bg-pink-950/40 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pink-500 rounded-full"
                              style={{ width: `${(node.metadata.mood / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-[7px] font-black opacity-75 shrink-0" style={{ color: colors.text }}>{node.metadata.mood}</span>
                        </div>
                      )}
                      {typeof node.metadata?.energy === "number" && (
                        <div className="flex items-center gap-1">
                          <span className="text-[7px] font-black opacity-75 w-4 text-left shrink-0" style={{ color: colors.text }}>Ene</span>
                          <div className="flex-1 h-1 bg-orange-100 dark:bg-orange-950/40 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${(node.metadata.energy / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-[7px] font-black opacity-75 shrink-0" style={{ color: colors.text }}>{node.metadata.energy}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-between p-3 text-center h-full w-full select-none relative">
                    {/* Completed Badge */}
                    {!!node.metadata?.completed && (
                      <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5 border border-white z-20 shadow-sm">
                        <CheckCircle2 size={10} className="stroke-[3]" />
                      </div>
                    )}
                    {/* Icon */}
                    <div className="mt-1" style={{ color: colors.text }}>
                      {getIconForNodeType(node.type)}
                    </div>
                    {/* Title */}
                    <div className="flex-1 flex items-center justify-center my-1 px-1">
                      <h3 
                        className="text-[10px] font-black line-clamp-3 leading-snug break-words"
                        style={{ color: colors.text }}
                      >
                        {node.title}
                      </h3>
                    </div>
                    {/* Subtitle */}
                    {(() => {
                      const subtitle = getSubtitleForNodeType(node);
                      if (!subtitle) return <div className="h-2" />; // spacer
                      return (
                        <span className="text-[8px] font-bold opacity-75 truncate max-w-full" style={{ color: colors.text }}>
                          {subtitle}
                        </span>
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
      </div>

      {/* Floating Canvas Filters (Bottom Left) */}
      <div className="absolute bottom-6 left-6 flex flex-wrap gap-2 z-20 pointer-events-auto select-none">
        <div className="flex bg-card/85 backdrop-blur-xl border border-border/80 p-1.5 rounded-2xl shadow-xl gap-1">
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
      </div>

      {/* Floating Canvas Controls (Zoom In, Zoom Out, Maximize) */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20 pointer-events-auto">
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
