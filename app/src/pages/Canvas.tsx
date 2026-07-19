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
  type OnNodeDrag,
} from '@xyflow/react'
import { toPng, toSvg } from 'html-to-image'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from '../canvas/nodeTypes'
import { FloatingEdge } from '../canvas/FloatingEdge'
import { Inspector } from '../canvas/Inspector'
import { DEFAULT_EDGE_DATA, edgeVisualProps } from '../canvas/edgeStyle'
import { ThreatsPanel } from '../threats/ThreatsPanel'
import { generateThreats, mergeThreats } from '../threats/ruleEngine'
import { threatsToCsv } from '../threats/threatIntel'
import { suggestDreadScore, explainDreadScore, dreadAverage, dreadRiskLevel, DREAD_RISK_COLOR, type DreadRiskLevel } from '../threats/dreadEngine'
import { ShapeButton } from '../canvas/ShapeButton'
import { TrustBoundaryButton, type BoundaryShapePreset } from '../canvas/TrustBoundaryButton'
import { ExportMenu } from '../canvas/ExportMenu'
import { ElementsTable } from '../canvas/ElementsTable'
import { useResizablePanel } from '../canvas/useResizablePanel'
import { useDiagramHistory } from '../canvas/useDiagramHistory'
import { ThreatOverlayContext } from '../canvas/ThreatOverlayContext'
import { OverlayMenu, type OverlayLayers } from '../canvas/OverlayMenu'
import { findStencil, type StencilDef, type StencilOption } from '../canvas/stencils'
import { attachMitigationToCrossingFlows } from '../canvas/mitigationAttach'
import { normalizeEdges, readLevel, writeLevel, removeSubDiagramSubtree } from '../canvas/subDiagrams'
import { autoLayoutDiagram } from '../canvas/autoLayout'
import { buildReportHtml, type ReportVariant } from '../reports/reportTemplate'
import { PastaWorkflow } from '../pasta/PastaWorkflow'
import { emptyPastaData, normalizePasta } from '../pasta/pastaDefaults'
import { getDiagramMessages } from '../threats/diagnostics'
import { ThreatModelInfoDialog } from '../components/ThreatModelInfoDialog'
import { MessagesDialog } from '../components/MessagesDialog'
import { NotesDialog } from '../components/NotesDialog'
import { HistoryDialog } from '../components/HistoryDialog'
import {
  IconArrowLeft,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconInfoCircle,
  IconAlertTriangle,
  IconNotes,
  IconDeviceFloppy,
  IconChevronDown,
  IconChevronRight,
  IconLayoutGrid,
  IconHistory,
} from '@tabler/icons-react'
import { SHAPE_LABELS, SHAPE_ICONS } from '../canvas/shapeMeta'
import '../canvas/canvas.css'
import type {
  ComplianceTag,
  CustomStencil,
  DiagramEdge,
  DiagramNode,
  DreadScore,
  ElementType,
  PastaData,
  PciScope,
  Project,
  ProjectRevision,
  Threat,
  ThreatStatus,
} from '../types/project'
import { computeEffectiveComplianceTags, computeEffectivePciScope } from '../canvas/complianceTags'

interface CanvasProps {
  projectId: string
  onBack: () => void
}

type ViewTab = 'diagram' | 'threats' | 'table' | 'pasta'

