import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { suggestDreadScore } from '../threats/dreadEngine'
import { ShapeButton } from '../canvas/ShapeButton'
import { ExportMenu } from '../canvas/ExportMenu'
import { ElementsTable } from '../canvas/ElementsTable'
import { useResizablePanel } from '../canvas/useResizablePanel'
import { ThreatOverlayContext } from '../canvas/ThreatOverlayContext'
import { OverlayMenu, type OverlayLayers } from '../canvas/OverlayMenu'
import type { CatalogEntry } from '../canvas/componentCatalog'
import { buildReportHtml, type ReportVariant } from '../reports/reportTemplate'
import { PastaWorkflow } from '../pasta/PastaWorkflow'
import { emptyPastaData, normalizePasta } from '../pasta/pastaDefaults'
import '../canvas/canvas.css'
import type { DiagramEdge, DiagramNode, DreadScore, ElementType, PastaData, Project, Threat, ThreatStatus } from '../types/project'

interface CanvasProps {
  projectId: string
  onBack: () => void
}

type ViewTab = 'diagram' | 'threats' | 'table' | 'pasta'

const edgeTypes = { floating: FloatingEdge }
const EMPTY_THREAT_MAP = new Map<string, Threat[]>()

const SHAPE_LABELS: Record<ElementType, string> = {
  process: 'Process',
  'external-entity': 'External Entity',
  'data-store': 'Data Store',
  'trust-boundary': 'Trust Boundary',
}

function makeNode(elementType: ElementType, index: number, preset?: CatalogEntry): DiagramNode {
  const base = {
    id: crypto.randomUUID(),
    type: elementType,
    position: { x: 120 + (index % 5) * 60, y: 120 + (index % 5) * 50 },
    data: {
      label: preset ? preset.name : `New ${SHAPE_LABELS[elementType]}`,
      elementType,
      componentType: preset?.id,
      attributes: preset
        ? preset.fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {} as Record<string, string | boolean>)
        : undefined,
    },
  }
  if (elementType === 'trust-boundary') {
    return {
      ...base,
      style: { width: 320, height: 220 },
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
  const [overlayLayers, setOverlayLayers] = useState<OverlayLayers>({ threatBadges: true })
  const [ribbonOpen, setRibbonOpen] = useState(true)
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

  function addShape(elementType: ElementType, preset?: CatalogEntry) {
    const node = makeNode(elementType, addedCount, preset)
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

  function viewThreatOnCanvas(id: string) {
    setFocusThreatId(id)
    setView('threats')
  }

  function toggleOverlayLayer(key: keyof OverlayLayers) {
    setOverlayLayers((layers) => ({ ...layers, [key]: !layers[key] }))
  }

  const selectedNode = useMemo(() => nodes.find((n) => n.selected), [nodes])
  const selectedEdge = useMemo(() => edges.find((e) => e.selected), [edges])
  const selection = selectedNode
    ? ({ kind: 'node', node: selectedNode } as const)
    : selectedEdge
      ? ({ kind: 'edge', edge: selectedEdge } as const)
      : null

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
    if (selectedNode) setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
    if (selectedEdge) setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id))
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

  if (loading || !project) {
    return <div className="canvas-page__loading">Loading diagram…</div>
  }

  const openThreatCount = threats.filter((t) => t.status === 'open').length
  const hasRibbon = view === 'diagram' || view === 'threats'

  return (
    <div className="canvas-page">
      <div className="canvas-toolbar">
        <div className="canvas-toolbar__row canvas-toolbar__row--primary">
          <div className="canvas-toolbar__title">
            <button type="button" className="btn" onClick={onBack}>
              ← Projects
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
            <ExportMenu onExport={handleExport} exporting={exporting} />
            <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saveState === 'saving'}>
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
                <span className={`canvas-drawer__caret${ribbonOpen ? ' canvas-drawer__caret--open' : ''}`}>▾</span>
              </button>
            )}
          </div>
        </div>
        {hasRibbon && ribbonOpen && (
          <div className="canvas-toolbar__row canvas-toolbar__row--ribbon">
            {view === 'diagram' && (
              <div className="canvas-toolbar__palette">
                {(Object.keys(SHAPE_LABELS) as ElementType[]).map((type) => (
                  <ShapeButton key={type} elementType={type} label={SHAPE_LABELS[type]} onAdd={addShape} />
                ))}
                <OverlayMenu layers={overlayLayers} onToggle={toggleOverlayLayer} />
              </div>
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
              onUpdateNode={updateNode}
              onUpdateEdge={updateEdge}
              onReverseEdge={reverseEdge}
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
            onUpdateNode={updateNode}
            onUpdateEdge={updateEdge}
            onReverseEdge={reverseEdge}
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
