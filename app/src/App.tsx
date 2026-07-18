import { useEffect, useState } from 'react'
import { Dashboard } from './pages/Dashboard'
import { NewProjectWizard } from './pages/NewProjectWizard'
import { Canvas } from './pages/Canvas'
import type { NewProjectInput, Project } from './types/project'
import './App.css'

type View = 'dashboard' | 'new-project' | 'canvas'

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    setLoading(true)
    try {
      const list = await window.api.listProjects()
      setProjects(list)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(input: NewProjectInput) {
    await window.api.createProject(input)
    await loadProjects()
    setView('dashboard')
  }

  function openProject(id: string) {
    setActiveProjectId(id)
    setView('canvas')
  }

  async function deleteProject(id: string) {
    await window.api.deleteProject(id)
    await loadProjects()
  }

  async function exportProject(project: Project) {
    await window.api.exportProjectFile(project)
  }

  async function importProject() {
    const result = await window.api.importProjectFile()
    if (!result.canceled) await loadProjects()
  }

  function backToDashboard() {
    setActiveProjectId(null)
    setView('dashboard')
    loadProjects()
  }

  return (
    <div className="app">
      {view === 'dashboard' && (
        <Dashboard
          projects={projects}
          loading={loading}
          onNewProject={() => setView('new-project')}
          onOpenProject={openProject}
          onDeleteProject={deleteProject}
          onExportProject={exportProject}
          onImportProject={importProject}
        />
      )}
      {view === 'new-project' && (
        <NewProjectWizard onCancel={() => setView('dashboard')} onCreate={handleCreate} />
      )}
      {view === 'canvas' && activeProjectId && (
        <Canvas projectId={activeProjectId} onBack={backToDashboard} />
      )}
    </div>
  )
}

export default App
