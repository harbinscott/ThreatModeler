const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (input) => ipcRenderer.invoke('projects:create', input),
  getProject: (id) => ipcRenderer.invoke('projects:get', id),
  saveProject: (project) => ipcRenderer.invoke('projects:save', project),
  deleteProject: (id) => ipcRenderer.invoke('projects:delete', id),
  exportReportPdf: (html, suggestedName) =>
    ipcRenderer.invoke('reports:export-pdf', { html, suggestedName }),
  exportProjectFile: (project) => ipcRenderer.invoke('projects:export-file', project),
  importProjectFile: () => ipcRenderer.invoke('projects:import-file'),
  exportThreatsCsv: (csv, suggestedName) => ipcRenderer.invoke('reports:export-csv', { csv, suggestedName }),
  exportDiagramImage: (dataUrl, format, suggestedName) =>
    ipcRenderer.invoke('reports:export-image', { dataUrl, format, suggestedName }),
})
