import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
} from '@xyflow/react'
import { toPng } from 'html-to-image'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from '../canvas/nodeTypes'
import { FloatingEdge } from '../canvas/FloatingEdge'
import { Inspector } from '../canvas/Inspector'
import { DEFAULT_EDGE_DATA, edgeVisualProps } from '../canvas/edgeStyle'
import { ThreatsPanel } from '../threats/ThreatsPanel'
import { generateThreats, mergeThreats } from '../threats/ruleEngine'
import { suggestDreadScore, dreadAverage, dreadRiskLevel, DREAD_RISK_COLOR, type DreadRiskLevel } from '../threats/dreadEngine'
import { ShapeButton } from '../canvas/ShapeButton'
import { TrustBoundaryButton, type BoundaryShapePreset } from '../canvas/TrustBoundaryButton'
import { ExportMenu } from '../canvas/ExportMenu'
import { ElementsTable } from '../canvas/ElementsTable'
import { useResizablePanel } from '../canvas/useResizablePanel'
import { useDiagramHistory } from '../canvas/useDiagramHistory'
import { ThreatOverlayContext } from '../canvas/ThreatOverlayContext'
import { OverlayMenu, type OverlayLayers } from '../canvas/OverlayMenu'
import { findStencil, type StencilDef, type StencilOption } from '../canvas/stencils'
import { buildReportHtml, type ReportVariant } from '../reports/reportTemplate'
import { PastaWorkflow } from '../pasta/PastaWorkflow'
import { emptyPastaData, normalizePasta } from '../pasta/pastaDefaults'
import { getDiagramMessages } from '../threats/diagnostics'
import { ThreatModelInfoDialog } from '../components/ThreatModelInfoDialog'
import { MessagesDialog } from '../components/MessagesDialog'
import { NotesDialog } from '../components/NotesDialog'
import {
  IconArrowLeft,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconInfoCircle,
  IconAlertTriangle,
  IconNotes,
  IconDeviceFloppy,
  IconChevronDown,
} from '@tabler/icons-react'
import { SHAPE_LABELS, SHAPE_ICONS } from '../canvas/shapeMeta'
import '../canvas/canvas.css'
import type {
  CustomStencil,
  DiagramEdge,
  DiagramNode,
  DreadScore,
  ElementType,
  PastaData,
  Project,
  Threat,
  ThreatStatus,
} from '../types/project'

interface CanvasProps {
  projectId: string
  onBack: () => void
}

type ViewTab = 'diagram' | 'threats' | 'table' | 'pasta'

const edgeTypes = { floating: FloatingEdge }
const EMPTY_THREAT_MAP = new Map<string, Threat[]>()

function makeNode(
  elementType: ElementType,
  index: number,
  stencil?: StencilDef,
  boundaryPreset?: BoundaryShapePreset
): DiagramNode {
  const base = {
    id: crypto.randomUUID(),
    type: elementType,
    position: { x: 120 + (index % 5) * 60, y: 120 + (index % 5) * 50 },
    data: {
      label: stencil ? stencil.name : `New ${SHAPE_LABELS[elementType]}`,
      elementType,
      componentType: stencil?.id,
      attributes: stencil?.defaults ? { ...stencil.defaults } : undefined,
      customFields: stencil?.customFields,
      hiddenFieldKeys: stencil?.hiddenFieldKeys,
      boundaryShape: boundaryPreset?.shape,
    },
  }
  if (elementType === 'trust-boundary') {
    return {
      ...base,
      style: { width: boundaryPreset?.width ?? 320, height: boundaryPreset?.height ?? 220 },
      zIndex: -1,
    }
  }
  return base
}