const edgeTypes = { floating: FloatingEdge }
const EMPTY_THREAT_MAP = new Map<string, Threat[]>()
const EMPTY_COMPLIANCE_MAP = new Map<string, Set<ComplianceTag>>()
const EMPTY_PCI_SCOPE_MAP = new Map<string, PciScope>()
const MAX_REVISIONS = 10

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
  const [overlayLayers, setOverlayLayers] = useState<OverlayLayers>({
    threatBadges: true,
    dreadRiskColoring: false,
    complianceTags: false,
  })
  const [ribbonOpen, setRibbonOpen] = useState(true)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const [showMessagesDialog, setShowMessagesDialog] = useState(false)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  // Sub-diagram navigation (Release 8): breadcrumb[] is the path from the
  // top-level diagram down to whichever level is currently loaded into
  // nodes/edges/threats above — empty means the top level. Only the last
  // segment's id is load-bearing (currentSubDiagramId below); the rest is
  // kept for the breadcrumb strip and for jumping back to an intermediate
  // level by clicking it.
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; label: string }[]>([])
  const currentSubDiagramId = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : null
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
      setEdges(normalizeEdges(p.diagram.edges))
      setThreats(p.threats)
      setPasta(normalizePasta(p.pasta))
      setBreadcrumb([])
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

  // Dropping (or re-dragging) a mitigation node onto an existing flow's path
  // splices it inline — see mitigationAttach.ts. Fires on every drag stop,
  // not just placement, so moving a mitigation later can pick up a newly
  // relevant crossing too; the per-node "Auto-attach" checkbox is the
  // escape hatch for a mitigation the user wants to position near a path
  // without absorbing it.
  const onNodeDragStop: OnNodeDrag<DiagramNode> = useCallback(
    (_event, node) => {
      const spliced = attachMitigationToCrossingFlows(node, { nodes, edges })
      if (spliced) setEdges(spliced)
    },
    [nodes, edges, setEdges]
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

  function handleTidyUp() {
    setNodes(autoLayoutDiagram({ nodes, edges }))
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
    const target = nodes.find((n) => n.id === id)
    if (target?.data.subDiagramId) {
      const proceed = window.confirm(
        `"${target.data.label}" contains a sub-diagram. Deleting it will also permanently delete everything inside that sub-diagram. Continue?`
      )
      if (!proceed) return
    }
    setNodes((nds) => nds.filter((n) => n.id !== id))
    // Cascade-delete: an edge left pointing at a node that no longer exists
    // would be an orphan React Flow can't render.
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    if (target?.data.subDiagramId) {
      setProject((p) => (p ? removeSubDiagramSubtree(p, target.data.subDiagramId!) : p))
    }
  }

  function deleteEdgeById(id: string) {
    setEdges((eds) => eds.filter((e) => e.id !== id))
  }

  // Loads a diagram/threats pair into the live editing state and resets
  // undo history to that level's baseline — reused by every navigation
  // function below. isRestoringRef suppresses the debounced-record effect
  // from pushing this load itself onto the just-reset undo stack; history
  // .reset() runs synchronously off the passed-in arrays so the baseline is
  // correct regardless of when React actually commits the state updates.
  function loadLevelIntoState(diagram: { nodes: DiagramNode[]; edges: DiagramEdge[] }, levelThreats: Threat[]) {
    const normalized = normalizeEdges(diagram.edges)
    isRestoringRef.current = true
    setNodes(diagram.nodes)
    setEdges(normalized)
    setThreats(levelThreats)
    history.reset(diagram.nodes, normalized)
  }

  // Commits the level being left (top or nested) into `project`, then loads
  // the target breadcrumb path's level. Used for both "jump to an
  // intermediate breadcrumb" and "go back to the top-level diagram" (pass []).
  function navigateToLevel(targetBreadcrumb: { id: string; label: string }[]) {
    if (!project) return
    const committed = writeLevel(project, currentSubDiagramId, nodes, edges, threats)
    setProject(committed)
    const targetId = targetBreadcrumb.length > 0 ? targetBreadcrumb[targetBreadcrumb.length - 1].id : null
    const level = readLevel(committed, targetId)
    loadLevelIntoState(level.diagram, level.threats)
    setBreadcrumb(targetBreadcrumb)
  }

  function goToTopLevel() {
    navigateToLevel([])
  }

  function goToBreadcrumbIndex(i: number) {
    navigateToLevel(breadcrumb.slice(0, i + 1))
  }

  // Drills into a Process node's sub-diagram, creating an empty one first if
  // it doesn't have one yet. Patches the owning node's subDiagramId into the
  // level being left *before* committing it (not via updateNode + separate
  // commit — state updates aren't synchronous, so a naive two-step version
  // would commit the pre-patch nodes array).
  function drillIntoSubDiagram(node: DiagramNode) {
    if (!project) return
    const existingId = node.data.subDiagramId
    const targetId = existingId ?? crypto.randomUUID()
    const currentNodes = existingId
      ? nodes
      : nodes.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, subDiagramId: targetId } } : n))
    let committed = writeLevel(project, currentSubDiagramId, currentNodes, edges, threats)
    if (!existingId) {
      committed = {
        ...committed,
        subDiagrams: { ...(committed.subDiagrams ?? {}), [targetId]: { id: targetId, diagram: { nodes: [], edges: [] }, threats: [] } },
      }
    }
    setProject(committed)
    const level = readLevel(committed, targetId)
    loadLevelIntoState(level.diagram, level.threats)
    setBreadcrumb((bc) => [...bc, { id: targetId, label: node.data.label }])
  }

  async function handleSave() {
    if (!project) return
    setSaveState('saving')
    const committed = writeLevel(project, currentSubDiagramId, nodes, edges, threats)
    const fullState = { ...committed, pasta }
    const revision: ProjectRevision = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      snapshot: {
        diagram: fullState.diagram,
        threats: fullState.threats,
        pasta: fullState.pasta,
        info: fullState.info,
        notes: fullState.notes,
        customStencils: fullState.customStencils,
        subDiagrams: fullState.subDiagrams,
      },
    }
    const revisionHistory = [revision, ...(fullState.revisionHistory ?? [])].slice(0, MAX_REVISIONS)
    const revisionCount = (fullState.revisionCount ?? 0) + 1
    const updated = await window.api.saveProject({ ...fullState, revisionHistory, revisionCount })
    setProject(updated)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 1500)
  }

  // Loads an old full-project snapshot back into the live editing state —
  // always jumps to the top level (a restored sub-diagram's own breadcrumb
  // trail doesn't necessarily still make sense) and resets undo history,
  // same reasoning as sub-diagram level navigation. Deliberately does *not*
  // save automatically — restoring only replaces what's being edited; the
  // user still has to hit Save to make it the new persisted state, same as
  // every other edit in this app, and until they do the previous revisions
  // (including the one they're currently overwriting) are untouched.
  function restoreRevision(revision: ProjectRevision) {
    if (!project) return
    const proceed = window.confirm(
      `Restore the version saved ${new Date(revision.savedAt).toLocaleString()}? Your current unsaved changes, if any, will be discarded. You'll still need to click Save to keep this restored version.`
    )
    if (!proceed) return
    const restoredProject: Project = { ...project, ...revision.snapshot }
    setProject(restoredProject)
    setBreadcrumb([])
    loadLevelIntoState(restoredProject.diagram, restoredProject.threats)
    setPasta(normalizePasta(restoredProject.pasta))
    setShowHistoryDialog(false)
  }

  async function captureDiagramImage(format: 'png' | 'svg' = 'png'): Promise<string | null> {
    if (nodes.length === 0) return null
    const el = document.querySelector('.react-flow') as HTMLElement | null
    if (!el) return null
    fitView({ padding: 0.15, duration: 0 })
    await new Promise((r) => setTimeout(r, 150))
    const opts = {
      backgroundColor: '#0f172a',
      filter: (node: HTMLElement) => {
        const cls = node.classList
        if (!cls) return true
        return !cls.contains('react-flow__controls') && !cls.contains('react-flow__attribution')
      },
    }
    try {
      return format === 'svg' ? await toSvg(el, opts) : await toPng(el, opts)
    } catch {
      return null
    }
  }

  async function handleExport(variant: ReportVariant) {
    if (!project) return
    setExporting(true)
    try {
      const diagramImage = await captureDiagramImage('png')
      const html = buildReportHtml({ ...project, diagram: { nodes, edges }, threats }, variant, diagramImage)
      const safeName = project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      await window.api.exportReportPdf(html, `${safeName}-${variant}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  /** Standalone diagram export (Release 11) — the same capture
   *  `captureDiagramImage` already does for the PDF's embedded screenshot,
   *  just saved directly instead of wrapped in a report. */
  async function handleExportImage(format: 'png' | 'svg') {
    if (!project) return
    setExporting(true)
    try {
      const dataUrl = await captureDiagramImage(format)
      if (!dataUrl) return
      const safeName = project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      await window.api.exportDiagramImage(dataUrl, format, `${safeName}-diagram.${format}`)
    } finally {
      setExporting(false)
    }
  }

  /** Threats tab's "Export CSV" (Release 11) — exports whatever list the
   *  panel hands back (its currently filtered threats, not necessarily
   *  every threat in the project). */
  function handleExportThreatsCsv(list: Threat[]) {
    if (!project) return
    const csv = threatsToCsv(list, { complianceTagsByTarget, pciScopeByTarget })
    const safeName = project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    window.api.exportThreatsCsv(csv, `${safeName}-threats.csv`)
  }

  function handleRegenerateThreats() {
    const generated = generateThreats({ nodes, edges })
    const dreadEnabled = project?.frameworks.dread ?? false
    setThreats((existing) => {
      const merged = mergeThreats(existing, generated)
      if (!dreadEnabled) return merged
      // A threat's score is only ever frozen once a human has actually
      // reviewed/edited it (dreadNeedsReview cleared by changeThreatDread).
      // Until then it's still just a suggestion, so it — and its
      // explanatory breakdown — keep refreshing against the current diagram
      // on every regenerate, rather than freezing at first-generation time
      // and silently drifting out of sync with the diagram as tags/attributes
      // change afterward (the "why these scores" hover otherwise ends up
      // explaining a different diagram state than the one that produced the
      // still-displayed number).
      return merged.map((t) =>
        t.dread && !t.dreadNeedsReview
          ? t
          : { ...t, dread: suggestDreadScore(t, { nodes, edges }), dreadBreakdown: explainDreadScore(t, { nodes, edges }), dreadNeedsReview: true }
      )
    })
  }

  function changeThreatStatus(id: string, status: ThreatStatus) {
    setThreats((ts) =>
      ts.map((t) =>
        t.id === id
          ? { ...t, status, acceptedAt: status === 'accepted' && !t.acceptedAt ? new Date().toISOString() : t.acceptedAt }
          : t
      )
    )
  }

  function changeThreatNotes(id: string, notes: string) {
    setThreats((ts) => ts.map((t) => (t.id === id ? { ...t, notes } : t)))
  }

  function changeThreatAcceptance(id: string, patch: Partial<Pick<Threat, 'acceptedBy' | 'reviewByDate'>>) {
    setThreats((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)))
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

  // Always computed regardless of the canvas overlay toggle — that toggle
  // only controls whether the diagram badge renders, not whether other
  // views (the Threats tab) get to know about compliance scope.
  const complianceTagsByTarget = useMemo(() => computeEffectiveComplianceTags({ nodes, edges }), [nodes, edges])
  const pciScopeByTarget = useMemo(() => computeEffectivePciScope({ nodes, edges }), [nodes, edges])

  // Target id -> mitigation stencil type, for the Threats tab's "Compensating
  // controls" block (Release 7) — a mitigation node itself, plus any edge it
  // directly feeds (traffic that has passed through it), same "source node's
  // attrs benefit the downstream edge" relationship dreadEngine.ts's
  // mitigationContributions() uses.
  const mitigationTypeByTarget = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of nodes) {
      if (n.data.elementType === 'mitigation') {
        map.set(n.id, (n.data.attributes?.mitigationType as string) ?? 'Generic Mitigation Control')
      }
    }
    for (const e of edges) {
      const source = nodes.find((n) => n.id === e.source)
      if (source?.data.elementType === 'mitigation') {
        map.set(e.id, (source.data.attributes?.mitigationType as string) ?? 'Generic Mitigation Control')
      }
    }
    return map
  }, [nodes, edges])

  // Process-node id -> open threat count inside its sub-diagram, for the
  // canvas SubDiagramBadge (Release 8). Keyed only for Process nodes that
  // actually own one — badge presence is "map has this key", not "count > 0",
  // so a sub-diagram with zero open threats still shows the indicator.
  const subDiagramOpenThreatCountByTarget = useMemo(() => {
    const map = new Map<string, number>()
    for (const n of nodes) {
      if (n.data.elementType === 'process' && n.data.subDiagramId) {
        const sub = project?.subDiagrams?.[n.data.subDiagramId]
        map.set(n.id, sub ? sub.threats.filter((t) => t.status === 'open').length : 0)
      }
    }
    return map
  }, [nodes, project])

  function openSubDiagramFromBadge(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId)
    if (node) drillIntoSubDiagram(node)
  }

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

  function changeFlowEndpoints(edgeId: string, sourceId: string, targetId: string) {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId ? { ...e, source: sourceId, target: targetId, sourceHandle: undefined, targetHandle: undefined } : e
      )
    )
  }

  function deleteSelection() {
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return
    const withSubDiagrams = selectedNodes.filter((n) => n.data.subDiagramId)
    if (withSubDiagrams.length > 0) {
      const names = withSubDiagrams.map((n) => `"${n.data.label}"`).join(', ')
      const proceed = window.confirm(
        `${names} contain${withSubDiagrams.length === 1 ? 's' : ''} a sub-diagram. Deleting ${
          withSubDiagrams.length === 1 ? 'it' : 'them'
        } will also permanently delete everything inside ${withSubDiagrams.length === 1 ? 'that sub-diagram' : 'those sub-diagrams'}. Continue?`
      )
      if (!proceed) return
    }
    const deletedNodeIds = new Set(selectedNodes.map((n) => n.id))
    const deletedEdgeIds = new Set(selectedEdges.map((e) => e.id))
    setNodes((nds) => nds.filter((n) => !deletedNodeIds.has(n.id)))
    // Cascade: also drop edges attached to a deleted node even if the edge
    // itself wasn't selected (e.g. box-selecting a node without its edges).
    setEdges((eds) => eds.filter((e) => !deletedEdgeIds.has(e.id) && !deletedNodeIds.has(e.source) && !deletedNodeIds.has(e.target)))
    const ownedSubDiagramIds = withSubDiagrams.map((n) => n.data.subDiagramId).filter((x): x is string => Boolean(x))
    if (ownedSubDiagramIds.length > 0) {
      setProject((p) => (p ? ownedSubDiagramIds.reduce((acc, id) => removeSubDiagramSubtree(acc, id), p) : p))
    }
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
            <button
              type="button"
              className="btn"
              onClick={() => setShowHistoryDialog(true)}
              title="Version history — every save is kept as a restorable revision (last 10)"
            >
              <IconHistory size={15} aria-hidden="true" />v{project.revisionCount ?? 0}
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
              className={`tab${view === 'table' ? ' tab--active' : ''}`}
              onClick={() => setView('table')}
            >
              Table
            </button>
            <button
              type="button"
              className={`tab${view === 'threats' ? ' tab--active' : ''}`}
              onClick={() => setView('threats')}
            >
              Threats{openThreatCount > 0 ? ` (${openThreatCount})` : ''}
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
            <ExportMenu onExport={handleExport} onExportImage={handleExportImage} exporting={exporting} />
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
        {breadcrumb.length > 0 && (
          <div className="canvas-toolbar__row canvas-breadcrumb">
            <button type="button" className="canvas-breadcrumb__crumb" onClick={goToTopLevel}>
              {project.name}
            </button>
            {breadcrumb.map((b, i) => (
              <span className="canvas-breadcrumb__segment" key={b.id}>
                <IconChevronRight size={13} aria-hidden="true" />
                {i === breadcrumb.length - 1 ? (
                  <span className="canvas-breadcrumb__crumb canvas-breadcrumb__crumb--current">{b.label}</span>
                ) : (
                  <button type="button" className="canvas-breadcrumb__crumb" onClick={() => goToBreadcrumbIndex(i)}>
                    {b.label}
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {hasRibbon && ribbonOpen && (
          <div className="canvas-toolbar__row canvas-toolbar__row--ribbon">
            {view === 'diagram' && (
              <>
                <div className="canvas-toolbar__group">
                  <span className="canvas-toolbar__group-label">Add element</span>
                  <div className="canvas-toolbar__palette">
                    {(['process', 'external-entity', 'data-store', 'mitigation'] as ElementType[]).map((type) => (
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
                  <span className="canvas-toolbar__group-label">Layout</span>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleTidyUp}
                    disabled={nodes.filter((n) => n.data.elementType !== 'trust-boundary').length === 0}
                    title="Reflow elements into a top-to-bottom layout based on their flows. Trust boundaries stay in place as containers but resize to fit whatever ends up inside them."
                  >
                    <IconLayoutGrid size={15} aria-hidden="true" />
                    Tidy up
                  </button>
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
                  complianceTagsByTarget: overlayLayers.complianceTags ? complianceTagsByTarget : EMPTY_COMPLIANCE_MAP,
                  pciScopeByTarget: overlayLayers.complianceTags ? pciScopeByTarget : EMPTY_PCI_SCOPE_MAP,
                  subDiagramOpenThreatCountByTarget,
                  onViewThreat: viewThreatOnCanvas,
                  onOpenSubDiagram: openSubDiagramFromBadge,
                }}
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeDragStop={onNodeDragStop}
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
              onOpenSubDiagram={drillIntoSubDiagram}
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
                  onEditFlow={changeFlowEndpoints}
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
            complianceTagsByTarget={complianceTagsByTarget}
            pciScopeByTarget={pciScopeByTarget}
            mitigationTypeByTarget={mitigationTypeByTarget}
            focusThreatId={focusThreatId}
            onChangeStatus={changeThreatStatus}
            onChangeNotes={changeThreatNotes}
            onChangeDread={changeThreatDread}
            onChangeAcceptance={changeThreatAcceptance}
            onDelete={deleteThreat}
            onExportCsv={handleExportThreatsCsv}
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
            onEditFlow={changeFlowEndpoints}
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
            onOpenSubDiagram={drillIntoSubDiagram}
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
      {showHistoryDialog && (
        <HistoryDialog
          revisionCount={project.revisionCount ?? 0}
          revisionHistory={project.revisionHistory ?? []}
          onRestore={restoreRevision}
          onClose={() => setShowHistoryDialog(false)}
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
