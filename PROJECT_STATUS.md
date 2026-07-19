# Threat Modeler — Status Handoff

Written as a resume point at the end of a work session (either before context
compaction or before the user steps away for the day). If you're a fresh Claude
Code session reading this: the user wants to keep building this app. Read this
whole file before touching code — it captures decisions and gotchas that aren't
obvious from the code alone.

## Resume here (updated end of this session)

1. **Release 8 — Diagram Scalability — done and fully verified, both
   parts.** See "Sub-diagrams (Release 8, part 1)" and "Auto-layout
   (Release 8, part 2)" under "What's built" below for the full writeups.
   Highlights:
   - **Part 1, sub-diagrams (DFD leveling)**: Process nodes only (Data
     Stores/External Entities/Trust Boundaries/Mitigations are terminal in
     DFD methodology) can drill into a nested sub-diagram via a new
     Inspector button, with a breadcrumb strip for navigating back up.
     Threats/DREAD/undo history are scoped per level — explicitly no
     rollup into the parent, per user scope decision. A top-left canvas
     badge (gray, or tiered amber/coral/red if there are open threats
     inside) shows which Process nodes own one and jumps straight in on
     click; deleting a Process that owns a sub-diagram now warns first,
     both added after initial live testing.
   - **Part 2, auto-layout**: a "Tidy up" ribbon button reflows
     Process/Data Store/External Entity/Mitigation nodes top-to-bottom via
     `dagre`, based on their actual flow edges. Trust boundaries are
     handled as dagre *compound* (cluster) parents rather than ordinary
     nodes — since they represent spatial containment, not flow
     connectivity, which is what dagre lays out by — so a boundary always
     resizes to still fully enclose whatever ends up inside it after a
     reflow, instead of nodes drifting outside their zone.
2. **Next up: Release 9 — SDLC integration.** Threat model
   versioning/diffing between saves (capped revision history, restore),
   risk-acceptance sign-off (who/when/review-by date, not just a status +
   freeform note), and pushing open threats to Jira/GitHub Issues as
   tracked work. See "Release roadmap" below.
   - A new **Release 10 — Reporting & Risk Register Enhancements** was
     scoped (not built) this session after the user asked for a "review
     everything as a professional risk assessor" pass: inherent-vs-
     residual DREAD scores, sub-diagrams included in PDF export with a
     header per level, a Threats risk-register table view, CSV export,
     compliance/DREAD-risk filters on the Threats tab, and standalone
     diagram PNG/SVG export. Inserted between the existing Release 9 and
     the stretch release, which is renumbered to Release 11 as a result —
     see "Release roadmap" for the full scoping notes, including one real
     implementation wrinkle already flagged (sub-diagram PDF capture needs
     to drive the Release 8 navigation functions programmatically, since
     only one level's diagram DOM is ever mounted at a time).
3. One unrelated bug reported during this session, logged but **not yet
   fixed** per explicit user request (backlog only): `ColorSwatchPicker.tsx`'s
   "Recent" custom colors all show the same color instead of a history of
   distinct ones after a single custom pick. Root cause not confirmed — the
   likely culprit is `<input type="color">`'s `onChange` (which React maps to
   the native `input` event, firing continuously during a live drag in the
   OS color picker) calling `addRecentColor()` many times per pick, but
   `color.ts`'s dedup logic looks correct in isolation on a static read, so
   this needs interactive debugging before a fix, not a guess. See Backlog
   below.
4. Releases 6 (mitigation elements) and 7 (threat intelligence grounding)
   are done and fully verified — see "What's built" below for the full
   writeups, not repeated here now that Release 8 is the latest work.
5. Two more items came in from Release 3 testing and were folded into the
   roadmap rather than built immediately: an unsaved-changes guard (warn
   before navigating away from an edited-but-unsaved diagram) — Backlog
   item 1 below, small and a real data-safety gap — and a capped
   version-history/rollback feature, which landed in Release 9 (SDLC
   integration) since it already covered related ground
   ("versioning/diffing between saves"). Neither has been started.
6. Two small backlog items remain from earlier sessions, both low priority,
   neither blocking: trust boundary shape editing *after* creation
   (currently creation-time only), and further parallel-edge endpoint
   visual polish. See Backlog below.
7. Everything is committed and pushed to
   `https://github.com/harbinscott/ThreatModeler` (`main` branch) as of the
   end of this session.

## What this is

"Threat Modeler" — a Windows desktop threat-modeling tool (Electron + React +
TypeScript), inspired by Microsoft's Threat Modeling Tool and OWASP Threat
Dragon, unifying STRIDE (diagram-driven auto threat generation), DREAD (risk
scoring), and PASTA (guided 7-stage business-risk workflow) as layered views of
the same threat model rather than mutually exclusive picks. All three
frameworks are fully built — see "What's built" below. Built as a
learning/portfolio project — competitive landscape doesn't drive scope
decisions, the user's actual requests do.

