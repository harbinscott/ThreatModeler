import type { Project } from '../types/project'
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
          <button type="button" className="btn" onClick={onImportProject}>
            Import Project
          </button>
          <button type="button" className="btn btn--primary" onClick={onNewProject}>
            + New Project
          </button>
        </div>
      </header>

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
