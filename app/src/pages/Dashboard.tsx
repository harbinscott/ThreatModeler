import { useState } from 'react'
import type { Project } from '../types/project'
import { GettingStartedDialog } from '../components/GettingStartedDialog'
import './Dashboard.css'

interface DashboardProps {
  projects: Project[]
  loading: boolean
  onNewProject: () => void
  onOpenProject: (id: string) => void
  onDeleteProject: (id: string) => void
  onExportProject: (project: Project) => void
  onImportProject: () => void
}

/** Purely decorative — a faint triangular mesh behind the header with a
 *  handful of glowing seams in the brand's own blue-to-red gradient (the
 *  same two colors already used by the wordmark accent and the shield icon,
 *  not a copy of any reference image's literal palette). Grid-aligned
 *  coordinates (multiples of the 56px tile) so the glow reads as specific
 *  edges of the mesh lighting up, not arbitrary decoration on top of it.
 *  `aria-hidden` + `pointer-events: none` since it carries no information
 *  and shouldn't intercept clicks on the header content above it. */
function DashboardMesh() {
  return (
    <svg className="dashboard__mesh" viewBox="0 0 960 220" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="dash-mesh-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M0 0H56M0 0V56M0 0L56 56" fill="none" stroke="var(--border)" strokeWidth="1" />
        </pattern>
        <linearGradient id="dash-mesh-glow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--danger)" />
        </linearGradient>
        <filter id="dash-mesh-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <linearGradient id="dash-mesh-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" />
          <stop offset="65%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </linearGradient>
        <mask id="dash-mesh-mask">
          <rect x="0" y="0" width="960" height="220" fill="url(#dash-mesh-fade)" />
        </mask>
      </defs>
      <g mask="url(#dash-mesh-mask)">
        <rect x="0" y="0" width="960" height="220" fill="url(#dash-mesh-grid)" opacity="0.6" />
        <g stroke="url(#dash-mesh-glow)" strokeWidth="2" fill="none" opacity="0.8" filter="url(#dash-mesh-blur)" strokeLinecap="round">
          <path d="M560 0 L616 56 L672 56 L728 112 L784 112 L840 168" />
          <path d="M336 0 L392 56 L392 112" />
          <path d="M896 0 L896 56 L952 112" />
        </g>
      </g>
    </svg>
  )
}

function frameworkBadges(project: Project): string[] {
  const badges: string[] = []
  if (project.frameworks.stride) badges.push('STRIDE')
  if (project.frameworks.dread) badges.push('DREAD')
  if (project.frameworks.pasta) badges.push('PASTA')
  return badges
}

export function Dashboard({
  projects,
  loading,
  onNewProject,
  onOpenProject,
  onDeleteProject,
  onExportProject,
  onImportProject,
}: DashboardProps) {
  const [showGettingStarted, setShowGettingStarted] = useState(false)

  function handleDelete(e: React.MouseEvent, project: Project) {
    e.stopPropagation()
    if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      onDeleteProject(project.id)
    }
  }

  function handleExport(e: React.MouseEvent, project: Project) {
    e.stopPropagation()
    onExportProject(project)
  }

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <DashboardMesh />
        <div>
          <div className="dashboard__brand">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path
                d="M12 1.5 22 7v10l-10 5.5L2 17V7z"
                fill="none"
                stroke="var(--text)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M12 6.5 16.5 8v4c0 3-2 4.6-4.5 5.5C9.5 16.6 7.5 15 7.5 12V8z"
                fill="var(--danger)"
              />
              <rect x="11.2" y="9" width="1.6" height="4.2" rx="0.8" fill="var(--bg)" />
              <rect x="11.2" y="13.8" width="1.6" height="1.6" rx="0.8" fill="var(--bg)" />
            </svg>
            <span className="dashboard__wordmark">
              Threat <span className="dashboard__wordmark--accent">Modeler</span>
            </span>
          </div>
          <h1>Projects</h1>
          <p className="dashboard__subtitle">Threat models you're working on.</p>
        </div>
        <div className="dashboard__header-actions">
          <button type="button" className="btn" onClick={() => setShowGettingStarted(true)} title="Getting started & keyboard shortcuts">
            ? Help
          </button>
          <button type="button" className="btn" onClick={onImportProject}>
            Import Project
          </button>
          <button type="button" className="btn btn--primary" onClick={onNewProject}>
            + New Project
          </button>
        </div>
      </header>

      {showGettingStarted && <GettingStartedDialog onClose={() => setShowGettingStarted(false)} />}

      {loading && <p className="dashboard__muted">Loading projects…</p>}

      {!loading && projects.length === 0 && (
        <div className="dashboard__empty">
          <p>No projects yet.</p>
          <button type="button" className="btn btn--primary" onClick={onNewProject}>
            Create your first project
          </button>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="dashboard__grid">
          {projects.map((p) => (
            <div
              className="project-card"
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenProject(p.id)}
              onKeyDown={(e) => e.key === 'Enter' && onOpenProject(p.id)}
            >
              <div className="project-card__header">
                <h3>{p.name}</h3>
                <div className="project-card__actions">
                  <button
                    type="button"
                    className="project-card__icon-btn"
                    onClick={(e) => handleExport(e, p)}
                    aria-label={`Export ${p.name}`}
                    title="Export project file"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="project-card__icon-btn project-card__icon-btn--danger"
                    onClick={(e) => handleDelete(e, p)}
                    aria-label={`Delete ${p.name}`}
                  >
                    ×
                  </button>
                </div>
              </div>
              {p.description && <p className="project-card__desc">{p.description}</p>}
              <div className="project-card__badges">
                {frameworkBadges(p).map((b) => (
                  <span className="badge" key={b}>
                    {b}
                  </span>
                ))}
              </div>
              <p className="project-card__meta">
                Updated {new Date(p.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
