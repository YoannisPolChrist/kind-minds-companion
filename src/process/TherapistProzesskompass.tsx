import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { translate } from "../lib/webLocale";
import { PageTransition, HeaderOrbs } from "../components/motion";
import { BannerToast } from "../components/ui/Toast";

import { useProcessData } from "./useProcessData";
import ProcessCanvas from "./ProcessCanvas";
import ProcessPalette from "./ProcessPalette";
import ProcessInspector from "./ProcessInspector";
import ProcessInlineEditor from "./ProcessInlineEditor";
import NodeContentModal from "./NodeContentModal";
import { ProcessBaselinePanel } from "./ProcessBaselinePanel";
import { ProcessCompassInsightTiles } from "./ProcessCompassInsightTiles";

import {
  ArrowLeft,
  Save,
  Loader2,
  Check,
  X,
  Search,
  Users,
  ArrowRight,
  Plus,
  Calendar,
  Activity
} from "lucide-react";

let whiteboardClipboard: any[] = [];

export default function TherapistProzesskompass() {
  const { id: clientId } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [showInsights, setShowInsights] = useState(false);
  const [contentModalNode, setContentModalNode] = useState<any>(null);
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const confirmDeleteSelectedNodes = () => {
    if (selectedNodeIds.length > 0) {
      setShowDeleteConfirm(true);
    }
  };

  const {
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
    handleToggleTask,
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
    selectedNodeIds,
    setSelectedNodeIds,
    toggleNodeSelection,
    clearSelection,
    setSelectedNodeId,
    selectedNode,
    handleDeleteSelectedNodes,

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
    handleTriggerEmailNotification,

    handleTitleBlur,
    handleDescriptionBlur,
    handleDateBlur,
    handleDueDateBlur,
    handlePromptBlur,

    handleOpenInlineEditor,
    handleSaveInlineExercise,
    handleSaveInlineTask,
    handleSaveInlineReflection,
  } = useProcessData(clientId, profile?.id, canvasRef);

  // Keyboard listener to delete selected node on Backspace or Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in inputs/textareas/selects
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        confirmDeleteSelectedNodes();
      }

      // Copy (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedNodeIds && selectedNodeIds.length > 0) {
          const nodesToCopy = nodes.filter(n => selectedNodeIds.includes(n.id));
          if (nodesToCopy.length > 0) {
            whiteboardClipboard = JSON.parse(JSON.stringify(nodesToCopy));
            setToast({ visible: true, message: `${nodesToCopy.length} Element(e) kopiert`, type: "success" });
          }
        } else if (selectedNodeId) {
          const nodeToCopy = nodes.find(n => n.id === selectedNodeId);
          if (nodeToCopy) {
            whiteboardClipboard = [JSON.parse(JSON.stringify(nodeToCopy))];
            setToast({ visible: true, message: "Element kopiert", type: "success" });
          }
        }
      }

      // Paste (Ctrl+V / Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (whiteboardClipboard.length > 0) {
          const newNodes = whiteboardClipboard.map(copiedNode => ({
            ...copiedNode,
            id: `node_${copiedNode.type}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
            x: copiedNode.x + 40,
            y: copiedNode.y + 40
          }));
          
          const updated = [...nodes, ...newNodes];
          setNodes(updated);
          
          // Select newly pasted nodes
          if (newNodes.length === 1) {
            setSelectedNodeId(newNodes[0].id);
            
          } else {
            
            setSelectedNodeId(null);
          }
          
          setToast({ visible: true, message: "Eingefügt", type: "success" });
          
          // update clipboard to the newly pasted ones, so repeated pasting moves them again
          whiteboardClipboard = JSON.parse(JSON.stringify(newNodes));
          void handleSave(true, updated);
        }
      }
      
      // Duplicate (Ctrl+D / Cmd+D)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        
        let nodesToCopy: any[] = [];
        if (selectedNodeIds && selectedNodeIds.length > 0) {
          nodesToCopy = nodes.filter(n => selectedNodeIds.includes(n.id));
        } else if (selectedNodeId) {
          const node = nodes.find(n => n.id === selectedNodeId);
          if (node) nodesToCopy = [node];
        }
        
        if (nodesToCopy.length > 0) {
          const newNodes = nodesToCopy.map(n => ({
            ...n,
            id: `node_${n.type}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
            x: n.x + 40,
            y: n.y + 40
          }));
          
          const updated = [...nodes, ...newNodes];
          setNodes(updated);
          
          if (newNodes.length === 1) {
            setSelectedNodeId(newNodes[0].id);
            
          } else {
            
            setSelectedNodeId(null);
          }
          
          setToast({ visible: true, message: "Dupliziert", type: "success" });
          void handleSave(true, updated);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedNodeId, selectedNodeIds, nodes, handleDeleteSelectedNodes, handleSave]);

  const selectedNodeTitles = useMemo(() => {
    return nodes.filter(n => selectedNodeIds.includes(n.id)).map(n => n.title || "Unbenannte Kachel");
  }, [nodes, selectedNodeIds]);

  const text = useMemo(() => ({
    title: translate(locale, { de: "Prozesskompass", en: "Process Compass" }),
    subtitle: translate(locale, { de: "Visualisiere und verknüpfe den therapeutischen Verlauf dieses Klienten.", en: "Visualize and map out the therapeutic journey of this client." }),
    back: translate(locale, { de: "Zurück", en: "Back" }),
    save: translate(locale, { de: "Speichern", en: "Save" }),
    saving: translate(locale, { de: "Speichert...", en: "Saving..." }),
    saved: translate(locale, { de: "Board gespeichert!", en: "Board saved!" }),
    saveError: translate(locale, { de: "Fehler beim Speichern", en: "Error saving board" }),
    addNode: translate(locale, { de: "Kachel hinzufügen", en: "Add Tile" }),
    exercise: translate(locale, { de: "Übung", en: "Exercise" }),
    anamnese: translate(locale, { de: "Anamnese", en: "Anamnesis" }),
    appointment: translate(locale, { de: "Termin", en: "Appointment" }),
    customShape: translate(locale, { de: "Form", en: "Shape" }),
    circle: translate(locale, { de: "Kreis", en: "Circle" }),
    square: translate(locale, { de: "Quadrat", en: "Square" }),
    emptyState: translate(locale, { de: "Platziere deine erste Kachel, um den Prozess zu starten.", en: "Place your first tile to start the process mapping." }),
    deleteNode: translate(locale, { de: "Kachel löschen", en: "Delete Tile" }),
    inspector: translate(locale, { de: "Kachel Details", en: "Tile Details" }),
    titleLabel: translate(locale, { de: "Titel / Text", en: "Title / Text" }),
    descLabel: translate(locale, { de: "Beschreibung", en: "Description" }),
    colorLabel: translate(locale, { de: "Farbe", en: "Color" }),
    assignNew: translate(locale, { de: "Übung zuweisen & hinzufügen", en: "Assign & Add Exercise" }),
    selectExisting: translate(locale, { de: "Bestehende Übung hinzufügen", en: "Add Existing Exercise" }),
    assignTab: translate(locale, { de: "Vorlage zuweisen", en: "Assign Template" }),
    existingTab: translate(locale, { de: "Bereits zugewiesen", en: "Already Assigned" }),
    searchPlaceholder: translate(locale, { de: "Vorlage auswählen...", en: "Select template..." }),
    completed: translate(locale, { de: "Erledigt", en: "Completed" }),
    pending: translate(locale, { de: "Offen", en: "Pending" }),
    openInBuilder: translate(locale, { de: "Im Editor öffnen", en: "Open in Editor" }),
  }), [locale]);

  // Handle client selection grid
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!clientId) {
    const filteredClients = clients.filter(c => {
      const q = searchQuery.toLowerCase();
      return (
        (c.firstName || "").toLowerCase().includes(q) ||
        (c.lastName || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
      );
    });

    return (
      <PageTransition className="min-h-screen bg-background relative flex flex-col overflow-y-auto">
        <HeaderOrbs />
        <div className="bg-background/80 backdrop-blur-md border-b border-border py-4 px-6 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/therapist")}
              className="p-2.5 rounded-xl bg-secondary text-foreground hover:bg-muted"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-black text-foreground">{text.title}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Wähle einen Klienten aus, um das Board anzuzeigen.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 space-y-6 z-10">
          {/* Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Klienten suchen..."
              className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-4 text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Client Grid */}
          {filteredClients.length === 0 ? (
            <div className="bg-card rounded-3xl border border-border p-12 text-center shadow-sm">
              <Users size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="font-bold text-foreground mb-1">Keine Klienten gefunden</p>
              <p className="text-xs text-muted-foreground">Füge Klienten in deinem Therapeuten-Bereich hinzu.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
              {filteredClients.map((c) => {
                const initials = `${c.firstName?.charAt(0) || ""}${c.lastName?.charAt(0) || ""}`.toUpperCase();
                return (
                  <motion.div
                    key={c.id}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="bg-card border border-border rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-primary/20 transition-all min-h-[12rem] cursor-pointer"
                    onClick={() => navigate(`/therapist/client/${c.id}/prozesskompass`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-black text-base">
                        {initials || "K"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black tracking-tight text-foreground">
                          {c.firstName} {c.lastName}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">{c.email}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-border">
                      <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Board öffnen</span>
                      <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </PageTransition>
    );
  }

  const clientName = `${client?.firstName || ""} ${client?.lastName || ""}`.trim() || "Klient";

  return (
    <PageTransition className="h-screen bg-[#F4F1EE] dark:bg-background relative flex flex-col overflow-hidden select-none">
      {/* Header Panel */}
      <div className="bg-[#FFFDF9]/90 dark:bg-background/80 backdrop-blur-md border-b border-[#DED6C9] dark:border-border py-4 px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => navigate(`/therapist/client/${clientId}`)}
            className="p-2.5 rounded-xl bg-secondary text-foreground hover:bg-muted"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={18} />
          </motion.button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground">{text.title}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{clientName}</span>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block mt-0.5">{text.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Sync status indicators */}
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {syncStatus === "saving" && (
              <>
                <Loader2 size={13} className="animate-spin text-primary" />
                <span>{text.saving}</span>
              </>
            )}
            {syncStatus === "synced" && (
              <>
                <Check size={13} className="text-success" />
                <span>
                  Saved {lastSaved && `at ${lastSaved}`}
                </span>
              </>
            )}
            {syncStatus === "error" && (
              <>
                <X size={13} className="text-destructive" />
                <span className="text-destructive">Error</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <NodeContentModal
        node={contentModalNode}
        onClose={() => setContentModalNode(null)}
        clientId={clientId}
        onUpdateNode={handleUpdateNode}
        baseline={baseline}
        onUpdateBaseline={handleSaveBaseline}
        isReadOnly={false}
      />

      {/* Canvas workspace workspace */}
      <div className="flex-1 flex min-h-0 relative">
        <ProcessPalette
          showPalette={showPalette}
          setShowPalette={setShowPalette}
          setExerciseModalTab={setExerciseModalTab}
          setShowAddExerciseModal={setShowAddExerciseModal}
          handleAddTaskNode={handleAddTaskNode}
          handleAddReflectionNode={handleAddReflectionNode}
          handleAddAppointmentNode={handleAddAppointmentNode}
          handleAddAnamneseNode={handleAddAnamneseNode}
          handleAddNoteNode={handleAddNoteNode}
          handleAddMilestoneNode={handleAddMilestoneNode}
          handleAddCustomShape={handleAddCustomShape}
          handleAddCheckinNode={handleAddCheckinNode}
          onGenerateTimeline={handleGenerateTimeline}
        />

        <div ref={canvasRef} className="flex-1 h-full relative overflow-hidden bg-[#F4F1EE] dark:bg-background flex flex-col">
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
            setNodes={setNodes}
            setConnections={setConnections}
            setPanOffset={setPanOffset}
            setZoom={setZoom}
            setSelectedNodeId={setSelectedNodeId}
            onSave={handleSave}
            onNodeClick={(node) => setContentModalNode(node)}
            client={client}
            clientExercises={clientExercises}
            locale={locale}
            onOpenInlineEditor={handleOpenInlineEditor}
            text={text}
            baseline={baseline}
            clientNotes={clientNotes}
            clientTasks={clientTasks}
            clientReflections={clientReflections}
            onToggleTaskDirectly={handleToggleTask}
          />
        </div>

        {selectedNode && (
          <ProcessInspector
            selectedNode={selectedNode}
            selectedNodeIds={selectedNodeIds}
            onUpdate={handleUpdateNode}
            onUpdateMetadata={handleUpdateNodeMetadata}
            onDelete={confirmDeleteSelectedNodes}
            onTriggerEmailNotification={handleTriggerEmailNotification}
            onSave={handleSave}
            locale={locale}
            localTitle={localTitle}
            setLocalTitle={setLocalTitle}
            localDescription={localDescription}
            setLocalDescription={setLocalDescription}
            localDate={localDate}
            setLocalDate={setLocalDate}
            localDueDate={localDueDate}
            setLocalDueDate={setLocalDueDate}
            localPrompt={localPrompt}
            setLocalPrompt={setLocalPrompt}
            handleTitleBlur={handleTitleBlur}
            handleDescriptionBlur={handleDescriptionBlur}
            handleDateBlur={handleDateBlur}
            handleDueDateBlur={handleDueDateBlur}
            handlePromptBlur={handlePromptBlur}
            nodes={nodes}
            handleOpenInlineEditor={handleOpenInlineEditor}
            text={{
              inspector: text.inspector,
              titleLabel: text.titleLabel,
              descLabel: text.descLabel,
              colorLabel: text.colorLabel,
              deleteNode: text.deleteNode,
            }}
          />
        )}
      </div>

      {/* Assign exercise overlay modal */}
      <AnimatePresence>
        {showAddExerciseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl p-6 relative"
            >
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                <h3 className="font-black text-base text-foreground">Übung hinzufügen</h3>
                <button
                  onClick={() => setShowAddExerciseModal(false)}
                  className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setExerciseModalTab("assign")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    exerciseModalTab === "assign"
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-secondary border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {text.assignTab}
                </button>
                <button
                  onClick={() => setExerciseModalTab("existing")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    exerciseModalTab === "existing"
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-secondary border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {text.existingTab}
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {exerciseModalTab === "assign" ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      Wähle eine deiner Vorlagen aus, um sie dem Klienten neu zuzuweisen. Sie wird automatisch als Kachel hinzugefügt.
                    </p>
                    {templates.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        Keine Vorlagen vorhanden.
                      </div>
                    ) : (
                      templates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => setSelectedTemplateForAssign(tpl)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                            selectedTemplateForAssign?.id === tpl.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-secondary hover:bg-muted"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-foreground">{tpl.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {tpl.blocks?.length || 0} Module
                            </p>
                          </div>
                          <ArrowRight size={14} />
                        </button>
                      ))
                    )}

                    {selectedTemplateForAssign && (
                      <div className="pt-4 border-t border-border flex justify-end">
                        <button
                          onClick={handleAssignTemplate}
                          disabled={assigningExercise}
                          className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                        >
                          {assigningExercise ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              Zuweisen...
                            </>
                          ) : (
                            <>
                              <Plus size={13} /> {text.assignNew}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      Füge eine bereits zugewiesene Übung als Kachel auf dem Board hinzu.
                    </p>
                    {clientExercises.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        Bislang wurden diesem Klienten keine Übungen zugewiesen.
                      </div>
                    ) : (
                      clientExercises
                        .filter(ex => !nodes.some(n => n.type === "exercise" && n.linkedId === ex.id))
                        .map((ex) => (
                          <button
                            key={ex.id}
                            onClick={() => handleAddExerciseNode(ex)}
                            className="w-full text-left p-3.5 rounded-2xl border border-border bg-secondary hover:bg-muted transition-all flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-bold text-foreground">{ex.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {ex.completed ? "Erledigt" : "Offen"}
                              </p>
                            </div>
                            <Plus size={14} />
                          </button>
                        ))
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inline element builder editors */}
      <ProcessInlineEditor
        editingNodeInline={editingNodeInline}
        setEditingNodeInline={setEditingNodeInline}
        inlineExercise={inlineExercise}
        setInlineExercise={setInlineExercise}
        inlineTask={inlineTask}
        setInlineTask={setInlineTask}
        inlineReflection={inlineReflection}
        setInlineReflection={setInlineReflection}
        loadingInlineData={loadingInlineData}
        handleSaveInlineExercise={handleSaveInlineExercise}
        handleSaveInlineTask={handleSaveInlineTask}
        handleSaveInlineReflection={handleSaveInlineReflection}
        locale={locale}
        setToast={setToast}
      />

      <BannerToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDone={() => setToast({ ...toast, visible: false })}
      />

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.45 }}
              className="bg-[#FFFDF9]/95 dark:bg-card/95 border border-[#DED6C9] dark:border-border w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl p-7 relative select-none border-b-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Warning Badge */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center font-black text-xl animate-pulse">
                  ⚠️
                </div>
                <div>
                  <h3 className="font-black text-lg text-foreground tracking-tight">
                    {selectedNodeIds.length > 1 ? "Elemente löschen?" : "Element löschen?"}
                  </h3>
                  <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground mt-0.5">
                    Unwiderruflicher Schritt
                  </p>
                </div>
              </div>

              {/* Body message */}
              <div className="space-y-4 mb-6 text-left">
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  {selectedNodeIds.length > 1
                    ? `Bist du sicher, dass du diese ${selectedNodeIds.length} Kacheln inklusive all ihrer Verbindungslinien löschen möchtest?`
                    : `Bist du sicher, dass du dieses Element inklusive all seiner Verbindungslinien löschen möchtest?`}
                </p>

                {/* List of selected items */}
                <div className="max-h-36 overflow-y-auto bg-secondary/65 border border-border/80 rounded-2xl p-3.5 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Ausgewählte Kacheln:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNodeTitles.map((title, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                        {title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions row */}
              <div className="flex gap-3 justify-end pt-2 border-t border-border/50">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-5 py-2.5 rounded-2xl bg-secondary text-foreground hover:bg-muted font-bold text-xs transition-all border border-border"
                >
                  Abbrechen
                </button>
                <button
                  onClick={async () => {
                    setShowDeleteConfirm(false);
                    await handleDeleteSelectedNodes();
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-destructive hover:bg-destructive-dark text-destructive-foreground font-bold text-xs transition-all shadow-lg shadow-destructive/20"
                >
                  Ja, löschen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