function CanvasInner({ projectId, onBack }: CanvasProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<DiagramEdge>([])
  const [threats, setThreats] = useState<Threat[]>([])
  const [pasta, setPasta] = useState<PastaData>(emptyPastaData())
  const [view, setView] = useState<ViewTab>('diagram')
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [addedCount, setAddedCount] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [renamingProject, setRenamingProject] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [focusThreatId, setFocusThreatId] = useState<string | null>(null)
  const [overlayLayers, setOverlayLayers] = useState<OverlayLayers>({ threatBadges: true, dreadRiskColoring: false })
  const [ribbonOpen, setRibbonOpen] = useState(true)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const [showMessagesDialog, setShowMessagesDialog] = useState(false)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const { size: inspectorWidth, startDrag: startInspectorResize } = useResizablePanel({
    axis: 'x',
    initial: 280,
    min: 240,
    maxMargin: 320,
  })
  const { size: drawerHeight, startDrag: startDrawerResize } = useResizablePanel({
    axis: 'y',
    initial: 260,
    min: 120,
    maxMargin: 200,
  })
  const { fitView } = useReactFlow()
  const history = useDiagramHistory()
  const isRestoringRef = useRef(false)
  const historyInitializedRef = useRef(false)
  const clipboardRef = useRef<{ nodes: DiagramNode[]; edges: DiagramEdge[] } | null>(null)

  useEffect(() => {
    window.api.getProject(projectId).then((p) => {
      setProject(p)
      setNodes(p.diagram.nodes)
      // Normalize edges saved before line-style/arrow/color logic existed —
      // without this, legacy edges render with no marker at all.
      setEdges(
        p.diagram.edges.map((e) => {
          const data = { ...DEFAULT_EDGE_DATA, ...e.data }
          return { ...e, data, label: data.label, ...edgeVisualProps(data) }
        })
      )
      setThreats(p.threats)
      setPasta(normalizePasta(p.pasta))
      setLoading(false)
    })
  }, [projectId, setNodes, setEdges])

  // Debounced undo/redo snapshot: rather than instrumenting every single
  // mutation call site (add/delete/update/connect/reverse/etc.), just watch
  // nodes/edges and record a snapshot once changes settle for a moment. This
  // also naturally coalesces continuous changes (dragging a node) into one
  // undo step instead of one per pixel. Two guards: the first fire after load
  // establishes the baseline (via reset(), not record() — that's the loaded
  // state, not an edit to undo back to), and the fire caused by undo/redo
  // itself restoring a snapshot is skipped entirely (isRestoringRef).
  useEffect(() => {
    if (loading) return
    if (!historyInitializedRef.current) {
      historyInitializedRef.current = true
      history.reset(nodes, edges)
      return
    }
    if (isRestoringRef.current) {
      isRestoringRef.current = false
      return
    }
    const timer = setTimeout(() => history.record(nodes, edges), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, loading])

  function handleUndo() {
    const restored = history.undo()
    if (!restored) return
    isRestoringRef.current = true
    setNodes(restored.nodes)
    setEdges(restored.edges)
  }

  function handleRedo() {
    const restored = history.redo()
    if (!restored) return
    isRestoringRef.current = true
    setNodes(restored.nodes)
    setEdges(restored.edges)
  }

  function handleCopy() {
    const selectedNodeList = nodes.filter((n) => n.selected)
    if (selectedNodeList.length === 0) return
    const selectedIds = new Set(selectedNodeList.map((n) => n.id))
    // Only copy edges where both ends are also being copied — an edge to a
    // node left behind wouldn't have anywhere valid to reattach on paste.
    const selectedEdgeList = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target))
    clipboardRef.current = { nodes: structuredClone(selectedNodeList), edges: structuredClone(selectedEdgeList) }
  }

  function handlePaste() {
    if (!clipboardRef.current) return
    const idMap = new Map<string, string>()
    const pastedNodes = clipboardRef.current.nodes.map((n) => {
      const newId = crypto.randomUUID()
      idMap.set(n.id, newId)
      return { ...n, id: newId, position: { x: n.position.x + 40, y: n.position.y + 40 }, selected: true }
    })
    const pastedEdges = clipboardRef.current.edges.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
      selected: true,
    }))
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...pastedNodes])
    setEdges((eds) => [...eds.map((e) => ({ ...e, selected: false })), ...pastedEdges])
  }

  const onConnect = useCallback(
    (connection: Connection) =>
      // Not using React Flow's addEdge() utility here: it silently drops a
      // new connection if one already exists with the same source/target/
      // handle combo, which meant a 3rd+ connection between the same two
      // nodes (or two nodes reconnected via the same handle pair) just
      // didn't appear. Floating edges don't care which handle was actually
      // dragged from anyway, so each drag should always create its own edge.
      setEdges((eds) => [
        ...eds,
        {
          ...connection,
          id: crypto.randomUUID(),
          type: 'floating',
          data: DEFAULT_EDGE_DATA,
          label: DEFAULT_EDGE_DATA.label,
          ...edgeVisualProps(DEFAULT_EDGE_DATA),
        },
      ]),
    [setEdges]
  )

  function addShape(elementType: ElementType, preset?: StencilOption) {
    const stencil = preset ? findStencil(preset.id, project?.customStencils ?? []) : undefined
    const node = makeNode(elementType, addedCount, stencil)
    setAddedCount((c) => c + 1)
    setNodes((nds) => [...nds, node])
  }

  function addBoundary(preset: BoundaryShapePreset) {
    const node = makeNode('trust-boundary', addedCount, undefined, preset)
    setAddedCount((c) => c + 1)
    setNodes((nds) => [...nds, node])
  }

  function addFlow(sourceId: string, targetId: string) {
    const newEdge: DiagramEdge = {
      id: crypto.randomUUID(),
      source: sourceId,
      target: targetId,
      type: 'floating',
      data: DEFAULT_EDGE_DATA,
      label: DEFAULT_EDGE_DATA.label,
      ...edgeVisualProps(DEFAULT_EDGE_DATA),
    }
    setEdges((eds) => [...eds, newEdge])
    selectEdge(newEdge.id)
  }

  function deleteNodeById(id: string) {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    // Cascade-delete: an edge left pointing at a node that no longer exists
    // would be an orphan React Flow can't render.
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
  }

  function deleteEdgeById(id: string) {
    setEdges((eds) => eds.filter((e) => e.id !== id))
  }

  async function handleSave() {
    if (!project) return
    setSaveState('saving')
    const updated = await window.api.saveProject({
      ...project,
      diagram: { nodes, edges },
      threats,
      pasta,
    })
    setProject(updated)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 1500)
  }

  async function captureDiagramImage(): Promise<string | null> {
    if (nodes.length === 0) return null
    const el = document.querySelector('.react-flow') as HTMLElement | null
    if (!el) return null
    fitView({ padding: 0.15, duration: 0 })
    await new Promise((r) => setTimeout(r, 150))
    try {
      return await toPng(el, {
        backgroundColor: '#0f172a',
        filter: (node) => {
          const cls = (node as HTMLElement).classList
          if (!cls) return true
          return !cls.contains('react-flow__controls') && !cls.contains('react-flow__attribution')
        },
      })
    } catch {
      return null
    }
  }

  async function handleExport(variant: ReportVariant) {
    if (!project) return
    setExporting(true)
    try {
      const diagramImage = await captureDiagramImage()
      const html = buildReportHtml({ ...project, diagram: { nodes, edges }, threats }, variant, diagramImage)
      const safeName = project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      await window.api.exportReportPdf(html, `${safeName}-${variant}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  function handleRegenerateThreats() {
    const generated = generateThreats({ nodes, edges })
    const dreadEnabled = project?.frameworks.dread ?? false
    setThreats((existing) => {
      const merged = mergeThreats(existing, generated)
      if (!dreadEnabled) return merged
      return merged.map((t) => (t.dread ? t : { ...t, dread: suggestDreadScore(t, { nodes, edges }), dreadNeedsReview: true }))
    })
  }

  function changeThreatStatus(id: string, status: ThreatStatus) {
    setThreats((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)))
  }

  function changeThreatNotes(id: string, notes: string) {
    setThreats((ts) => ts.map((t) => (t.id === id ? { ...t, notes } : t)))
  }

  function changeThreatDread(id: string, dread: DreadScore) {
    setThreats((ts) => ts.map((t) => (t.id === id ? { ...t, dread, dreadNeedsReview: false } : t)))
  }

  function deleteThreat(id: string) {
    setThreats((ts) => ts.filter((t) => t.id !== id))
  }

  const openThreatsByTarget = useMemo(() => {
    const map = new Map<string, Threat[]>()
    for (const t of threats) {
      if (t.status !== 'open') continue
      const list = map.get(t.targetId)
      if (list) list.push(t)
      else map.set(t.targetId, [t])
    }
    return map
  }, [threats])

  const riskColorByTarget = useMemo(() => {
    const map = new Map<string, string>()
    if (!overlayLayers.dreadRiskColoring) return map
    const RANK: Record<DreadRiskLevel, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 }
    const levelByTarget = new Map<string, DreadRiskLevel>()
    for (const t of threats) {
      if (t.status !== 'open') continue
      const avg = dreadAverage(t.dread)
      if (avg === null) continue
      const level = dreadRiskLevel(avg)
      const existing = levelByTarget.get(t.targetId)
      if (!existing || RANK[level] > RANK[existing]) levelByTarget.set(t.targetId, level)
    }
    for (const [id, level] of levelByTarget) map.set(id, DREAD_RISK_COLOR[level])
    return map
  }, [threats, overlayLayers.dreadRiskColoring])

  function viewThreatOnCanvas(id: string) {
    setFocusThreatId(id)
    setView('threats')
  }

  function toggleOverlayLayer(key: keyof OverlayLayers) {
    setOverlayLayers((layers) => ({ ...layers, [key]: !layers[key] }))
  }

  const selectedNodes = useMemo(() => nodes.filter((n) => n.selected), [nodes])
  const selectedEdges = useMemo(() => edges.filter((e) => e.selected), [edges])
  const selectedNode = selectedNodes[0]
  const selectedEdge = selectedEdges[0]
  // Inspector only makes sense for a single selected element — with multiple
  // selected, "which one's properties are you editing" is ambiguous, so it
  // just hides instead of arbitrarily showing the first.
  const selection =
    selectedNodes.length + selectedEdges.length !== 1
      ? null
      : selectedNode
        ? ({ kind: 'node', node: selectedNode } as const)
        : ({ kind: 'edge', edge: selectedEdge } as const)

  function updateNode(id: string, patch: Partial<DiagramNode['data']>) {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)))
  }

  function updateEdge(id: string, patch: Partial<DiagramEdge['data']>) {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== id) return e
        const nextData = { ...e.data, ...patch }
        return { ...e, data: nextData, label: nextData.label, ...edgeVisualProps(nextData) }
      })
    )
  }

  function commitRename() {
    setRenamingProject(false)
    const trimmed = nameDraft.trim()
    if (project && trimmed && trimmed !== project.name) {
      setProject({ ...project, name: trimmed })
    }
  }

  function reverseEdge(id: string) {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === id
          ? { ...e, source: e.target, target: e.source, sourceHandle: e.targetHandle, targetHandle: e.sourceHandle }
          : e
      )
    )
  }

  function deleteSelection() {
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return
    const deletedNodeIds = new Set(selectedNodes.map((n) => n.id))
    const deletedEdgeIds = new Set(selectedEdges.map((e) => e.id))
    setNodes((nds) => nds.filter((n) => !deletedNodeIds.has(n.id)))
    // Cascade: also drop edges attached to a deleted node even if the edge
    // itself wasn't selected (e.g. box-selecting a node without its edges).
    setEdges((eds) => eds.filter((e) => !deletedEdgeIds.has(e.id) && !deletedNodeIds.has(e.source) && !deletedNodeIds.has(e.target)))
  }

  function clearSelection() {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })))
  }

  function selectNode(id: string) {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === id })))
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })))
  }

  function selectEdge(id: string) {
    setEdges((eds) => eds.map((e) => ({ ...e, selected: e.id === id })))
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
  }

  // Keyboard shortcuts for the diagram editor — undo/redo/copy/paste/delete.
  // Only active on the Diagram tab, and skipped entirely while a text input
  // is focused (Inspector fields, project rename, etc.) so those keep
  // their normal browser/native undo and typing behavior instead of us
  // stealing the keystroke.
  useEffect(() => {
    if (view !== 'diagram') return

    function isEditableTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false
      return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return
      const ctrlOrCmd = e.ctrlKey || e.metaKey
      if (!ctrlOrCmd) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          deleteSelection()
        }
        return
      }
      const key = e.key.toLowerCase()
      if (key === 'z' && e.shiftKey) {
        e.preventDefault()
        handleRedo()
      } else if (key === 'z') {
        e.preventDefault()
        handleUndo()
      } else if (key === 'y') {
        e.preventDefault()
        handleRedo()
      } else if (key === 'c') {
        e.preventDefault()
        handleCopy()
      } else if (key === 'v') {
        e.preventDefault()
        handlePaste()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, nodes, edges, selectedNodes, selectedEdges])

  if (loading || !project) {
    return <div className="canvas-page__loading">Loading diagram…</div>
  }

  const openThreatCount = threats.filter((t) => t.status === 'open').length
  const hasRibbon = view === 'diagram' || view === 'threats'
  const diagramMessages = getDiagramMessages({ nodes, edges }, threats)
  const warningCount = diagramMessages.filter((m) => m.severity === 'warning').length

  function updateProjectFields(patch: Partial<Project>) {
    setProject({ ...project, ...patch } as Project)
  }

  function saveCustomStencil(stencil: CustomStencil) {
    updateProjectFields({ customStencils: [...(project?.customStencils ?? []), stencil] })
  }

  return (
    <div className="canvas-page">
      <div className="canvas-toolbar">
        <div className="canvas-toolbar__row canvas-toolbar__row--primary">
          <div className="canvas-toolbar__title">
            <button type="button" className="btn" onClick={onBack}>
              <IconArrowLeft size={15} aria-hidden="true" />
              Projects
            </button>
            {renamingProject ? (
              <input
                type="text"
                className="canvas-toolbar__title-input"
                value={nameDraft}
                autoFocus
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') setRenamingProject(false)
                }}
              />
            ) : (
              <h1
                onDoubleClick={() => {
                  setNameDraft(project.name)
                  setRenamingProject(true)
                }}
                title="Double-click to rename"
              >
                {project.name}
              </h1>
            )}
          </div>
          <div className="canvas-toolbar__tabs">
            <button
              type="button"
              className={`tab${view === 'diagram' ? ' tab--active' : ''}`}
              onClick={() => setView('diagram')}
            >
              Diagram
            </button>
            <button
              type="button"
              className={`tab${view === 'threats' ? ' tab--active' : ''}`}
              onClick={() => setView('threats')}
            >
              Threats{openThreatCount > 0 ? ` (${openThreatCount})` : ''}
            </button>
            <button
              type="button"
              className={`tab${view === 'table' ? ' tab--active' : ''}`}
              onClick={() => setView('table')}
            >
              Table
            </button>
            {project.frameworks.pasta && (
              <button
                type="button"
                className={`tab${view === 'pasta' ? ' tab--active' : ''}`}
                onClick={() => setView('pasta')}
              >
                PASTA
              </button>
            )}
          </div>
          <div className="canvas-toolbar__actions">
            {view === 'diagram' && (
              <>
                <button
                  type="button"
                  className="btn btn--icon"
                  onClick={handleUndo}
                  disabled={!history.canUndo}
                  aria-label="Undo"
                  title="Undo (Ctrl+Z)"
                >
                  <IconArrowBackUp size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn--icon"
                  onClick={handleRedo}
                  disabled={!history.canRedo}
                  aria-label="Redo"
                  title="Redo (Ctrl+Y)"
                >
                  <IconArrowForwardUp size={15} aria-hidden="true" />
                </button>
                <span className="canvas-toolbar__divider" />
              </>
            )}
            <button type="button" className="btn" onClick={() => setShowInfoDialog(true)}>
              <IconInfoCircle size={15} aria-hidden="true" />
              Info
            </button>
            <button
              type="button"
              className={`btn${warningCount > 0 ? ' btn--warning' : ''}`}
              onClick={() => setShowMessagesDialog(true)}
            >
              <IconAlertTriangle size={15} aria-hidden="true" color={warningCount > 0 ? '#f59e0b' : undefined} />
              Messages
              {warningCount > 0 && <span className="canvas-toolbar__badge">{warningCount}</span>}
            </button>
            <button type="button" className="btn" onClick={() => setShowNotesDialog(true)}>
              <IconNotes size={15} aria-hidden="true" />
              Notes
            </button>
            <span className="canvas-toolbar__divider" />
            <ExportMenu onExport={handleExport} exporting={exporting} />
            <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saveState === 'saving'}>
              <IconDeviceFloppy size={15} aria-hidden="true" />
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Save'}
            </button>
            {hasRibbon && (
              <button
                type="button"
                className="canvas-toolbar__ribbon-toggle"
                onClick={() => setRibbonOpen((o) => !o)}
                aria-label={ribbonOpen ? 'Collapse toolbar' : 'Expand toolbar'}
                title={ribbonOpen ? 'Collapse toolbar' : 'Expand toolbar'}
              >
                <IconChevronDown
                  size={14}
                  aria-hidden="true"
                  style={{ transform: ribbonOpen ? undefined : 'rotate(-90deg)', transition: 'transform 0.15s ease' }}
                />
              </button>
            )}
          </div>
        </div>
        {hasRibbon && ribbonOpen && (
          <div className="canvas-toolbar__row canvas-toolbar__row--ribbon">
            {view === 'diagram' && (
              <>
                <div className="canvas-toolbar__group">
                  <span className="canvas-toolbar__group-label">Add element</span>
                  <div className="canvas-toolbar__palette">
                    {(['process', 'external-entity', 'data-store'] as ElementType[]).map((type) => (
                      <ShapeButton
                        key={type}
                        elementType={type}
                        label={SHAPE_LABELS[type]}
                        icon={SHAPE_ICONS[type]}
                        customStencils={project.customStencils ?? []}
                        onAdd={addShape}
                      />
                    ))}
                    <TrustBoundaryButton onAdd={addBoundary} />
                  </div>
                </div>
                <span className="canvas-toolbar__divider canvas-toolbar__divider--tall" />
                <div className="canvas-toolbar__group">
                  <span className="canvas-toolbar__group-label">View</span>
                  <OverlayMenu layers={overlayLayers} onToggle={toggleOverlayLayer} dreadAvailable={project.frameworks.dread} />
                </div>
              </>
            )}
            {view === 'threats' && (
              <div className="canvas-toolbar__palette">
                <button type="button" className="btn" onClick={handleRegenerateThreats}>
                  Regenerate Threats
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {view === 'diagram' && (
        <div className="canvas-diagram-area">
          <div className="canvas-body">
            <div className="canvas-flow-wrap">
              <ThreatOverlayContext.Provider
                value={{
                  threatsByTarget: overlayLayers.threatBadges ? openThreatsByTarget : EMPTY_THREAT_MAP,
                  riskColorByTarget,
                  onViewThreat: viewThreatOnCanvas,
                }}
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  defaultEdgeOptions={{ type: 'floating' }}
                  connectionMode={ConnectionMode.Loose}
                  selectionKeyCode="Shift"
                  multiSelectionKeyCode={['Meta', 'Control']}
                  deleteKeyCode={null}
                  fitView
                  colorMode="dark"
                >
                  <Background gap={16} />
                  <Controls />
                </ReactFlow>
              </ThreatOverlayContext.Provider>
            </div>
            {selection && <div className="resize-handle-x" onMouseDown={startInspectorResize} />}
            <Inspector
              selection={selection}
              customStencils={project.customStencils ?? []}
              onUpdateNode={updateNode}
              onUpdateEdge={updateEdge}
              onReverseEdge={reverseEdge}
              onSaveCustomStencil={saveCustomStencil}
              onDelete={deleteSelection}
              onClose={clearSelection}
              width={inspectorWidth}
            />
          </div>
          <div className="canvas-drawer">
            {drawerOpen && <div className="resize-handle-y" onMouseDown={startDrawerResize} />}
            <button
              type="button"
              className="canvas-drawer__handle"
              onClick={() => setDrawerOpen((o) => !o)}
            >
              <span className={`canvas-drawer__caret${drawerOpen ? ' canvas-drawer__caret--open' : ''}`}>▾</span>
              Table
            </button>
            {drawerOpen && (
              <div className="canvas-drawer__body" style={{ height: drawerHeight }}>
                <ElementsTable
                  nodes={nodes}
                  edges={edges}
                  customStencils={project.customStencils ?? []}
                  onSelectNode={selectNode}
                  onSelectEdge={selectEdge}
                  onAddElement={addShape}
                  onAddFlow={addFlow}
                  onDeleteNode={deleteNodeById}
                  onDeleteEdge={deleteEdgeById}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {view === 'threats' && (
        <div className="canvas-body">
          <ThreatsPanel
            threats={threats}
            dreadEnabled={project?.frameworks.dread ?? false}
            customStencils={project?.customStencils ?? []}
            focusThreatId={focusThreatId}
            onChangeStatus={changeThreatStatus}
            onChangeNotes={changeThreatNotes}
            onChangeDread={changeThreatDread}
            onDelete={deleteThreat}
          />
        </div>
      )}
      {view === 'table' && (
        <div className="canvas-body">
          <ElementsTable
            nodes={nodes}
            edges={edges}
            customStencils={project.customStencils ?? []}
            onSelectNode={selectNode}
            onSelectEdge={selectEdge}
            onAddElement={addShape}
            onAddFlow={addFlow}
            onDeleteNode={deleteNodeById}
            onDeleteEdge={deleteEdgeById}
          />
          {selection && <div className="resize-handle-x" onMouseDown={startInspectorResize} />}
          <Inspector
            selection={selection}
            customStencils={project.customStencils ?? []}
            onUpdateNode={updateNode}
            onUpdateEdge={updateEdge}
            onReverseEdge={reverseEdge}
            onSaveCustomStencil={saveCustomStencil}
            onDelete={deleteSelection}
            onClose={clearSelection}
            width={inspectorWidth}
          />
        </div>
      )}
      {view === 'pasta' && (
        <div className="canvas-body">
          <PastaWorkflow
            pasta={pasta}
            onChange={setPasta}
            diagram={{ nodes, edges }}
            threats={threats}
            dreadEnabled={project.frameworks.dread}
          />
        </div>
      )}

      {showInfoDialog && (
        <ThreatModelInfoDialog project={project} onChange={updateProjectFields} onClose={() => setShowInfoDialog(false)} />
      )}
      {showMessagesDialog && <MessagesDialog messages={diagramMessages} onClose={() => setShowMessagesDialog(false)} />}
      {showNotesDialog && (
        <NotesDialog
          notes={project.notes ?? ''}
          onChange={(notes) => updateProjectFields({ notes })}
          onClose={() => setShowNotesDialog(false)}
        />
      )}
    </div>
  )
}

export function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}