Named and branded this session (user supplied a brand guide): navy/blue/red
palette, Inter font, hexagon-shield icon (see "Fixed a real production-only
bug + rebranded to 'Threat Modeler'" below for the full rebrand writeup).

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
- `electron-builder` configured for Windows NSIS installer — **working**, see
  "Installer packaging finally verified" below. Icon at `app/build/icon.ico`.
- `@tabler/icons-react` for toolbar icons, `@fontsource/inter` for the brand
  font — both self-hosted, no CDN dependency at runtime.

## Data model — `src/types/project.ts` (current shape, abbreviated)

```
Project { id, name, description, frameworks{stride,dread,pasta}, diagram{nodes,edges},
  threats[], pasta?, info?{owner,contributors,reviewer,assumptions,externalDependencies},
  notes?, customStencils?[], createdAt, updatedAt }
DiagramNodeData { label, elementType('process'|'external-entity'|'data-store'|'trust-boundary'|
  'mitigation'), description?, componentType?, attributes?,
  colors?{fill,border,text}, boundaryShape?('rectangle'|'circle'|'cloud', trust-boundary only),
  boundaryType?(trust-boundary only), customFields?[], hiddenFieldKeys?[],
  complianceTags?[]('PII'|'PHI'|'PCI'|'GDPR'|'SOX'|'SOC2'|'CMMC'), pciScope?('Connected'|'CDE'),
  complianceNotes?, mitigationAutoAttach?(mitigation only, default true) }
DiagramEdgeData { label?, lineStyle?, arrowStyle?, color?, attributes?, customFields?[], hiddenFieldKeys?[],
  complianceTags?[], pciScope?, complianceNotes? }
CustomStencil { id, name, elementType, defaults?, customFields?[], hiddenFieldKeys?[] } — see stencils.ts
CustomFieldDef { key, label, type('text'|'boolean'|'select'), options? }
Threat { id, ruleId, targetType, targetId, targetLabel, componentType?, category(S/T/R/I/D/E),
  title, description, status, source, notes?, dread?{damage,reproducibility,exploitability,
  affectedUsers,discoverability}, dreadBreakdown?[{key,label,amount}], dreadNeedsReview?, createdAt }
```
`attributes` on both nodes and edges holds the full MS-TMT security schema
(`src/canvas/mstmAttributes.ts`) — see "MS-TMT security attributes" below.
DREAD scoring, PASTA, Threat Model Info, and Notes are all fully built —
nothing in this data model is aspirational/unused at this point.

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

**Element & property system (Release 3)** — replaces the old two-selector
setup described in "MS-TMT security attributes" above (that section's
content is now partially superseded — the schema itself is still mostly the
same, but the picker UX changed). `src/canvas/stencils.ts` is the new single
source of truth: `BUILT_IN_STENCILS`, condensed from the Microsoft Threat
Modeling Tool's SDL TM Knowledge Base export the user supplied
(`microsoft_tmt_elements.json`) — dead tech dropped (ActiveX/BHO), OS-
internals-only stencils dropped (Kernel Thread, Thread, OS Process), Windows
Store's 14 capability checkboxes generalized into ~4 vendor-neutral
device-permission fields (`mstmAttributes.ts`). One `Type` combobox per
element in `Inspector.tsx` replaces the old componentType-combobox +
separate MS-TMT-subtype-select pair; picking a stencil applies its
`defaults` into `attributes` (only into currently-empty keys, never
clobbering something the user already set) and its `customFields` (the
old catalog's Protocol/Port/etc. fields are now stencil `customFields`
rather than a separate system). `processType`/`storeType`/`interactorType`
are no longer their own visible fields — stencil selection sets them
silently as part of `defaults`, still driving the existing `when()`
conditional-field logic in `mstmAttributes.ts` unchanged. New capabilities:
per-instance custom properties (`DiagramNodeData.customFields`, text/
boolean/select, added via a small inline form in the Security Properties
section), per-instance field hiding (`hiddenFieldKeys`, restorable via a
chip), and "Save as custom element" which promotes a customized node's
current field values + custom fields into a `Project.customStencils` entry
— selectable from the Type picker (tagged "· Custom") and the toolbar/table
shape-button flyouts from then on. Data flows gained a `protocol` field
(`DATA_FLOW_PROTOCOL_OPTIONS`/`DATA_FLOW_PROTOCOL_DEFAULTS` in
`mstmAttributes.ts`) that cascades auth/confidentiality/integrity defaults
the same way node stencils do, and the old 5 payload-type booleans (XML/
SOAP/REST/RSS/JSON) collapsed into one `payloadFormat` select. Data
classification (`Public`/`Internal`/`Confidential`/`Restricted`) was
promoted from a catalog-only field (previously only on 2 of ~11 possible
data-store presets) to a shared field on every data store — closes a real
gap, since `ruleEngine.ts` already keyed Information Disclosure severity off
it. Trust boundaries gained a `boundaryType` field (Internet/CorpNet/
Sandbox/Kernel/Cloud Tenant boundary), independent of the existing
`boundaryShape` (visual) field. `componentCatalog.ts` was deleted —
fully superseded, nothing imports it anymore.

**Trust boundary awareness & zone-qualified flows (Release 4)** —
`src/canvas/boundaryGeometry.ts` extracts the point-in-rect containment math
`ruleEngine.ts` already had (`nodeRect`/`containingBoundaries`, private
before this) into a shared module: `containingBoundaries()` (every boundary
whose rect contains a node's center, for STRIDE crossing detection) and new
`innermostBoundary()` (the single smallest/most-specific one, for a "which
zone is this in" display when boundaries nest). `ruleEngine.ts` now imports
from there instead of keeping its own copy. `src/canvas/elementLabels.ts`
adds `disambiguateLabels(nodes)` — a node-id -> display-label map that
appends " (1)"/" (2)" only when two nodes share an exact label, without ever
touching the stored `data.label` (two same-named elements in different
zones are legitimately distinct). `ElementsTable.tsx` wires both in: the
Elements sub-tab shows an amber "Zone" chip per row (containing boundary's
name, or "No zone"; hidden entirely when the diagram has no boundaries at
all), and the Flows sub-tab's row label changed from a bare
`source → target` (which a custom edge label previously replaced entirely,
hiding the path) to always showing the structural path —
`Zone · Source  →  Zone · Target` (arrow glyph reflects one-way/two-way/
none) — with the custom label, if any, moved to the secondary line
alongside line-style/arrow-direction instead of overwriting the path.
Creating a flow gained zone-aware Source/Target pickers: when the diagram
has boundaries, each side gets a zone select ("All zones"/"No zone"/each
boundary) that filters the element select below it, plus every element
option is prefixed with its own zone regardless of filter — needed once a
diagram has two same-typed elements in different zones (e.g. two
"Web Server"s), since a flat alphabetical list made them indistinguishable
even with the "(1)"/"(2)" suffix. Diagrams with zero boundaries keep the
original single-row Source/Target-only form, no extra clutter. **Added
mid-release from live testing** (user: "the user should be able to edit
existing flows too"): each flow row now has a ✎ button that opens the same
zoned picker pre-filled with the connection's current source/target/zones,
submit label switches to "Save", and it calls a new
`changeFlowEndpoints(edgeId, sourceId, targetId)` in `Canvas.tsx` (mirrors
`reverseEdge`'s pattern, also clears `sourceHandle`/`targetHandle` since
those referenced the old nodes) — rewires the connection in place, leaving
color/line-style/arrow-direction/custom-label untouched. The add-flow and
edit-flow forms share one set of form state in `ElementsTable.tsx`
(`editingEdgeId` flag distinguishes which `onAddFlow`/`onEditFlow` callback
fires on submit) rather than being two separate components.

**Compliance tagging (Release 5)** — `src/canvas/complianceTags.ts` is the
new module. `ComplianceTag` = PII/PHI/PCI/GDPR/SOX/SOC2/CMMC
(`types/project.ts`), assignable via a new "Compliance & data
classification" Inspector section (`Inspector.tsx`) on Data Store nodes and
Data Flow edges only (not every element type — matches where the user's
original ask was scoped). PCI gets its own `PciScope` sub-field
(`'Connected' | 'CDE'`) instead of a plain checkbox — deliberately *not* a
generic numeric "Tier 1-4" system, and deliberately not extended to the
other six tags either: PCI's Connected/CDE mirrors real cardholder-data-
environment segmentation practice, but CMMC already uses "Level 1-3" for a
completely different concept (org maturity, not asset scope), and none of
the other frameworks have an equivalent asset-tiering convention — a
lookalike generic tier risked someone citing it as if it were the
framework's real scoping language. This was an explicit user sanity-check
("would this cause issues in an actual audit") that the answer was no for
PCI specifically and yes for a generic version, so only PCI got the
sub-field.

Propagation: `computeEffectiveComplianceTags(diagram)` is a same-zone
flood-fill over `Diagram['edges']` — a tag spreads from a directly-tagged
element to everything reachable via a flow *within the same trust
boundary*, using the same `innermostBoundary()` zone-equality check Release
4 built; crossing a boundary stops it. `computeEffectivePciScope(diagram)`
is a second, separate flood-fill specifically for the Connected/CDE
distinction: only a directly-marked element stays `CDE`, everything it
reaches becomes `Connected`, and a `Connected` is never upgraded back to
`CDE` by proximity — this two-tier propagation was missing in the first
pass (everything downstream just read as generic "PCI" with no scope
distinction) and was a real gap the user caught, not a style preference.
Both functions share a `makeZoneResolver()` helper to avoid the zone logic
drifting between them.

Surfacing: a new "Compliance tags" checkbox in the Overlay menu
(`OverlayMenu.tsx`) gates a canvas badge (`ComplianceBadge.tsx` — small
colored chips, bottom-left corner of the node, opposite `ThreatBadge`'s
top-right so the two never collide; PCI's chip tooltip includes
Connected/CDE). `ThreatOverlayContext` carries `complianceTagsByTarget` and
`pciScopeByTarget` alongside the existing threat/risk-color maps. **Added
after initial testing**: the Threats tab wasn't showing tags at all — the
overlay toggle only ever gated the *canvas* badge, so `complianceTagsByTarget`
is now always computed in `Canvas.tsx` regardless of that toggle, and a
separate always-on copy is threaded into `ThreatsPanel.tsx` (small colored
dots per list row, full chips with tag names in the detail panel) — the
toggle still only controls whether the diagram itself shows the badge.

Feeds `ruleEngine.ts`: compliance-tagged Data Store/Data Flow threats get a
sentence naming the applicable regulations (PCI shows its Connected/CDE
sub-scope inline), and a new per-element freeform `complianceNotes` field
(Inspector textarea, only shown once a tag is set) gets appended verbatim —
e.g. "Tier 2 PCI asset, processes card data — additional review required."
Notes are *not* propagated — they're specific to the element the user
actually wrote them on, not copied onto everything downstream. Feeds
`dreadEngine.ts`: a flat damage/affected-users bump on Information
Disclosure, Tampering, **and Repudiation** — Repudiation was added after
the user caught a real gap live-testing (a heavily-tagged asset was scoring
"default" on Repudiation): SOX and CMMC are fundamentally about
audit-trail/accountability, so that category needed the same treatment.
Spoofing/DoS/Elevation-of-Privilege deliberately do **not** get a
compliance bump — no clean, statable rationale connects compliance scope to
those specifically, and an unexplainable blanket bump across every category
would be worse than a narrower, justified one (this was another explicit
user sanity-check point).

DREAD explainability: `dreadEngine.ts` was refactored so
`attributeAdjustments`'s old "just sum the deltas" approach became
`DreadContribution[]` — labeled `{key, label, amount}` entries (base score,
trust-boundary-crossing, high-priority flag, each MS-TMT attribute
condition, compliance scope), with `explainDreadScore(threat, diagram)`
returning the full list and `suggestDreadScore` just summing it per key
(verified numerically equivalent to the old sequential-clamp approach,
since every delta in this codebase is a positive addition — clamping once
at the end vs. clamping after each step produces the same result). Powers a
single "Why these scores?" hover button next to the DREAD header in
`ThreatsPanel.tsx` (`DreadScoreExplain`) showing all 5 fields' breakdowns
grouped in one card — **user explicitly preferred this over the first pass**,
which had 5 separate per-field ⓘ icons; consolidated into one after
feedback. The contribution-list shape already supports negative amounts
(nothing currently produces one), so a future mitigation element (Release
6) lowering a score — e.g. "-2 exploitability: WAF present" — should slot
into this same architecture without another refactor.

**Explicitly not built, after an explicit user sanity-check request**:
auto-finalizing DREAD scores without a human touching them (`dreadNeedsReview`
stays the gate — DREAD is a judgment exercise, and a real audit reviewer
seeing every score was silently algorithm-generated undermines the point of
doing risk assessment at all); a generic compliance-wide numeric tier system
across all 7 tags (see PCI reasoning above); and inferring DREAD adjustments
from the freeform compliance-note text (unreliable text-parsing dressed up
as scoring logic — the note is descriptive context for a human reader, not
a machine-readable signal).

**DREAD breakdown persistence fix (4th refinement round)** — the live
"Why these scores?" hover from the round above had a real bug: it called
`explainDreadScore(threat, diagram)` fresh every time it opened, against
whatever the diagram looks like *right now*. A threat's `dread` score,
though, is frozen the first time it's generated and never touched again
(`Canvas.tsx`'s `handleRegenerateThreats`) — so once compliance tags got
added to an element *after* one of its threats already existed, the hover
started explaining a newer diagram state than the one that actually
produced the still-displayed number (user caught this exactly: hover said
Damage should be 6, the field said 4). Fixed properly, not papered over:
`DreadContribution` moved from `dreadEngine.ts` into `types/project.ts`
(alongside `DreadScore`, which it's a breakdown of — avoids a circular
import since `dreadEngine.ts` already imports types from there), and
`Threat` gained `dreadBreakdown?: DreadContribution[]`, computed and frozen
in the same spot `dread` itself is. Also tightened *when* the freeze
happens, which was arguably a latent bug of its own: the old condition was
`t.dread ? t : {recompute}` — meaning a score locked in permanently the
instant it was first suggested, even if nobody had ever looked at it. New
condition is `t.dread && !t.dreadNeedsReview ? t : {recompute}` — a
still-unreviewed suggestion keeps refreshing (score *and* breakdown
together) on every Regenerate Threats until a human actually edits a field
via `changeThreatDread` (which already cleared `dreadNeedsReview`, unchanged),
at which point it's frozen for good exactly as before. `ThreatsPanel.tsx`
now reads `selected.dreadBreakdown` directly instead of calling
`explainDreadScore` live — dropped its now-unnecessary `diagram` prop
entirely. Also extended `ruleEngine.ts`'s `complianceNote()` calls to cover
every category the DREAD engine actually bumps for compliance scope
(Tampering on data stores/flows, Repudiation on processes/external
entities) — found via the same investigation, since the description text
had only ever been wired up for Information Disclosure even after
Repudiation's *score* got the compliance treatment in the round before.

**Sub-diagrams (Release 8, part 1)** — DFD leveling: a Process node can drill
into its own nested diagram. New `SubDiagram` type (`types/project.ts`,
`{id, diagram, threats}`) and `Project.subDiagrams?: Record<string,
SubDiagram>` — stored *flat*, keyed by id, not nested inside the owning
node, so arbitrary depth/tree shape doesn't need recursive typing and
navigating levels is a map lookup rather than a tree walk. New
`DiagramNodeData.subDiagramId?` (Process only — Data Stores/External
Entities/Trust Boundaries/Mitigations are terminal in DFD methodology, so
the "Open sub-diagram" Inspector button is gated on `elementType ===
'process'`).

`src/canvas/subDiagrams.ts`: `readLevel(project, subDiagramId)` /
`writeLevel(project, subDiagramId, nodes, edges, threats)` — the two pure
functions everything else is built on. Canvas.tsx's live `nodes`/`edges`/
`threats` state always represents *whichever level is currently active*
(top or nested); a `breadcrumb: {id, label}[]` state array tracks the path
down from the top level (empty = top level). Every navigation function
(`drillIntoSubDiagram`, `navigateToLevel`/`goToTopLevel`/
`goToBreadcrumbIndex`) follows the same shape: commit the level being left
via `writeLevel` first, *then* load the target level via a new
`loadLevelIntoState()` helper — getting this ordering backwards (patching
a node's `subDiagramId` via `updateNode` and reading the `nodes` state
variable in the same call) would silently commit the pre-patch array, since
React state updates aren't synchronous; `drillIntoSubDiagram` builds the
patched array explicitly rather than relying on `updateNode` + immediate
reread. `removeSubDiagramSubtree()` walks a sub-diagram's own Process nodes
for further-nested `subDiagramId`s recursively, so deleting an owning node
cleans up the whole subtree instead of leaving orphaned `project.subDiagrams`
entries.

Undo/redo (`useDiagramHistory`) resets at every level boundary
(`loadLevelIntoState` calls `history.reset()` synchronously off the
just-loaded arrays, with `isRestoringRef` suppressing the debounced-record
effect from immediately overwriting that reset) — necessary, not just
tidy: without it, undoing after switching levels would restore a *different
level's* nodes/edges into the current view, since the old stack still held
snapshots from whatever level was active when they were recorded. `handleSave`
commits the current level into the project object before sending it to
`window.api.saveProject`, so every level (not just whichever one you're
looking at) is written together in one save.

**Deliberately no rollup**, per explicit user scope decision: threats/DREAD
scores/undo history are scoped to whichever level generated them, never
merged into the parent's Threats tab or PDF export. **Known limitation**:
exporting a PDF from the top level won't include sub-diagram detail —
consistent with the no-rollup decision, not a bug, but worth remembering if
it ever needs revisiting.

Two additions after initial live testing (user: "that looks good" on the
core navigation, then two follow-up asks): a **visual indicator** —
`SubDiagramBadge.tsx`, top-left corner of a Process node (the one spot
`ThreatBadge`'s top-right and `ComplianceBadge`'s bottom-left leave free),
gray by default or tiered amber/coral/red (via `ThreatBadge.tsx`'s
`tierColor()`, exported for reuse) when the sub-diagram has open threats —
clicking it drills straight in via a new `onOpenSubDiagram` callback added
to `ThreatOverlayContext` alongside the existing `onViewThreat`, and a
`subDiagramOpenThreatCountByTarget` map computed in `Canvas.tsx` (present
as a key only for Process nodes that own a sub-diagram, so "badge shows at
all" is `map.has(id)`, not `count > 0`, letting a sub-diagram with zero
open threats still show the neutral badge). And a **delete confirmation** —
`deleteNodeById` and `deleteSelection` in `Canvas.tsx` now call
`window.confirm()` before deleting a Process that owns a sub-diagram,
warning that the nested sub-diagram will be permanently deleted too, and
abort the whole delete if the user cancels — a real data-safety gap the
user caught before it bit anyone, same category of fix as Release 3's
unsaved-changes-guard backlog item.

**Auto-layout (Release 8, part 2)** — `src/canvas/autoLayout.ts`,
`autoLayoutDiagram(diagram)`, wired to a new "Tidy up" button in the
Diagram tab ribbon (`handleTidyUp()` in `Canvas.tsx`, disabled when there
are no non-boundary nodes). Uses `dagre` (added as a dependency) for a
top-to-bottom layered layout based on the diagram's actual flow edges.
Trust boundaries have no edges of their own — they represent spatial
containment, not flow connectivity, which is what dagre lays out by — so
naively treating them as ordinary nodes would place them disconnected from
everything, and leaving them fixed while their contents move would let
nodes drift outside the boundary they're supposed to be in. Instead each
boundary becomes a dagre *compound* (cluster) parent (`g.setParent()`) for
whatever's inside it (via the same `innermostBoundary()` helper
`ruleEngine.ts` already uses for crossing detection), and dagre computes
each cluster's own bounding box from its children — so a reflow always
leaves a boundary correctly enclosing its members, growing/shrinking/
repositioning as needed rather than staying at its old size. One undo step
(picked up by the existing debounced undo recorder, no special-casing
needed).

**Threat intelligence grounding (Release 7)** — new
`src/threats/threatIntel.ts`, two pure/unpersisted functions (same "derived,
not stored" posture as the threat-overlay badges — nothing here is written
to the project JSON). `citationsForThreat(threat)`: a curated `Record<
StrideCategory, Citation[]>` base (1 CWE + 1 CAPEC per category, e.g.
Spoofing -> CWE-287 Improper Authentication + CAPEC-151 Identity Spoofing),
plus `extraCitations()` layering on more specific ones when the threat's own
`ruleId`/`description` already signal a pattern — reusing the exact same
signals `dreadEngine.ts`'s `contextContributions()` checks
(`ruleId.includes('boundary')` -> CWE-319 + CAPEC-94 AiTM,
`description.includes('high priority')` -> CWE-311, "credential" mentioned
-> CWE-522, a mitigation's own threat -> CWE-693 Protection Mechanism
Failure) rather than inventing a parallel classification scheme.
`controlsForMitigationType(mitigationType)`: a small `Record<string,
ControlRef[]>` keyed by the mitigation stencil type (Firewall/WAF/IDS-IPS)
-> the control-framework requirements that type typically helps satisfy.
Deliberately coarse (per stencil type, not per-configuration) and
deliberately not forced onto every framework for every type — OWASP ASVS is
an application-layer standard with no clean mapping for a network
firewall/IDS-IPS, so those two only cite NIST 800-53/CIS Controls, while WAF
(an app-layer control) additionally cites ASVS as a "compensating control"
— same "no clean statable reason, don't force it" rule this app has applied
to DREAD/compliance bumps since Release 5.

Surfaced only in the Threats tab detail panel, per user scope decision
(explicitly not on canvas badges or PDF export in this pass): a
"References" block on every threat (`ThreatsPanel.tsx`, citation chips,
each linking to the actual cwe.mitre.org/capec.mitre.org page), and a
"Compensating controls" block that appears on a mitigation node's own
threats and on any flow whose *source* is a mitigation node — driven by a
new `mitigationTypeByTarget` map computed in `Canvas.tsx` (target id ->
mitigation stencil type, for the node itself and any edge it feeds), thin
and derived like `complianceTagsByTarget`, not a full `diagram` prop passed
back into `ThreatsPanel`.

**Every id was verified live before shipping, not just recalled from
training knowledge** — a deliberate step given this tool's whole premise is
audit-defensibility, and a wrong CAPEC/CWE/NIST/CIS/ASVS id would be worse
than none at all. Fetched all 17 CAPEC/CWE pages and searched for the 5 NIST
800-53 controls, 2 CIS Controls v8 entries, and the OWASP ASVS chapter
during this session; every CAPEC/CWE/NIST/CIS id matched what was already
written. **One real issue found and fixed**: OWASP ASVS renumbered its
chapters between versions — "V5: Validation, Sanitization and Encoding" in
ASVS 4.0 is "V1: Encoding and Sanitization" in the current ASVS 5.0, so the
WAF control entry now cites `OWASP ASVS v5.0`, `V1` explicitly rather than a
bare, now-ambiguous "V5". Both the References and Compensating controls
blocks still carry a visible tooltip disclaimer (curated/verified as of this
session, not a substitute for checking the current publications before
citing in a formal deliverable) since frameworks keep evolving after this
was written.

First outbound links anywhere in the app (the citation chips) — added a
`shell.openExternal` handler via `win.webContents.setWindowOpenHandler()` in
`electron/main.js` so `target="_blank"` links open in the user's actual
browser instead of navigating the Electron window or opening an unstyled
second one; denies the in-app popup unconditionally either way.

**Mitigation elements (Release 6)** — new `mitigation` `ElementType`
(`types/project.ts`), stencils in `stencils.ts` (Generic Mitigation Control,
Firewall, WAF, IDS/IPS — defaults pre-check relevant properties, e.g.
Firewall sets `blocksUnauthorizedTraffic: true`). Security fields
(`mstmAttributes.ts`'s `mitigationSecurityFields()`): `blocksUnauthorized
Traffic`, `inspectsPayload`, `logsTraffic`, `rulesUpToDate` — deliberately no
"terminates TLS" field, since TLS termination splits trust rather than
reducing risk and wouldn't have a clean scoring direction. `Inspector.tsx`
needed **no changes** to show these — `NodeInspector` already reads
`securityFieldsFor(node.data.elementType)` and `stencilsForType(...)`
generically, so a new element type's Type picker and Security Properties
section just work once the type exists.

`MitigationNode.tsx` renders a green hexagon (`clip-path: polygon(...)`) —
**a real bug found and fixed mid-release**: `clip-path` clips *all* painted
content of the element it's on, including overflowing absolutely-positioned
children, not just the element's own box. Putting it directly on the same
div as `FourWayHandles` silently chopped the connection handles off (worst
at the left/right points, where the hexagon narrows to a single vertex),
making the node effectively undraggable-into — user reported this as "auto
attach isn't working" before realizing (correctly) it was actually a
different, not-yet-built feature they were also expecting. Fixed by giving
the hexagon its own `inset:0` absolutely-positioned inner layer, leaving
handles/label/badges as unclipped children of the outer node div — same
split `TrustBoundaryNode.tsx` already used for its own shape layer. The
label (`EditableLabel`, a plain non-positioned `<span>`) needed an explicit
`position:relative; z-index:1` (`.dfd-node--mitigation__label`) since CSS's
default painting order puts non-positioned content *behind* any absolutely-
positioned sibling regardless of DOM order — without it the hexagon's fill
would've painted over the label text.

Auto-attach splicing (`src/canvas/mitigationAttach.ts`,
`attachMitigationToCrossingFlows()`): fires from a new `onNodeDragStop`
handler in `Canvas.tsx` on every drag-stop of a mitigation node (not just
first placement). For each existing edge not already touching the dragged
node, computes the point-to-segment distance from the node's center to the
line between its source/target node centers; any edge within
`ATTACH_THRESHOLD_PX` (40px) is spliced — deliberately *every* matching
edge, not just the closest, so a node dropped where multiple flows
converge/diverge (fan-in/fan-out) absorbs all of them from one drop, per the
roadmap's "including fan-in from multiple sources" requirement. Each spliced
edge is replaced by two new ones (source→mitigation, mitigation→target),
each carrying its own independent copy of the original edge's full `data`
(line style/color/label/attributes/customFields/complianceTags/
complianceNotes) — copied, not shared, so editing one segment's compliance
tags later can't mutate the other's — with visual props recomputed fresh via
`edgeVisualProps()` rather than copied, matching every other edge-creating
function in the codebase. Per-node opt-out:
`DiagramNodeData.mitigationAutoAttach` (default true, i.e. enabled unless
explicitly set `false`), a checkbox in `Inspector.tsx` gated on
`elementType === 'mitigation'` — added after the user asked for an escape
hatch, and its label was shortened to "Auto-Attach Connections" with a new
`.inspector__field--checkbox` row-layout CSS modifier after the first
version (long label stacked above a lone checkbox, the default layout every
other `.inspector__field` uses) looked wrong.

STRIDE (`ruleEngine.ts`): mitigation nodes generate all 6 categories via a
new `mitigationDescription()` — a control is a target in its own right (can
its config be tampered with, can it be knocked offline to fail open, can an
attacker reach its management plane), not just something that protects
other targets. `rulesUpToDate === false` adds a caution sentence to its own
Tampering threat, `logsTraffic === false` to its own Repudiation threat.
Separately, any data-flow edge whose *source* is a mitigation node gets a
contextual sentence on its Tampering threat noting the traffic already
passed through a declared control — phrased as something to verify, not as
"resolved," consistent with never having the tool claim a threat is closed
without human review.

DREAD (`dreadEngine.ts`): two additions, kept conceptually separate.
`attributeContributions()` gained mitigation-specific *penalties* on the
control's own threats (stale rules → +2 exploitability on its Tampering; no
logging → +2 damage on its Repudiation) — same mechanism every other
attribute-driven adjustment already uses. New `mitigationContributions()` is
the first source of **negative** contributions in the app: for an edge
threat whose category is Tampering and whose source node is a mitigation,
`blocksUnauthorizedTraffic`/`inspectsPayload` each subtract from
exploitability/damage — gated on `rulesUpToDate !== false` so a stale
control doesn't get credit for protection it may no longer reliably
provide. Deliberately restricted to Tampering only (not Spoofing/
Information Disclosure/DoS) — same "no clean statable mechanism, so no
blanket bump" bar Release 5's compliance scoring used — and never
suppresses or auto-resolves the threat itself, only lowers the starting
suggestion a human still has to review. The existing sum-all-then-
clamp-once architecture (`suggestDreadScore`) handles negative amounts
correctly by construction — no changes needed there, confirming the
Release 5 note that the `DreadContribution` shape was already built to
support this.

PASTA (`PastaWorkflow.tsx`): stage 3's "From your diagram" summary gained a
"Mitigation controls" row (`decompositionCounts.mitigation`); stages 4/7
needed no changes since they already pull generically from the STRIDE
threats list / DREAD scores rather than being element-type-aware
themselves.

`diagnostics.ts`'s "flow doesn't touch a Process" message was widened to
also accept a mitigation as either endpoint — a flow entirely between, say,
a Data Store and a mitigation is normal now that mitigations exist, and
was a false positive under the original process-only check.

**DREAD risk-level overlay coloring** — second overlay layer (see "Threat
overlay on canvas" below for the first). `OverlayLayers` gained
`dreadRiskColoring`; `ThreatOverlayContext` gained `riskColorByTarget` (target
id -> the color of its *highest* open-threat DREAD risk level, computed in
`Canvas.tsx`). Applied via a new `withRiskRing()` helper in `nodeColor.ts`
that layers a colored `boxShadow` ring on top of whatever fill/border/text
the user already picked, rather than overriding it — risk coloring and
custom node colors coexist. Only nodes get the ring (not edges — a thin line
doesn't show a glow usefully); the checkbox in the Overlay menu is hidden
entirely (not just disabled) when the project doesn't have DREAD enabled,
since the layer is meaningless without DREAD scores.

**Parallel-edge endpoint spacing tuned** — quick follow-up to the fan-out fix;
`ENDPOINT_SPACING` 10→20 and `PARALLEL_SPACING` 28→32 in `FloatingEdge.tsx`
for clearer separation where multiple edges land on a node. User flagged this
as needing more design work beyond just the numbers (see backlog) — this is
a partial improvement, not the full polish pass.

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

**Ribbon toolbar redesign** — icons on every toolbar control
(`@tabler/icons-react`, self-hosted like the Inter font — no CDN dependency),
grouped sections with small uppercase labels ("Add element" / "View") in the
ribbon row, vertical `.canvas-toolbar__divider`s splitting the primary row
into logical clusters (nav → undo/redo → Info/Messages/Notes → Export/Save).
Messages gets a `.canvas-toolbar__badge` count pill plus an amber
`.btn--warning` border when there are warnings to flag. Design was mocked up
and approved by the user (via the visualize tool) before being wired into the
real components — `ShapeButton.tsx` gained an `icon` prop
(`SHAPE_ICONS` map in `Canvas.tsx`: process=circle, external
entity=user-square, data store=database, trust boundary=shield in amber
since it's the one preset-less button). `.btn` base class picked up
`display: inline-flex; align-items: center; gap: 6px` so icon+label
composition works everywhere `.btn` is used, not just the toolbar. **Bug
caught and fixed while touching `.btn--primary`**: its text color was still
hardcoded `#06251f` (dark teal-tinted, meant for the old teal
`--accent-strong`) from before the "Threat Modeler" rebrand — on the new blue
`--accent-strong` background that was barely readable. Changed to `#eaf1fb`.

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

**Threat Model Info / Messages / Notes dialogs** — `src/components/Modal.tsx`
is a new generic portal-based centered dialog (backdrop click / Escape / ×
all close it), reused by all three rather than building three one-off
overlays. `ThreatModelInfoDialog.tsx` edits a new `Project.info` object
(owner/contributors/reviewer/assumptions/externalDependencies) plus the
existing `name` (read-only here, rename via the toolbar) and `description`
fields. `MessagesDialog.tsx` surfaces `src/threats/diagnostics.ts`'s
`getDiagramMessages()` — a handful of structural checks (disconnected
elements, flows that skip a Process, empty trust boundaries, no threats
generated yet) — intentionally simple, not an extensible rule-plugin system.
`NotesDialog.tsx` is a single freeform textarea bound to a new
`Project.notes` string, explicitly not read by the rule engine. All three
launch from new buttons in the toolbar's primary row (`Canvas.tsx`), visible
on every tab since they're project-level, not diagram-specific; edits go
through a new `updateProjectFields()` helper that patches local `project`
state directly (same pattern as `commitRename`) — nothing auto-saves, same as
everywhere else, picked up by the next manual Save.

**Trust boundary resize/reshape + shape presets** — resizing already worked
(React Flow's `NodeResizer`, min 160x120, wired up since early in the
project) — the "can I resize it" half of the ask was already done, just
undocumented. Added *reshape*: new `BoundaryShape = 'rectangle' | 'circle' |
'cloud'` field (`DiagramNodeData.boundaryShape`, `src/types/project.ts`,
optional/undefined = 'rectangle' for backward compat with every existing
saved boundary). `TrustBoundaryNode.tsx` now renders an inner absolutely-
positioned shape element instead of drawing the border directly on the node
div — a plain div with `border-radius: 50%` for circle, or an SVG
(`viewBox="0 0 64 48"`, `preserveAspectRatio="none"` so it stretches to fill
on resize like the other shapes) with a hand-drawn single-path cloud outline
for cloud. The cloud path was mocked up and approved via the visualize tool
before being ported into the component — no overlapping shapes/seams, one
continuous dashed stroke. New `src/canvas/TrustBoundaryButton.tsx` replaces
the plain trust-boundary `ShapeButton` in the toolbar's "Add element" group
— not built on `ShapeButton` itself since boundaries don't have
componentType catalog presets the way Process/Data Store/External Entity do;
its caret offers 4 presets (Square/Rectangle/Circle/Cloud) that set both
`boundaryShape` and initial width/height via a new `boundaryPreset` param
threaded through `makeNode()`/`addBoundary()`. Clicking the main button
(not the caret) still defaults to a rectangle, matching prior behavior.
**Known gap**: shape can only be chosen at creation time — there's no way to
change an existing boundary's shape afterward via the Inspector (which
currently shows nothing boundary-specific beyond Name/Description/Color).
Small, contained follow-up if wanted.

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
4. Trust boundary resize handles were unclickable → `pointer-events` is
   inherited, and `.react-flow__node-trust-boundary`'s `pointer-events: none
   !important` (for click-through to nodes underneath) was being inherited by
   `NodeResizer`'s handle/line elements since only the label had its own
   override. Fixed by adding `pointer-events: auto` to
   `.boundary-resize-handle`/`.boundary-resize-line` too.
5. Table tab's "+Process/+External Entity/+Data Store" buttons always
   created a generic untyped element, unlike the ribbon's equivalent buttons
   which offer a stencil-picker flyout — a real inconsistency the user
   caught while testing Release 3, not a regression it introduced (the table
   buttons never had this). Fixed by extracting `SHAPE_LABELS`/`SHAPE_ICONS`
   out of `Canvas.tsx` into a shared `src/canvas/shapeMeta.tsx` and swapping
   `ElementsTable.tsx`'s plain buttons for the same `ShapeButton` component
   the ribbon uses, so both entry points now offer the same stencil flyout
   and can't drift apart again.
6. New Project wizard's name field intermittently wasn't focused/typeable
   immediately on open (user saw it twice, not reliably reproducible).
   Likely cause: the wizard mounts fresh each time (`App.tsx` swaps it in via
   a `view` state change, not on initial page load), and the plain
   `autoFocus` prop occasionally lost the race against React 19 StrictMode's
   double-invoked dev-mode commit. Replaced with an explicit `useEffect` +
   ref-based `.focus()` call in `NewProjectWizard.tsx` — the standard, more
   reliable fix for autofocus-on-remount, and idempotent even if the effect
   fires twice.

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
- **Release 2 — Existing backlog cleanup** ✅ done and verified. MS-TMT-parity
  dialogs ✅, DREAD overlay coloring ✅, parallel-edge spacing tune ✅
  (partial — user flagged it still wants a real design pass, kept as a low
  priority Backlog item), resizable-panel verification ✅, ribbon redesign ✅
  (mocked up + approved + implemented + confirmed working), trust boundary
  resize/reshape + shape presets ✅ (added mid-release; confirmed working
  live including a click-through/resize-handle bug found and fixed on
  resume — see "Bugs fixed" below). Threat screenshot explicitly skipped.
Re-sequenced this session: the user tested the app and brought back 7 new
backlog items (numbered 1-7 below as the user gave them) plus a Microsoft
Threat Modeling Tool element/property export
(`microsoft_tmt_elements.json`, category → stencil → property hierarchy,
STRIDE-aligned) as a reference dataset for item 1. Grouped by dependency,
not just theme — each release below only needs what the ones above it
already built:

- **Release 3 — Element & Property Foundation** ✅ done and verified this
  session. *(user items 1 + 2)*:
  Replace the old two-selector system (`componentCatalog.ts`'s 8 quick
  presets + `mstmAttributes.ts`'s MS-TMT advanced fields, shown as two
  separate dropdowns) with one condensed stencil picker per element type,
  imported from the MS-TMT JSON with logical condensing (dropped dead tech
  like ActiveX, merged OS-internals-only stencils, generalized
  Windows-Store-specific capability fields into vendor-neutral ones — see
  "Element & property system" below for the full list once built). Also:
  true custom elements (blank stencil, user-named), per-instance custom
  property add/remove (text/boolean/select), and "save as custom element" to
  persist a customized stencil back into the project's catalog. Goes first —
  every release below assumes elements can carry custom properties.
- **Release 4 — Trust-Boundary Awareness & Flow/List UX** ✅ done and
  verified this session. *(user item 3 + 4)*: Geometric containment (which
  boundary each node currently sits inside, recomputed on move/resize), a
  numeric signifier for duplicate-named elements, and upgrading the Table
  tab's Flows list to show the zone-qualified path the user's TMT
  screenshot showed (`Internal Network → Web Server —one-way→ Customer →
  External User/Client`) instead of a bare `source → target` label. Also
  picked up an unplanned addition from live testing: the zone-aware
  create-flow picker turned out to need an edit counterpart too (rewiring
  an existing connection's source/target).
- **Release 5 — Smart Data Classification & Compliance Tagging** ✅ done and
  verified this session, across the initial build plus three follow-up
  refinement rounds from live testing. *(user item 5)*: absorbs what was
  originally scoped as "Release 3" before this re-sequencing (data
  classification/type tags on data flows). See "Compliance tagging (Release
  5)" under "What's built" for the full writeup.
- **Release 6 — Mitigation Elements (Firewall/WAF)** ✅ done and verified
  this session. *(user items 6 + 7)*: new `mitigation` node type
  (Firewall/WAF/IDS-IPS stencils), auto-attach splicing when dropped/dragged
  onto an existing flow's path (matches multiple converging flows in one
  drop, per-node opt-out checkbox), full STRIDE threat generation for the
  control itself, and the first negative `DreadContribution`s in the app
  (reduced Tampering on flows leaving a mitigation, gated on its ruleset
  being current). "Override/disconnect for bypass traffic" turned out to
  need no new mechanic — an edge simply not routed through the mitigation
  node already reads as a bypass, no separate toggle required. See
  "Mitigation elements (Release 6)" under "What's built" for the full
  writeup.
- **Release 7 — Threat intelligence grounding** ✅ done and verified this
  session. CAPEC/CWE citations per STRIDE category (plus signal-based
  extras) on every threat, and a mitigation-type -> control-framework
  mapping (NIST 800-53/CIS Controls v8/OWASP ASVS) on mitigation nodes and
  the flows leaving them — both shown in the Threats tab detail panel. See
  "Threat intelligence grounding (Release 7)" under "What's built" for the
  full writeup, including the live verification pass against MITRE/NIST/
  CIS/OWASP sources that caught a real ASVS chapter-renumbering issue.
- **Release 8 — Diagram scalability** ✅ done and verified this session,
  both parts — see "Sub-diagrams (Release 8, part 1)" and "Auto-layout
  (Release 8, part 2)" under "What's built".
- **Release 9 — SDLC integration**: threat model versioning/diffing between
  saves — the user's ask, surfaced testing Release 3, was specific: a
  revision counter next to the Canvas back-arrow that increments on every
  save, clickable to see a list of past revisions with timestamps, and
  restore any of them. Capped at the last 5-10 saves to avoid unbounded
  project-file growth, with a settings override to raise the cap. Also:
  risk-acceptance sign-off (who/when/review-by date, not just a status +
  freeform note), push open threats to Jira/GitHub Issues as tracked work
  — threat ownership + a due date would pair naturally with this piece
  (not yet scoped as its own item, but worth considering alongside it
  rather than as a separate release).
- **Release 10 — Reporting & Risk Register Enhancements** *(scoped this
  session from a "review everything as a professional risk assessor" ask;
  not started)*:
  - **Inherent vs. residual risk** — once a mitigation lowers a flow's
    DREAD score (Release 6), there's currently no way to see what the
    score *would have been* without it. Show both numbers (inherent =
    everything except `mitigationContributions()`'s negative entries,
    residual = the full current score) in the Threats tab detail view and
    in both PDF export variants — likely the single highest-value item
    here, and builds directly on the existing `DreadContribution`
    architecture rather than needing a new one.
  - **Sub-diagrams in PDF export, each with a clear header identifying
    what it's showing** (e.g. "Sub-diagram: Checkout Service") — explicit
    user ask. Real implementation wrinkle: `captureDiagramImage()`
    currently screenshots whichever level's `.react-flow` DOM is *live*,
    but only one level is ever mounted at a time (same reason a
    standalone "diagram screenshot in the Threats panel" was skipped
    back in an earlier session). The fix should be straightforward now
    that Release 8 built real navigation infrastructure though: drive
    `navigateToLevel()` programmatically for each `subDiagramId` found
    while building the export, capturing after each one and restoring the
    user's original breadcrumb position when done, rather than needing a
    parallel off-screen render.
  - **Risk register / Threats table view** — the Table tab already does
    this for Elements/Flows; Threats has no equivalent sortable/filterable
    table (DREAD score, category, status, compliance tags, target) despite
    the data already existing.
  - **CSV export of threats** — most GRC/audit workflows live in
    spreadsheets, not just PDFs; a raw structured export feeds directly
    into an existing risk register.
  - **Compliance-tag and DREAD-risk-level filters on the Threats tab** —
    status/category/type filters exist, "show me everything open and
    Critical" or "show me everything PCI-scoped" doesn't, even though both
    are already computed elsewhere in the app.
  - **Standalone diagram export (PNG/SVG)** — `captureDiagramImage()`
    already does the capture internally for PDF export; exposing it as a
    direct export option is small additional work.
- **Release 11 — Stretch** (original Phase 7 ideas, still valid, renumbered
  from Release 10 to make room for the reporting work above): custom
  user-defined STRIDE rules, IaC import (Terraform/CloudFormation →
  diagram elements), "crown jewel" asset tagging for risk prioritization
  (would also feed DREAD scoring the same way compliance tags do — a
  natural extension of the existing `complianceContributions()` pattern).
  Also noted as worth considering for a future release, not yet scoped:
  attack-path analysis (the diagram is already a graph, and mitigation
  nodes already sit in-line on flows — tracing the shortest path from an
  untrusted External Entity to a sensitive Data Store and showing what's
  mitigated along the way could be a genuinely differentiated feature),
  and lightweight reviewer comments per threat (distinct from resolution
  notes, for async review cycles short of full multi-user editing).

## Backlog (explicitly deferred, in rough priority order per most recent conversation)

1. **Unsaved-changes guard** — added this session, user-flagged as a real
   data-safety gap while testing Release 3. Right now the Canvas back arrow
   (and presumably project switch/close) discards any unsaved diagram edits
   with no warning. Needs: a "dirty" flag (compare current nodes/edges/
   project state against the last-saved snapshot, or simpler — a boolean set
   by any mutation and cleared by `save()`), and a confirm dialog on
   navigate-away offering Save / Discard / Cancel. Small, self-contained,
   worth doing before it costs someone real work.
2. **Trust boundary shape editing after creation** — shape can only be
   picked at creation time via the toolbar preset; there's no way to change
   an existing boundary's shape afterward. The Inspector shows nothing
   boundary-specific beyond Name/Description/Color/Boundary type (added in
   Release 3). Small, contained addition if wanted (add a shape selector to
   `NodeInspector` in `Inspector.tsx`, gated on `elementType ===
   'trust-boundary'`).
3. **Parallel-edge endpoint visual polish** — spacing constants were tuned
   once (`ENDPOINT_SPACING`/`PARALLEL_SPACING` in `FloatingEdge.tsx`) but the
   user still feels it needs a proper design pass, not just bigger numbers.
   Low priority.
4. **Recent custom colors all show the same color** — user-reported (with
   screenshot) during Release 8 testing: picking one custom color via the
   native color-wheel input makes all 5 "Recent" swatch boxes in
   `ColorSwatchPicker.tsx` show that same color, instead of a history of up
   to 5 distinct recently-used ones. Explicitly logged as backlog-only, not
   fixed, per user request ("doesn't affect functionality"). Root cause
   **not confirmed** — `color.ts`'s `addRecentColor()` dedup logic reads
   correctly on a static pass (filters the new hex out of existing entries,
   prepends it, slices to 5 — shouldn't be able to produce 5 identical
   entries from that alone). Leading hypothesis: `<input type="color">`'s
   `onChange` in `ColorSwatchPicker.tsx` — which React wires to the native
   `input` event, not `change` — fires continuously during a live drag
   inside the OS color picker (not just once on confirm), so a single pick
   gesture could call `pickCustom()` → `addRecentColor()` many times; not
   verified against an actual repro yet, so treat as a starting point for
   debugging, not a diagnosis. Needs interactive testing (e.g. temporarily
   logging each `onChange` firing during a real pick) before attempting a
   fix.

Decided against / explicitly skipped:
- **Threat diagram screenshot** in the Threats detail panel — would have
  needed caching a diagram snapshot + viewport transform while the Diagram
  tab is mounted (since the canvas DOM doesn't exist on other tabs), with a
  staleness tradeoff if the user edits the diagram without revisiting that
  tab. User decided the threat overlay (color-coded badges directly on the
  live diagram) already covers this need well enough — skip.

Done and verified this session:
- Ribbon toolbar visual design/organization pass — mocked up via the
  visualize tool, approved, implemented, confirmed working against the real
  app.

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
