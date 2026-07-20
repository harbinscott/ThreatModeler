import type { NewProjectInput, Project } from './project'

declare global {
  interface Window {
    api: {
      listProjects: () => Promise<Project[]>
      createProject: (input: NewProjectInput) => Promise<Project>
      getProject: (id: string) => Promise<Project>
      saveProject: (project: Project) => Promise<Project>
      deleteProject: (id: string) => Promise<void>
      exportReportPdf: (
        html: string,
        suggestedName: string
      ) => Promise<{ canceled: boolean; filePath?: string }>
      exportProjectFile: (project: Project) => Promise<{ canceled: boolean; filePath?: string }>
      importProjectFile: () => Promise<{ canceled: boolean; project?: Project }>
      exportThreatsCsv: (csv: string, suggestedName: string) => Promise<{ canceled: boolean; filePath?: string }>
      exportDiagramImage: (
        dataUrl: string,
        format: 'png' | 'svg',
        suggestedName: string
      ) => Promise<{ canceled: boolean; filePath?: string }>
      exportModelFile: (
        content: string,
        suggestedName: string,
        kind: 'sarif' | 'otm'
      ) => Promise<{ canceled: boolean; filePath?: string }>
    }
  }
}

export {}
