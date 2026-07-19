# Threat Modeler — Status Handoff

Written as a resume point at the end of a work session (either before context
compaction or before the user steps away for the day). If you're a fresh Claude
Code session reading this: the user wants to keep building this app. Read this
whole file before touching code — it captures decisions and gotchas that aren't
obvious from the code alone.

## Resume here (updated end of this session)

1. **✅ Fixed and confirmed: "Tidy up" no longer orphans a node outside
   its trust boundary.** Took three attempts, each checked against a real
   repro — the first two (dagre compound-cluster tuning) were shipped and
   still failed live; the actual root cause was that XYFlow renders a
   resized node from its top-level `width`/`height`/`measured`, not
   `style.width/height`, and the fix only ever wrote `style`. See
   "Auto-layout boundary-containment fix" under "What's built" for the
   full writeup — worth reading if another "layout looks right in the data
   but wrong on screen" bug ever shows up, since the same top-level-vs-style
   size mismatch could resurface elsewhere. A layout-*quality* follow-up
   (minimize total edge length, default to horizontal/left-to-right
   orientation for wide monitors) was explicitly scoped as backlog polish,
   not a correctness fix — see Backlog item 4.
2. **Release 9 — SDLC Integration — done and fully verified, all three
   stages.** See "SDLC integration (Release 9)" under "What's built" below
   for the full writeup. Highlights:
   - **Version history**: every Save captures a full-project snapshot as a
     restorable revision (capped at the last 10; a separate uncapped
     `revisionCount` badge next to the back arrow keeps counting past
     that). Restoring loads the old snapshot back into the editor but
     deliberately doesn't auto-save — the user still has to click Save to
     make it the new persisted state.
   - **Risk-acceptance sign-off**: Accepted by / auto-stamped Accepted-on /
     Review-by date fields appear once a threat's status is set to
     'accepted'; an overdue review-by date now surfaces as a warning in the
     Messages dialog.
   - **Copy as Markdown**: a button on any threat's detail view copies a
     self-contained Markdown block (DREAD, compliance scope, CAPEC/CWE
     citations, compensating controls, notes, sign-off) to the clipboard —
     built instead of a real Jira/GitHub API integration per user's
     explicit scope choice (no credentials/network calls needed, works
     with any tracker).
