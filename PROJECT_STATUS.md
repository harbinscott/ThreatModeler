# Threat Modeling Desktop App — Status Handoff

Written mid-session as a resume point before context compaction. If you're a fresh
Claude Code session reading this: the user wants to keep building this app. Read
this whole file before touching code — it captures decisions and gotchas that
aren't obvious from the code alone.

## What this is

A Windows desktop threat-modeling tool (Electron + React + TypeScript), inspired by
Microsoft's Threat Modeling Tool and OWASP Threat Dragon, but unifying STRIDE
(diagram-driven auto threat generation), DREAD (scoring — not yet built), and PASTA
(guided workflow — not yet built) rather than treating them as mutually exclusive.
Built as a learning/portfolio project — competitive landscape doesn't drive scope
decisions, the user's actual requests do.

Not yet named. Folder/package name is literally `app`. GitHub placeholder was "TMU".
Name ideas floated earlier: ThreatForge, RiskLoom, Bastion Modeler, ThreatBlueprint,
Cartograph, Warden — nothing chosen.

## Where things live

- Working directory root: `C:\Users\harbi\OneDrive\Desktop\ThreatModeling`
- Actual app code: `C:\Users\harbi\OneDrive\Desktop\ThreatModeling\app`
- **Git repo, pushed to GitHub**: `https://github.com/harbinscott/ThreatModeler`
  (`main` branch). Repo root is the `ThreatModeling` folder (not `app/`), so
  `PROJECT_STATUS.md` and `README.md` are tracked alongside `app/`. The repo
  already had a stub "Initial commit" (README only) from the user's Ubuntu
  machine before this session touched it — local history was based on top of
  that commit (`git reset --soft origin/main` then commit + push), not force-pushed
  over it, so that original commit is still in the log. Root `.gitignore`
  excludes `.claude/` (local tool config); `app/.gitignore` (pre-existing, from
  the Vite scaffold) excludes `node_modules`/`dist`. Git identity for this
  machine: `harbinscott` / `harbin.scott@gmail.com` (set globally via `git
  config --global`, this machine had none before). Push auth goes through Git
  Credential Manager (`credential.helper=manager`, already configured
  system-wide) — no PAT/SSH key needed, it handles the browser OAuth flow
  itself (didn't even prompt on the first push here, likely cached).
- Node.js 24.18.0 LTS was NOT preinstalled — installed via `winget install OpenJS.NodeJS.LTS`.

## Running it

```
cd app
npm run electron:dev
```

**Gotcha**: this session's shell tool doesn't pick up the newly-installed Node PATH
automatically. Every Bash/PowerShell call that needs `node`/`npm` had to prefix:
```
$env:Path += ";C:\Program Files\nodejs"
```
Check whether a fresh session still needs this before assuming it does.

**Gotcha**: Claude Code's auto-mode classifier blocks `taskkill /F /IM electron.exe`
(and node.exe) as too broad/destructive, so background `npm run electron:dev`
processes from earlier relaunches this session are never cleaned up — each
relaunch picks the next free port (5173, 5174, 5175, ...) and opens *another*
Electron window alongside the stale ones. If you're testing and see multiple
windows, close the older ones by hand; the newest one is the current build.

Typecheck: `npx tsc -b --noEmit` (run this after every change — has caught real bugs).

Dev mode opens Electron DevTools automatically. Main-process `console.log` goes to
the terminal running `npm run electron:dev`, not DevTools.

## Tech stack

- Electron (main: `electron/main.js`, preload: `electron/preload.cjs`, both plain
  JS/CJS — not compiled)
- React 19 + TypeScript, Vite dev server
- `@xyflow/react` (React Flow v12) for the diagram canvas
- `html-to-image` for PNG diagram capture (used in PDF export)
- `electron-builder` configured for Windows NSIS installer — **never actually run**

## Data model — `src/types/project.ts`

```
Project { id, name, description, frameworks{stride,dread,pasta}, diagram{nodes,edges}, threats[], createdAt, updatedAt }
DiagramNodeData { label, elementType, description?, componentType?, attributes?, colors?{fill,border,text} }
DiagramEdgeData { label?, lineStyle?(solid/dashed/dotted), arrowStyle?(one-way/two-way/none), color? }
Threat { id, ruleId, targetType(node/edge), targetId, targetLabel, componentType?, category(S/T/R/I/D/E), title, description, status(open/mitigated/accepted/false-positive), source(auto/manual), notes?, dread?, createdAt }
```
`Threat.dread` exists in the type but **nothing reads or writes it yet** — DREAD
scoring is unbuilt (see backlog).

## Persistence — `electron/main.js`

Projects are individual JSON files in `app.getPath('userData')/projects/*.json`.
IPC handlers: `projects:list/create/get/save/delete/export-file/import-file`,
`reports:export-pdf`. All exposed to renderer via `electron/preload.cjs` →
`window.api`, typed in `src/types/electron.d.ts`.

**Pattern to keep following**: whenever the data model gains a field, add a
backward-compat default in the `projects:get` handler (see `if (!project.diagram)`,
`if (!project.threats)`) — old saved files won't have new fields. This already bit
us once (edges saved before marker logic existed loaded with invisible arrows;
fixed by normalizing on load in `Canvas.tsx`'s `useEffect`, not in main.js this
time, but the principle is the same — check for it whenever you touch shape).

## What's built (roughly chronological)

**App shell**: `src/pages/Dashboard.tsx` (project list, create/delete/export/import),
`src/pages/NewProjectWizard.tsx`, `src/components/FrameworkPicker.tsx` (STRIDE/DREAD/PASTA
toggle cards, layered not exclusive — STRIDE drives the canvas, DREAD is a scoring
layer, PASTA a separate workflow).

**Diagram canvas** — `src/pages/Canvas.tsx` (large, central file) +:
- `src/canvas/nodes/{ProcessNode,ExternalEntityNode,DataStoreNode,TrustBoundaryNode}.tsx`
- `src/canvas/nodeTypes.ts`, `src/canvas/handles.tsx` (FourWayHandles)
- Trust boundary is click-through by design: `.react-flow__node.react-flow__node-trust-boundary { pointer-events: none !important }`
  in `canvas.css` — only its label chip is draggable/clickable. The `!important` is
  load-bearing: React Flow's own stylesheet sets `pointer-events:all` on `.react-flow__node`
  at equal CSS specificity, and Vite dev-mode injection order for a pre-bundled
  dependency isn't reliably after app CSS.
- **Floating edges**: `src/canvas/FloatingEdge.tsx` + `src/canvas/floating.ts` — edges
  compute a live geometric intersection with each node's rectangle rather than
  terminating at a fixed handle dot, so many connections on one node fan out
  correctly instead of stacking. Registered via `edgeTypes` + `defaultEdgeOptions={{type:'floating'}}`.
- Edge styling: `src/canvas/edgeStyle.ts` (`edgeVisualProps`, `DEFAULT_EDGE_DATA`) —
  line style/arrow direction/color, all driven off `edge.data` and recomputed into
  `style`/`markerStart`/`markerEnd` any time data changes (including on load, to
  normalize legacy edges).
- Reverse-direction button in the edge Inspector swaps source/target.

**Inspector panel** — `src/canvas/Inspector.tsx`: node fields (name, description,
color, component-type combobox, dynamic catalog attributes) and edge fields (label,
color, line style, arrow direction, reverse). This same component is reused,
unmodified, by both the Diagram tab and the Table tab (see below) — selection is
just "which node/edge has `.selected = true`" and both tabs write to that.

**Component catalog** — `src/canvas/componentCatalog.ts`: 8 starter entries (Web
Server, API/App Service, Message Queue, Load Balancer, Database, File/Object
Storage, External User/Client, Third-Party Service), each with a handful of
threat-relevant fields. **This is a placeholder** — see backlog item on the full
MS-TMT attribute schema.

**Combobox** — `src/canvas/Combobox.tsx`: replaced native `<datalist>` for
component-type typeahead (click shows all, typing filters by substring, keyboard nav).

**Color system** — `src/canvas/color.ts`, `ColorSwatchPicker.tsx`, `nodeColor.ts`:
preset swatches + native color wheel + up to 5 recent custom colors
(`localStorage['tm-recent-colors']`). Nodes get fill/border/text — border links to
fill by default unless overridden via an "Advanced" toggle, text auto-contrasts
(black/white by luminance) unless manually set. Trust boundaries only get an accent
color (border/label), no solid fill, on purpose — they're containers.

**Toolbar shape buttons** — `src/canvas/ShapeButton.tsx`: each palette button has a
caret flyout listing catalog presets for that element type; picking one adds the
shape pre-configured with `componentType` + empty attributes.

**STRIDE rule engine** — `src/threats/ruleEngine.ts`: `generateThreats(diagram)`
gives Process all 6 categories, External Entity S+R, Data Store T+I+D (with an
escalated Information Disclosure description if `dataClassification` is
Confidential/Restricted and `encryptedAtRest` isn't true). Edges get T+I+D, with a
geometric point-in-rect check against trust-boundary bounds flagging
boundary-crossing flows for extra scrutiny. `mergeThreats()` dedupes on
`${targetId}:${ruleId}`, preserves user edits on existing auto threats, keeps
manual threats untouched, prunes threats whose target no longer exists.

**Threats tab** — `src/threats/ThreatsPanel.tsx`: list (left) + detail (right),
draggable splitter between them, filters for status/category/component-type.
Detail panel has a "Resolution notes" field (hint text changes based on status —
"what mitigates this?" vs "why false positive?" etc.) and a delete button.

**Table/Elements editor** — `src/canvas/ElementsTable.tsx`. Lives in two places: a
third "Table" tab in `Canvas.tsx`, and a collapsible drawer docked under the
Diagram tab (`.canvas-drawer` in `canvas.css`). Two sub-tabs: Elements
(non-boundary nodes) and Flows (edges). Clicking a row sets `.selected` on that
node/edge — same mechanism as clicking it on canvas — so the existing Inspector
just works, no separate sync code needed since it's literally the same React
state. Has add buttons (+Process/+External Entity/+Data Store, +Add Flow with
source/target dropdowns) and per-row delete.

**Resizable panels** — `src/canvas/useResizablePanel.ts`: shared drag-to-resize
hook, viewport-edge-anchored (measures directly off `window.innerWidth`/
`innerHeight`, no container ref needed, since every panel using it — Inspector,
Threats detail, the docked drawer — is flush against the window's right or bottom
edge). No hardcoded max; max is computed live as `viewport size - maxMargin`, so
it scales with the window instead of hitting an arbitrary cap. Used by: Threats
splitter (`ThreatsPanel.tsx`), Inspector width (shared state in `Canvas.tsx`,
applied via a new `width` prop on `Inspector`, same value used in both the Diagram
and Table tabs), and the drawer height (`Canvas.tsx`, resize strip is a separate
`.resize-handle-y` element above the drawer's toggle button — deliberately not
combined with the click-to-toggle button itself, that felt ambiguous). CSS classes
`.resize-handle-x` / `.resize-handle-y` in `canvas.css` are the generic handle
styles — reuse these for any future resizable panel rather than writing new drag
logic.

**DREAD scoring** — `src/threats/dreadEngine.ts` + a new section in
`ThreatsPanel.tsx`'s detail panel (only rendered when `project.frameworks.dread`
is true). Five 1-10 fields (damage/reproducibility/exploitability/affectedUsers/
discoverability), live total/average, color-coded risk level (Low/Medium/High/
Critical) shown both in the detail panel and as a pill on each list row.
`suggestDreadScore(threat, diagram)` gives every newly-generated threat a
starting score — base values per STRIDE category, then adjusted for
trust-boundary crossings, "high priority" data-sensitivity text, and (as of the
MS-TMT pass below) the target's security attributes — tagged
`Threat.dreadNeedsReview = true` until the user edits any field, at which point
`changeThreatDread()` in `Canvas.tsx` clears the flag. Only fires from
`handleRegenerateThreats()`; scores are never overwritten once a threat already
has one, so user edits persist across re-runs.

**MS-TMT security attributes** — `src/canvas/mstmAttributes.ts` defines
Microsoft Threat Modeling Tool's full per-element-type field schema (Process:
Code Type/Running As/Isolation Level/Accepts Input From/auth+sanitization
booleans, plus conditional Browser+ActiveX and Windows Store Process
capability fields; Data Store: Stores Credentials/Encrypted/Signed/Store Type
etc, plus conditional File System/Cookie/Device sub-fields; External
Interactor: Authenticates Itself/Type/Microsoft; Data Flow: Physical
Network/Source+Destination Authenticated/Confidentiality/Integrity/payload
types — this is the first attribute system edges have, via the new
`DiagramEdgeData.attributes` field). Rendered as a collapsible "Security
properties (MS-TMT)" section in `Inspector.tsx`, **layered on top of** the
existing 8-entry component catalog rather than replacing it — catalog fields
(Web Server, Database, etc.) stay as quick presets, MS-TMT fields are
elementType-driven and always available regardless of which preset is picked.
Field keys are reused where the concepts are identical (e.g. `encryptedAtRest`
backs both the Database preset's "Encrypted at rest" and the generic MS-TMT
"Encrypted" field — same underlying value, so they can't drift out of sync);
`NodeInspector` filters out any MS-TMT field whose key a selected catalog
preset already renders, to avoid showing the same control twice. Two fields
(`processType`, `interactorType`) are subtype selectors with no MS-TMT
equivalent purpose beyond driving conditional sub-fields and pre-filling a
sensible default for `codeType`/`type` (see `PROCESS_TYPE_CODE_TYPE_DEFAULT` /
`INTERACTOR_TYPE_TYPE_DEFAULT` in `mstmAttributes.ts`) — user can still
override the default afterward.

These attributes now feed both engines: `ruleEngine.ts` appends
context-specific sentences to threat descriptions (e.g. "No authentication
mechanism is declared", "This flow does not provide confidentiality") based on
attribute values, and `dreadEngine.ts`'s `attributeAdjustments()` nudges the
relevant DREAD field(s) up when an attribute signals elevated risk (no auth →
+2 exploitability on Spoofing/Elevation threats, unencrypted credential store →
+3 damage/+2 affected-users on Information Disclosure, etc). Both read the
same attribute keys, so a change in the Inspector is "mappable back to STRIDE
and DREAD" without extra wiring per the original request.

**Threat overlay on canvas** — `src/canvas/ThreatBadge.tsx` +
`src/canvas/ThreatOverlayContext.tsx`. Every Process/External Entity/Data
Store node and every data flow edge shows a small colored count badge (tiered
amber/coral/red by open-threat count) when it has open threats; click for a
popover listing them, click a row to jump to that threat's detail view on the
Threats tab (`Canvas.tsx`'s `viewThreatOnCanvas` + `focusThreatId` prop threads
into `ThreatsPanel.tsx`, applied via a `useEffect` that sets its internal
`selectedId`). The popover renders through a React portal into
`document.body` (`createPortal`) rather than inline — nodes/edges are each
their own stacking context in React Flow, so an inline popover could render
underneath a sibling node instead of on top of it; position is computed from
the badge's `getBoundingClientRect()` at open time and the popover closes on
outside-click (not on mouse-leave — a badge-to-popover mouse path crosses a
gap that isn't part of either element's hit box, so mouseleave-based closing
fired before a user could reach the popover to click it). Toggleable via a new
"Overlay ▾" dropdown in the Diagram tab's toolbar
(`src/canvas/OverlayMenu.tsx`), built around an `OverlayLayers` object
(currently just `{ threatBadges: boolean }`) specifically so more overlay
types (e.g. DREAD risk coloring) can be added as another key + checkbox
without restructuring — flagged as a real "view editor" backlog item since the
user asked for this to grow into one. Badge data flows through
`ThreatOverlayContext` (open threats only, grouped by `targetId`) rather than
being embedded in node/edge data, since it's derived/transient and shouldn't
be persisted to the project JSON.

**Canvas toolbar** — `Canvas.tsx` + `canvas.css`. Two-row structure: a
`.canvas-toolbar__row--primary` row (always visible — back button, project
title/rename, view tabs, Export/Save, a ribbon collapse toggle) and a
`.canvas-toolbar__row--ribbon` row below it (tab-specific action palette —
shape buttons + overlay menu on Diagram, Regenerate Threats on Threats tab;
hidden entirely on Table/PASTA since there's nothing to show there). The
ribbon toggle (`ribbonOpen` state, reuses `.canvas-drawer__caret`'s rotation
styling) only renders when `hasRibbon` is true. Every row is `flex-wrap: wrap`
so narrow windows wrap onto additional lines instead of overlapping — this
was a real bug found while testing the packaged installer, not just cosmetic.
`.canvas-toolbar__palette`'s gap went from `0.4rem` to `0.9rem` so adjacent
shape-button groups (each its own glued main-button+caret pill) read as
clearly separate rather than the caret looking like it belongs to the next
group over.

**Editor fundamentals — undo/redo, copy/paste, multi-select** —
`src/canvas/useDiagramHistory.ts` + several `Canvas.tsx` additions. Multi-select
uses React Flow's own built-in behavior (Shift+drag for a box-select,
Ctrl/Cmd+click to add to selection) — now made explicit via `selectionKeyCode`/
`multiSelectionKeyCode` props rather than relying on defaults. Undo/redo
records a full `{nodes, edges}` snapshot via a **debounced watcher** (settles
400ms after `nodes`/`edges` stop changing) rather than instrumenting every
individual mutation call site — this also naturally coalesces a node drag
into one undo step instead of one per pixel. Two ref guards prevent
pollution: `historyInitializedRef` skips the first fire right after project
load, `isRestoringRef` skips the fire that undo/redo's own `setNodes`/
`setEdges` call triggers. Copy/paste is clipboard-in-memory only (`clipboardRef`,
not the OS clipboard) — copies selected nodes plus any edge where *both* ends
are also selected, pastes with new ids and a +40/+40 position offset, selects
the pasted copies. All four (`Ctrl+Z`/`Ctrl+Y`/`Ctrl+C`/`Ctrl+V`) plus
`Delete`/`Backspace` for bulk-delete are wired via one `window` keydown
listener, scoped to the Diagram tab only and skipped entirely while a text
input/textarea/contenteditable is focused (so Inspector fields and project
rename keep native browser undo/typing instead of us intercepting it).
`deleteKeyCode={null}` on `<ReactFlow>` turns off its own built-in delete
handling so our cascade-safe version is the only path. **Bug fixed in the
same pass**: `deleteNodeById` (single delete, used by the Table tab) never
removed edges attached to the deleted node, leaving orphaned edges pointing
at a nonexistent node — now cascades. `deleteSelection` was also rewritten to
handle multiple selected nodes/edges at once (previously only ever deleted
`nodes.find(n => n.selected)`, i.e. the first one). Undo/redo buttons live in
the primary toolbar row, Diagram tab only, disabled when the respective stack
is empty.

**PDF export** — `src/reports/reportTemplate.ts` (`buildReportHtml`, 'summary' or
'detailed' variant, light print-friendly theme) + `src/canvas/ExportMenu.tsx`.
Diagram captured via `html-to-image`'s `toPng` on the `.react-flow` DOM node
(calls `fitView` first, filters out controls/attribution). Rendered to PDF in
`electron/main.js`'s `reports:export-pdf` handler via a hidden `BrowserWindow` +
`webContents.printToPDF`.

**Project management**: rename (double-click name in Canvas toolbar), delete
(Dashboard card, `window.confirm` gate), export/import as raw JSON files
(Dashboard ↓ icon / "Import Project" button).

## Bugs fixed this session (context for why some code looks the way it does)

1. Trust boundary blocked clicks to nodes underneath it → `pointer-events:none !important`
   on the type-based React Flow class, not a custom className (custom classNames
   don't apply retroactively to already-saved nodes; the built-in type-based class
   does, since it's derived from `node.type` which was always present).
2. Edges saved before line-style/marker logic existed rendered with no arrow at all
   → normalize every edge through `edgeVisualProps()` on project load, not just on
   edit.
3. Threats splitter drag felt "reversed and tiny" → root cause was `.threats-layout`
   missing `flex: 1`, so it wasn't filling `.canvas-body`'s width; the drag math was
   correct but referenced a box far narrower than the visible window.

## Release roadmap (agreed with user — work through in this order)

Grouped into batches of related work rather than one flat backlog, per user
request ("lump similar items together in releases"). Each release should get
its own checkpoint(s) before moving to the next, same pacing agreement as
always.

- **Release 0 — Source control** ✅ done this session. See "Git repo, pushed
  to GitHub" above.
- **Release 1 — Editor usability fundamentals** ✅ done and verified. See
  "Editor fundamentals" above. One bug found during verification and fixed:
  undo required two presses to actually go back a step (first press was a
  no-op). Root cause: `record()` was pushing the *new* post-change state onto
  the undo stack instead of the state from before the change, so the first
  undo just restored what was already showing. Fixed by having
  `useDiagramHistory` track its own "current settled state" internally
  (`currentRef`) — `record()` now pushes the *previous* current onto the
  stack before updating current to the new state, and `undo()`/`redo()` no
  longer take the caller's state as a parameter at all (removes the
  opportunity for caller/hook state to disagree). Also added a `reset()`
  method so project-load establishes the baseline without polluting the undo
  stack with an initial no-op entry.
- **Release 2 — Existing backlog cleanup** (the 8 items below this section):
  MS-TMT-parity dialogs, DREAD overlay coloring, threat screenshot,
  parallel-edge polish, ribbon design pass, resizable-panel verification. All
  small and mostly independent — good for quickly clearing debt.
- **Release 3 — Data model depth**: data classification/type tags on data
  flows (currently only Data Store nodes have this), richer
  auth/protocol-mechanism fields (OAuth2/SAML/mTLS/JWT/API-key instead of a
  bare boolean). Extends the existing attribute system — no new subsystems —
  and directly sharpens STRIDE/DREAD output. Biggest bang-for-buck per the
  user's "professional security staff" ask.
- **Release 4 — Threat intelligence grounding**: CAPEC/CWE IDs cited on
  generated threats, mitigation mapping to control frameworks (OWASP ASVS,
  NIST 800-53, CIS). Bigger lift — needs a curated reference dataset — makes
  more sense once Release 3's richer attributes exist to map from.
- **Release 5 — Diagram scalability**: drill-down/sub-diagrams (context
  diagram expanding into per-service detail), auto-layout (dagre/elkjs "tidy
  up" button). Do after Release 1's editing fundamentals are solid.
- **Release 6 — SDLC integration**: threat model versioning/diffing between
  saves, risk-acceptance sign-off (who/when/review-by date, not just a status
  + freeform note), push open threats to Jira/GitHub Issues as tracked work.
- **Release 7 — Stretch** (original Phase 7 ideas, still valid): custom
  user-defined STRIDE rules, IaC import (Terraform/CloudFormation →
  diagram elements), "crown jewel" asset tagging for risk prioritization.

## Backlog (explicitly deferred, in rough priority order per most recent conversation)

1. **[Awaiting verification]** Resizable panels (still never explicitly
   confirmed by the user — later work was tested instead and this got carried
   forward) — checkpoint was: drag the Threats splitter/Inspector width/drawer
   height.
2. **Threat diagram screenshot** — in the Threats detail panel, show a focused
   screenshot/crop of the diagram at the threat's target element/flow location.
3. **View editor** — `OverlayMenu.tsx`/`OverlayLayers` (see "Threat overlay on
   canvas" above) was deliberately built as an extensible list of toggleable
   diagram overlays, not a one-off. Next candidate layer: DREAD risk-level
   coloring on nodes/edges (reusing `dreadEngine.ts`'s risk-level logic,
   similar to the threat-count badges but colored by risk tier instead).
4. **Parallel-edge endpoint visual polish** — the fan-out fix (done, see below)
   separates overlapping edges but the user flagged the endpoint spacing as
   still visually crowded on nodes with many connections; lower-priority
   design pass, not a functional bug.
5. **Threat Model Info dialog** — project metadata form (Name, Owner,
   Contributors, Reviewer, High-Level System Description, Assumptions, External
   Dependencies, Title, Version), mirroring MS TMT's File menu.
6. **Messages dialog** — rule-engine diagnostics/warnings/inconsistencies (MS TMT's
   View menu).
7. **Notes dialog** — freeform discussion comments, explicitly not counted in
   threat analysis (MS TMT's View menu).
8. **Ribbon toolbar visual design/organization pass** — the two-row
   collapsible ribbon (see "Canvas toolbar" above) fixed the functional
   problems (spacing, narrow-window overlap, collapsibility), but the user
   feels it could still be better organized/designed to make controls easier
   to find at a glance — grouping, icons, section labels/dividers, visual
   hierarchy between the shape palette and overlay menu, etc. Pure design
   polish, not a functional bug.

Done this session (context for why the code looks the way it does):
- **DREAD auto-scoring** and **Full MS-TMT attribute schema** — see "What's
  built" above. Scope was explicitly confirmed with the user first (full
  schema incl. conditional sub-types, layered on top of the existing catalog,
  STRIDE/DREAD wiring in the same pass — all in one go, not split into smaller
  chunks as originally recommended).
- **Separate overlapping parallel edges** — `src/canvas/floating.ts` /
  `src/canvas/FloatingEdge.tsx` now fan out siblings sharing a source+target
  pair (curved offset + shifted boundary endpoints) instead of stacking
  exactly on top of each other. While fixing this, found and fixed a real bug
  in `Canvas.tsx`'s `onConnect`: it used React Flow's `addEdge()` utility,
  which silently drops a new connection if one already exists with the same
  source/target/handle combo — meant dragging a 3rd+ connection between the
  same two nodes (or reconnecting via the same handle pair) just did nothing.
  Fixed by appending the edge directly instead of going through `addEdge()`.
- **Threat overlay on canvas** — see "What's built" above.
- **PASTA guided workflow** — `src/pasta/PastaWorkflow.tsx` +
  `src/pasta/pastaDefaults.ts`. New `pasta` field on `Project`
  (`src/types/project.ts`), gated tab in `Canvas.tsx` shown only when
  `project.frameworks.pasta`. 7-stage stepper (Objectives → Technical Scope →
  App Decomposition → Threat Analysis → Vulnerability Analysis → Attack
  Modeling → Risk/Impact Analysis); stages 3/4/7 show a live read-only summary
  pulled from the actual diagram/STRIDE threats/DREAD scores, the rest are
  freeform text fields. Scoped with the user first (wizard shell + all 7
  stages this pass, not stages 1-2 only; auto-pull from existing data where it
  fits; defaults I designed rather than a user-supplied field list). No
  per-project framework toggle exists yet — a project must have been *created*
  with PASTA checked in the wizard to see the tab; there's no way to enable it
  retroactively (same limitation applies to DREAD's scoring section).
- **Installer packaging finally verified** — `npm run electron:build` had
  never been run before this session. First two attempts failed identically
  with `EPERM: operation not permitted, rename ...win-unpacked.tmp ->
  ...win-unpacked` during Electron binary extraction — root cause is almost
  certainly OneDrive sync (this project lives under
  `...\OneDrive\Desktop\ThreatModeling`) locking files mid-extraction; Windows
  Defender real-time scanning is a plausible secondary contributor. **Fix**:
  changed `package.json`'s `build.directories.output` from the relative
  `"release"` (inside the OneDrive-synced tree) to the absolute path
  `C:\Users\harbi\ThreatModeling-builds` (outside it). Third attempt succeeded
  end-to-end and produced `ThreatModeler Setup 0.0.0.exe` in that folder. Note
  for whoever runs this next: the installer is **unsigned** (no
  `certificateFile`/`win.certificateSubjectName` configured) — Windows
  SmartScreen will show an "unrecognized publisher" warning on first run,
  which is expected for a hobby/portfolio build, not a bug. If this project is
  ever moved out of the OneDrive-synced folder, the output path could be
  reverted to a relative `"release"` directory again.
- **Fixed a real production-only bug + rebranded to "Threat Modeler"** —
  installing and running that first successful build showed a blank white
  window with `net::ERR_FILE_NOT_FOUND` console errors for the JS/CSS
  bundles. Root cause: Vite's default `base: '/'` emits root-absolute asset
  paths in `dist/index.html`, which resolve against the filesystem root
  (not the dist folder) when loaded via Electron's `file://` protocol in
  `main.js`'s `loadFile()` — works fine in dev mode only because the Vite dev
  server serves from an actual root. Fixed with `base: './'` in
  `vite.config.ts`. Same session, user provided a brand guide and asked to
  rename the app to "Threat Modeler": updated `productName`/window
  title/installer filename, swapped the theme's accent/danger/muted-text CSS
  variables (and every hardcoded rgba duplicate of the old teal accent — see
  `index.css` and the several `canvas`/`Dashboard`/`Inspector`/`ThreatsPanel`
  CSS files) to the brand palette, self-hosted Inter via `@fontsource/inter`,
  added a wordmark + icon to the Dashboard header, and generated a matching
  `build/icon.ico` (one-off `sharp`+`to-ico` script, run once then removed —
  the generated `.ico` is committed, the generator script isn't) since the
  installer was previously using Electron's default icon. The icon is my own
  approximation of the user's brand-guide screenshot (hexagon/shield/dots),
  not an exact reproduction — no actual vector/icon export files were
  provided. Swap in real assets if/when available.
- **Toolbar redesign** — see "Canvas toolbar" above. Resolves three related
  backlog items at once (spacing, collapsible ribbon, narrow-window overlap).

## Original phased roadmap, for orientation

Phase 0 (foundations), Phase 1 (app shell), and Phase 2 (diagram canvas) —
done, Phase 2 substantially extended beyond original scope (color, floating
edges, table view, threat overlay). Phase 3 (STRIDE + DREAD rule engine) —
done. Phase 4 (PASTA + doc templates) — PASTA done; standalone doc templates
(Threat Model Info/Messages/Notes dialogs) still backlog items. Phase 5
(reporting) — done (PDF export), docx export explicitly deferred ("both,
eventually" — PDF first). Phase 6 (installer) — done, see "Installer packaging
finally verified" above. Phase 7
(stretch: custom rules, IaC import, collaboration) — not started.

## Working agreements established this session (please keep following these)

- **Pacing**: user is credit-conscious. Checkpoint after each meaningful chunk —
  typecheck, relaunch, describe what to test, wait for confirmation — rather than
  batching many unverified changes. This has repeatedly caught real bugs.
- **Before big/novel features**: ask for scope/priority rather than assuming
  (this pattern caught the DSL-vs-grid ambiguity on the text editor, and the
  toolbar-redesign direction earlier).
- **When something looks broken after a fix**: check whether it's a data
  migration issue first (old saved JSON missing new fields) before assuming the
  fix itself is wrong — this has been the actual root cause twice now.
- User tests by looking at the real Electron window and pasting screenshots back
  — there's no automated UI testing in this project.
