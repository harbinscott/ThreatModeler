# Threat Modeler

A Windows desktop threat-modeling tool (Electron + React + TypeScript), inspired by
Microsoft's Threat Modeling Tool and OWASP Threat Dragon — unifying STRIDE
(diagram-driven auto threat generation), DREAD (risk scoring), and PASTA (guided
business-risk workflow) as layered, complementary views of the same threat model
rather than mutually exclusive picks.

Built as a learning/portfolio project.

## Features

- Data-flow diagram canvas (processes, data stores, external entities, trust
  boundaries) with floating edges, color customization, and a full Microsoft
  Threat Modeling Tool-derived security attribute schema per element type
- Automatic STRIDE threat generation from the diagram, with descriptions that
  react to each element's security attributes
- DREAD scoring with auto-suggested starting scores, tunable per threat
- A 7-stage guided PASTA workflow that pulls live summaries from the diagram
  and generated threats
- A live threat overlay on the canvas (color-coded badges, click for detail)
- PDF export (executive summary and detailed reports)
- Windows installer via `electron-builder`

## Running it

```
cd app
npm install
npm run electron:dev
```

## Project status

See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for the current build state, what's
implemented, known gotchas, and the backlog.