3. **Next up: Release 10 — Modern Elements: AI Risk Surface & API Gateway**
   (scoped this session, not built) — new. The user
   supplied a competitor requirements doc
   (`threat-modeling-tool-requirements.md`) at the start of this session;
   most of it was already built or already roadmapped (see "Requirements
   doc gap analysis" below for the full comparison), but two ideas the user
   raised independently — AI/ML processing as a declared risk surface, and
   modern mitigation types like API Gateway — weren't, and were scoped as
   their own release, bundled together since they're both "extend the
   element/mitigation catalog" work of similar shape. See "Release roadmap"
   below for the full scope.
4. **Release 11 — Reporting & Risk Register Enhancements** (renumbered
   from 10 to make room for the above; scoped, still not built):
   inherent-vs-residual DREAD scores, sub-diagrams included in PDF export
   with a header per level, a Threats risk-register table view, CSV
   export, compliance/DREAD-risk filters on the Threats tab, and
   standalone diagram PNG/SVG export. See "Release roadmap" below for the
   full scoping notes, including the sub-diagram PDF capture
   implementation wrinkle already flagged there.
5. **Release 13 — Requirements Gap Coverage** (new this session, scoped
   from the requirements-doc comparison, not built): MITRE ATT&CK citations
   alongside the existing CAPEC/CWE ones, control verification states
   (proposed/implemented/verified/failed — weighted DREAD mitigation
   credit instead of today's all-or-nothing), a DREAD scoring rubric with
   anchor descriptions per 1-10 value, more compliance framework tags
   (HIPAA, ISO 27001 Annex A, NIST CSF 2.0, FedRAMP), a reverse/auditor
   compliance view, project templates, a risk-trend dashboard (newly
   *feasible* now that Release 9's `revisionHistory` gives us timestamped
   snapshots), and SARIF/OTM export. See "Release roadmap" below for the
   full writeup, including what was deliberately left out (live cloud
   discovery, SIEM/scanner closed-loop, CMDB/IdP integration, a networked
   REST API — all assume external systems or a server component this local
   desktop app doesn't have).
6. One more unrelated bug reported in an earlier session, logged but **not
   yet fixed** per explicit user request (backlog only):
   `ColorSwatchPicker.tsx`'s "Recent" custom colors all show the same color
   instead of a history of distinct ones after a single custom pick. Root
   cause not confirmed — the likely culprit is `<input type="color">`'s
   `onChange` (which React maps to the native `input` event, firing
   continuously during a live drag in the OS color picker) calling
   `addRecentColor()` many times per pick, but `color.ts`'s dedup logic
   looks correct in isolation on a static read, so this needs interactive
   debugging before a fix, not a guess. See Backlog below.
7. Releases 6 (mitigation elements), 7 (threat intelligence grounding), 8
   (diagram scalability), and 9 (SDLC integration) are done and fully
   verified — see "What's built" below for the full writeups.
8. One more item came in from Release 3 testing and was folded into the
   roadmap rather than built immediately: an unsaved-changes guard (warn
   before navigating away from an edited-but-unsaved diagram) — Backlog
   item 1 below, small and a real data-safety gap. Not started.
9. Three small backlog items remain, all low priority, none blocking:
   trust boundary shape editing *after* creation (currently creation-time
   only), further parallel-edge endpoint visual polish, and Tidy Up layout
   *quality* (edge-length minimization, horizontal/left-to-right default
   orientation — new this session, explicitly scoped as polish, distinct
   from the correctness bug fixed in item 1 above). See Backlog below.
10. Everything is committed and pushed to
    `https://github.com/harbinscott/ThreatModeler` (`main` branch) as of
    the end of this session, including the Tidy Up bugfix and the
    requirements-doc review/roadmap scoping from the session before it.

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

**Requirements doc gap analysis (session start)** — the user supplied a
competitor requirements doc (`threat-modeling-tool-requirements.md`,
downloaded, not committed to the repo) describing a hypothetical
"living threat model" platform benchmarked against Microsoft TMT, OWASP
Threat Dragon, IriusRisk, ThreatModeler, SD Elements, pytm, and Threagile.
Read section by section and compared against everything already built or
already roadmapped, rather than treating it as a fresh feature list —
most of the document turned out to already be covered:

*Already built, matching or exceeding the doc's ask*: STRIDE per-element
and per-interaction (`ruleEngine.ts`), rule-driven threat generation,
CAPEC/CWE citation grounding (Release 7, plus live-verified — the doc
doesn't even ask for that rigor), inherent architectural signals feeding
DREAD (MS-TMT attributes, trust-boundary crossings), forward compliance
mapping (data classification → activated framework requirements → DREAD
bumps, Release 5), control objects with STRIDE/DREAD mitigation effects
(mitigation elements, Release 6 — narrower than the doc's generic
"control coefficient" system but covers the same underlying need without
a bigger rearchitect), the full PASTA 7-stage workflow, and version
history (Release 9, though deliberately without a diff view — see that
section).

*Already roadmapped, not yet built*: inherent-vs-residual DREAD scoring,
IaC import, custom user-defined STRIDE rules, crown-jewel asset tagging,
attack-path chaining (PASTA stage 6) — all already sitting in Release
11/12 below before this doc was even read, which the doc's own "Suggested
Build Priority" section (phase one: DFD editor + STRIDE + rubric DREAD +
control objects + Jira integration + JSON export) confirms we've already
substantially exceeded.

*Genuine gaps, newly scoped into Release 13*: MITRE ATT&CK citations,
control verification states (proposed/implemented/verified/failed with
weighted DREAD credit — the single highest-value idea in the whole doc),
a DREAD rubric with scoring anchors, more compliance framework tags
(HIPAA/ISO 27001/NIST CSF/FedRAMP), a reverse/auditor compliance view,
project templates, a risk-trend dashboard, and SARIF/OTM export.

*Consciously not pursuing*, and named explicitly rather than silently
dropped, since "doesn't fit this app's shape" is a decision worth
recording, not an oversight to rediscover later: live cloud discovery
(AWS/Azure/GCP), SIEM/scanner closed-loop verification, CMDB/IdP
integration, a networked REST API, self-hosted/SaaS deployment. Every one
of these assumes either a server component or real external systems —
this is a local, single-user desktop app, and building any of these would
change what kind of product it is, not just extend it. Jira/GitHub
integration specifically was already evaluated and deliberately scoped
down to Copy-as-Markdown (Release 9) for the same reason, one release
before this doc showed up — consistent with the pattern, not a new
decision.

Two ideas came from the user independently overnight, not from the
requirements doc, and turned out sharper than anything the doc proposes
for the same territory — AI/ML processing as a declared risk surface (the
doc doesn't mention AI at all) and modern mitigation types like API
Gateway. Bundled into the new Release 10 — see "Release roadmap" below.

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

**SDLC integration (Release 9)** — three independently-scoped stages, each
checkpointed separately.

*Version history*: new `ProjectRevision` type (`types/project.ts`,
`{id, savedAt, snapshot}`) and `Project.revisionHistory?`/`revisionCount?`.
Same "full snapshot, not a diff" architecture `useDiagramHistory`'s undo
stack already uses, applied at the project level — the user explicitly
scoped out a diff view for this pass (list + restore only). `handleSave()`
in `Canvas.tsx` now builds the full committed project state (via the same
`writeLevel()` from Release 8), snapshots everything that can change across
a save (diagram/threats/pasta/info/notes/customStencils/subDiagrams) into a
new revision, prepends it, and slices to `MAX_REVISIONS` (10) — while
`revisionCount` keeps incrementing uncapped, so the toolbar badge next to
the back arrow ("v12") reflects the true number of saves even once only the
last 10 are restorable. New `HistoryDialog.tsx` (reuses `Modal.tsx`) lists
revisions newest-first with a Restore button each. `restoreRevision()`
loads an old snapshot back into the live editing state — always resets the
breadcrumb to the top level and calls the same `loadLevelIntoState()` /
`history.reset()` pattern Release 8's sub-diagram navigation already
established — but deliberately does **not** auto-save: restoring only
replaces what's being *edited*, and the user still has to click Save to
make it the new persisted state, same as every other edit in this app. That
also means restoring-then-saving doesn't destroy the revisions that existed
between the restored point and now (non-destructive, like `git revert`
rather than `git reset`).

*Risk-acceptance sign-off*: `Threat` gained `acceptedBy?`/`acceptedAt?`/
`reviewByDate?` (`types/project.ts`). `ThreatsPanel.tsx`'s detail view shows
an "Accepted by" text field and a "Review by" date field once
`status === 'accepted'`, plus a read-only "Accepted [date]" line.
`acceptedAt` auto-stamps in `Canvas.tsx`'s `changeThreatStatus()` the first
time status becomes `'accepted'` and is **never overwritten afterward** —
deliberately: it records when a threat was *first* accepted, not the last
time the status field happened to read 'accepted', so reopening and
re-accepting a threat doesn't erase that history. `diagnostics.ts` gained an
overdue-review check (`reviewByDate` in the past while still `'accepted'`)
surfaced as a warning in the Messages dialog — simple ISO-date string
comparison, no `Date` parsing needed since `<input type="date">` and
`new Date().toISOString().slice(0,10)` are already both `YYYY-MM-DD`.

*Copy as Markdown*: the original roadmap idea here was "push open threats
to Jira/GitHub Issues" — scoped down before building, via an explicit
user choice, to a clipboard-based "Copy as Markdown" button instead. No
credentials, no network calls, works with literally any tracker (Jira,
GitHub, Linear, ...) rather than committing to one API — a deliberately
smaller, lower-risk piece than a real integration would have been, and a
real API push (GitHub Issues specifically, using Electron's `safeStorage`
for the token) was named as a possible later follow-up rather than built
now. New `threatToMarkdown(threat, ctx)` in `threatIntel.ts` — reuses
`citationsForThreat()`/`controlsForMitigationType()`/
`dreadTotal()`/`dreadAverage()`/`dreadRiskLevel()` rather than duplicating
any of that logic, and only includes a section (DREAD, compliance scope,
references, compensating controls, notes, risk-acceptance) when there's
actually something to say. `ThreatsPanel.tsx`'s detail panel gained a
"Copy as Markdown" button next to Delete (`navigator.clipboard.writeText()`,
transient "Copied ✓" state matching the Save button's own pattern).

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

**Auto-layout boundary-containment fix (bugfix session)** — the day
Release 8 part 2 shipped, the user reported (with before/after
screenshots) that clicking Tidy Up could move a node entirely outside its
trust boundary while its siblings stayed correctly contained. Took three
attempts to actually fix, each verified (or falsified) against real data
rather than guessed:

*Attempt 1 (rejected before shipping)*: hypothesized dagre's compound/
cluster support (`g.setParent()`) was best-effort during ranking, not a
hard constraint. Built a standalone repro against the real `dagre`
package with data closely mimicking the user's diagram — it did **not**
reproduce the bug, falsifying this theory before it shipped.

*Attempt 2 (shipped, then failed live)*: revised theory — dagre's
self-reported cluster bounding box (`g.node(boundaryId)`) is computed at
an earlier layout pass than final child positions, so trusting it for the
boundary's rendered rect could disagree with where children actually
landed. Fix: stopped reading the boundary's rect from dagre's cluster
report, instead computed it directly from members' actual final
positions. Typechecked, shipped, user retested — **still failed**, with
screenshots showing members visually outside a boundary that looked
correctly fitted to a *different*, smaller subset of them.

*Attempt 3 (the actual fix)*: rather than patch the compound-cluster
approach again, rewrote `autoLayoutDiagram()` to not use dagre's compound
feature at all — a **two-level layout** where containment is structural
rather than something dagre has to honor. For each boundary, its members
are laid out in an isolated dagre pass using *only* edges between those
members (a cross-boundary edge literally cannot pull on a node it can't
see); a second "macro" pass then lays out each boundary as a single
opaque node sized to fit its micro layout, alongside any unboundaried
top-level nodes, connected by the original edges collapsed onto whichever
boundary (or bare node) each endpoint belongs to. Each member's final
position is boundary-top-left + its micro-relative offset — provably
inside the boundary's rect by construction. Verified this against a
synthetic repro with real `dagre`, but **still failed live** — the
`parentOf` assignment and the arithmetic were both correct; the
containment math simply wasn't what the screen was showing.

**The real root cause**, found by pulling the user's actual saved
project JSON off disk (`%APPDATA%\app\projects\*.json`, the dev
`userData` path — Electron's `app.getName()` defaults to `package.json`'s
`"name"` field, `"app"`, not `productName`) and running the layout logic
against it directly in a standalone script: `DiagramNode` is XYFlow's
`Node` type, which carries size in *two* independent places — a nested
`style.width`/`style.height`, and (once a node has ever been resized via
`NodeResizer`, which trust boundaries support) top-level `width`/`height`
+ `measured`. XYFlow renders from the top-level fields once they're
populated, ignoring `style.width/height` entirely. Both of the previous
two fixes only ever wrote `style` on the returned boundary node — so the
box kept *rendering* at its old, stale size while members were being
*positioned* for the new, larger size the layout had just calculated.
That's exactly "boundary box looks tightly fitted to 2 nodes, but 2 more
members render outside it" — the geometry was right the whole time, the
box just wasn't visually resizing. Fix: the boundary branch of
`autoLayoutDiagram()`'s return map now also sets `width`, `height`, and
`measured: { width, height }` at the top level, not just inside `style`.
Verified against the real saved diagram data before shipping (not a
synthetic guess) — every member matched its correct boundary with zero
drift, pre- and post-layout. Confirmed working live afterward, including
on a diagram that had accumulated stale/inconsistent sizes from the two
earlier failed attempts.

The methodology across all three attempts is the takeaway worth keeping:
every fix was checked against a real repro (first synthetic, then the
user's actual saved data) before being called done, and two of the three
were caught as insufficient *before* wasting another live test round —
consistent with this project's established practice (Release 7's live
CAPEC/CWE/ASVS verification) of not presenting unverified analysis as
fact.

**Auto-layout (Release 8, part 2; rewritten in the bugfix session above —
this describes the current implementation)** — `src/canvas/autoLayout.ts`,
`autoLayoutDiagram(diagram)`, wired to a new "Tidy up" button in the
Diagram tab ribbon (`handleTidyUp()` in `Canvas.tsx`, disabled when there
are no non-boundary nodes). Uses `dagre` (added as a dependency) for a
top-to-bottom layered layout based on the diagram's actual flow edges.
Trust boundaries have no edges of their own — they represent spatial
containment, not flow connectivity, which is what dagre lays out by — so
naively treating them as ordinary nodes would place them disconnected from
everything, and leaving them fixed while their contents move would let
nodes drift outside the boundary they're supposed to be in. **Does not**
use dagre's compound/cluster feature (`g.setParent()`) — see "Auto-layout
boundary-containment fix" above for why that approach was abandoned after
two failed attempts. Instead runs a two-level layout: each boundary's
members are laid out in their own isolated dagre pass first (using only
edges between those members, via the same `innermostBoundary()` helper
`ruleEngine.ts` already uses for crossing detection), then a second
"macro" pass lays out each boundary as a single opaque node sized to fit
its own members, alongside any unboundaried nodes. A member's final
position is always boundary-position + its offset within that isolated
layout, so containment holds by construction rather than depending on
dagre's cluster behavior. One undo step (picked up by the existing
debounced undo recorder, no special-casing needed).

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
- **Release 9 — SDLC integration** ✅ done and verified this session, all
  three stages — see "SDLC integration (Release 9)" under "What's built".
  Scope note: the original "push open threats to Jira/GitHub Issues" idea
  shipped as a "Copy as Markdown" button instead (no credentials/network
  calls, works with any tracker) per an explicit user scope choice made
  before starting — see that section for the full reasoning. Threat
  ownership + a due date, floated as a possible pairing with the original
  Jira idea, wasn't built — still worth considering for a future release if
  wanted, but nothing forces it now that the tracker-push scope changed.
- **Release 10 — Modern Elements: AI Risk Surface & API Gateway** *(scoped
  this session; not started; next up after the Tidy Up bugfix)*. Prompted
  by the user's own "keep the tool from going stale" ideas, evaluated
  against the requirements doc (see "Requirements doc gap analysis" below)
  and found to be sharper than anything the doc itself proposes for AI
  specifically:
  - **AI/ML processing as a declared risk surface** — new attributes on
    Process (`usesAI` boolean, `aiFunction` type select — e.g. "LLM/
    Generative AI", "ML Classification/Scoring", "Recommendation Engine",
    "Computer Vision", "Other") and on External Entity
    (`usesThirdPartyAIProvider` — data leaving the trust boundary to an
    external LLM API is the sharpest, most current real-world version of
    this risk, e.g. sending PII to a third-party model). Same
    `mstmAttributes.ts` pattern every other element-type attribute set
    already uses — nothing structurally new needed. Feeds new STRIDE
    threats (prompt injection / adversarial input on Tampering,
    training/inference data leakage on Information Disclosure) and DREAD
    bumps the same way MS-TMT attributes already do. Stretch idea within
    this item, not required for v1: cite OWASP's LLM Top 10 the same way
    Release 7 cites CAPEC/CWE, verified live before shipping per that
    release's established practice.
  - **API Gateway as a new mitigation stencil**, plus room for a couple of
    other modern mitigation types if it makes sense once this is underway.
    Mostly fits the *existing* mitigation attribute schema as-is (blocks
    unauthorized traffic / inspects payload / logs traffic / rules up to
    date all already apply) — the one genuinely new field needed is
    `rateLimitingEnabled`, which would be **the first mitigation attribute
    with a clean, statable reason to reduce Denial-of-Service risk**
    specifically (today's `mitigationContributions()` only ever touches
    Tampering — see Release 6's writeup for why). New
    `controlsForMitigationType()` entries for API Gateway (likely NIST
    800-53 SC-7/AC-4 and OWASP ASVS, an app-layer control like WAF) —
    verify the exact control IDs live before shipping, same as every other
    citation added since Release 7.
- **Release 11 — Reporting & Risk Register Enhancements** (renumbered from
  10 to make room for the above; scoped, not started):
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
- **Release 12 — Stretch** (original Phase 7 ideas, still valid, renumbered
  again to make room — was Release 10, then 11): custom user-defined
  STRIDE rules, IaC import (Terraform/CloudFormation → diagram elements),
  "crown jewel" asset tagging for risk prioritization (would also feed
  DREAD scoring the same way compliance tags do — a natural extension of
  the existing `complianceContributions()` pattern). Also noted as worth
  considering for a future release, not yet scoped: attack-path analysis
  (the diagram is already a graph, and mitigation nodes already sit
  in-line on flows — tracing the shortest path from an untrusted External
  Entity to a sensitive Data Store and showing what's mitigated along the
  way could be a genuinely differentiated feature — the requirements doc
  independently flags this as one of the biggest differentiators in the
  market, "very few tools do this well," worth weighing above plain
  "stretch" priority when this release actually comes up), and
  lightweight reviewer comments per threat (distinct from resolution
  notes, for async review cycles short of full multi-user editing).
- **Release 13 — Requirements Gap Coverage** *(new this session, scoped
  from a systematic comparison against the user-supplied competitor
  requirements doc; not started)*. See "Requirements doc gap analysis"
  below under "What's built" for the full comparison this was drawn from,
  including everything already covered and everything consciously *not*
  being pursued (with reasons):
  - **MITRE ATT&CK technique ID citations** alongside the existing
    CAPEC/CWE ones (Release 7) — same `threatIntel.ts` architecture,
    same "verify every id live before shipping" practice.
  - **Control verification states** — proposed/implemented/verified/
    failed-or-regressed, with only `verified` controls getting full DREAD
    mitigation weight and `implemented`-but-unverified getting partial
    credit. The single highest-value idea from the requirements doc;
    extends the existing mitigation-attribute architecture (Release 6)
    rather than replacing it.
  - **DREAD scoring rubric** — defined anchor descriptions per 1-10 value
    for each of the 5 fields, shown alongside the existing hint tooltips,
    for the situations automation can't derive a score and a human has to
    pick one.
  - **More compliance framework tags**: HIPAA, ISO 27001 Annex A, NIST
    CSF 2.0, FedRAMP — extends the existing `ComplianceTag` union
    (Release 5), same propagation/DREAD-bump architecture, no new
    mechanism needed.
  - **Reverse/auditor compliance view** — start from a framework
    requirement, see which components it applies to and their status;
    the framework-centric companion to Release 11's target-centric risk
    register.
  - **Project templates** — common patterns (three-tier web app,
    event-driven microservice, data pipeline) as diagram starting points,
    distinct from Release 3's per-element "save as custom element."
  - **Risk-trend dashboard** — newly *feasible*, not just theoretically
    nice, now that Release 9's `revisionHistory` gives us timestamped
    project snapshots to chart against.
  - **SARIF and OTM (Open Threat Model) export** — CI-gate/interop-
    friendly formats, same shape as the existing CSV/Markdown exporters
    (no credentials or network calls needed, unlike the scanner/SIEM/CMDB
    integrations the doc also lists — see below for why those are out).
  - **Explicitly not pursuing**, named rather than silently dropped: live
    cloud discovery (AWS/Azure/GCP read-only API), SIEM/scanner
    closed-loop control verification, CMDB/IdP integration, a networked
    REST API, self-hosted/SaaS deployment split. All assume either a
    server component or real external systems this local single-user
    desktop app doesn't have and isn't trying to be — building any of
    these would be a different kind of product, not an extension of this
    one.

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
4. **Tidy Up layout quality** — the Tidy Up bug (nodes rendering outside
   their trust boundary) is fixed, see "Auto-layout boundary-containment
   fix" under "What's built" — this item is about the *quality* of an
   already-correct layout, not a correctness bug. User feedback after
   confirming the fix: the layout should weight minimizing total edge
   length (currently dagre just ranks by graph topology with no length
   objective) and should default to a horizontally-oriented flow rather
   than top-to-bottom, since most monitors are wider than tall. Explicitly
   scoped as polish/visual refinement, lower priority than functional work
   — user's own words: "I think that can go into the visual improvement
   backlog." Would touch `rankdir` (try `'LR'` instead of `'TB'` in both
   the micro and macro dagre passes in `autoLayout.ts`) and possibly
   dagre's `ranksep`/`nodesep`/`align` tuning; true edge-length
   minimization beyond what dagre's own heuristics already do would need
   more investigation.
5. **Recent custom colors all show the same color** — user-reported (with
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
