import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function projectsDir() {
  return path.join(app.getPath('userData'), 'projects')
}

async function ensureProjectsDir() {
  await fs.mkdir(projectsDir(), { recursive: true })
}

ipcMain.handle('projects:list', async () => {
  await ensureProjectsDir()
  const files = await fs.readdir(projectsDir())
  const projects = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => JSON.parse(await fs.readFile(path.join(projectsDir(), f), 'utf-8')))
  )
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
})

ipcMain.handle('projects:create', async (_event, input) => {
  await ensureProjectsDir()
  const now = new Date().toISOString()
  const project = {
    id: randomUUID(),
    name: input.name,
    description: input.description ?? '',
    frameworks: input.frameworks,
    diagram: { nodes: [], edges: [] },
    threats: [],
    createdAt: now,
    updatedAt: now,
  }
  await fs.writeFile(path.join(projectsDir(), `${project.id}.json`), JSON.stringify(project, null, 2))
  return project
})

ipcMain.handle('projects:get', async (_event, id) => {
  const raw = await fs.readFile(path.join(projectsDir(), `${id}.json`), 'utf-8')
  const project = JSON.parse(raw)
  if (!project.diagram) project.diagram = { nodes: [], edges: [] }
  if (!project.threats) project.threats = []
  if (!project.pasta) project.pasta = {}
  if (!project.subDiagrams) project.subDiagrams = {}
  if (!project.revisionHistory) project.revisionHistory = []
  if (!project.revisionCount) project.revisionCount = 0
  return project
})

ipcMain.handle('projects:save', async (_event, project) => {
  const updated = { ...project, updatedAt: new Date().toISOString() }
  await fs.writeFile(path.join(projectsDir(), `${updated.id}.json`), JSON.stringify(updated, null, 2))
  return updated
})

ipcMain.handle('projects:delete', async (_event, id) => {
  await fs.rm(path.join(projectsDir(), `${id}.json`), { force: true })
})

ipcMain.handle('projects:export-file', async (event, project) => {
  const parentWindow = BrowserWindow.fromWebContents(event.sender)
  const safeName = project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const { canceled, filePath } = await dialog.showSaveDialog(parentWindow, {
    title: 'Export Project File',
    defaultPath: `${safeName}.tmproj.json`,
    filters: [{ name: 'Threat Model Project', extensions: ['json'] }],
  })
  if (canceled || !filePath) return { canceled: true }
  await fs.writeFile(filePath, JSON.stringify(project, null, 2))
  return { canceled: false, filePath }
})

ipcMain.handle('projects:import-file', async (event) => {
  const parentWindow = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
    title: 'Import Project File',
    properties: ['openFile'],
    filters: [{ name: 'Threat Model Project', extensions: ['json'] }],
  })
  if (canceled || filePaths.length === 0) return { canceled: true }

  const raw = await fs.readFile(filePaths[0], 'utf-8')
  const parsed = JSON.parse(raw)
  if (!parsed.name || !parsed.diagram) {
    throw new Error('This file does not look like a valid project export.')
  }

  await ensureProjectsDir()
  const now = new Date().toISOString()
  const project = {
    ...parsed,
    id: randomUUID(),
    threats: parsed.threats ?? [],
    createdAt: now,
    updatedAt: now,
  }
  await fs.writeFile(path.join(projectsDir(), `${project.id}.json`), JSON.stringify(project, null, 2))
  return { canceled: false, project }
})

ipcMain.handle('reports:export-pdf', async (event, { html, suggestedName }) => {
  const parentWindow = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePath } = await dialog.showSaveDialog(parentWindow, {
    title: 'Export Report',
    defaultPath: suggestedName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return { canceled: true }

  const tempHtmlPath = path.join(os.tmpdir(), `tm-report-${randomUUID()}.html`)
  await fs.writeFile(tempHtmlPath, html, 'utf-8')

  const renderWindow = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  try {
    await renderWindow.loadFile(tempHtmlPath)
    const pdfBuffer = await renderWindow.webContents.printToPDF({
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    })
    await fs.writeFile(filePath, pdfBuffer)
  } finally {
    renderWindow.destroy()
    await fs.rm(tempHtmlPath, { force: true })
  }

  return { canceled: false, filePath }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Only reference links opened via target="_blank" (the Threats tab's
  // CAPEC/CWE citations, Release 7) trigger this — everything else in the
  // app navigates in place. Without it, window.open() either does nothing
  // or opens an unstyled second Electron window; this sends it to the
  // user's actual browser instead and blocks the in-app popup either way.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (DEV_SERVER_URL) {
    win.loadURL(DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  console.log('[electron] app ready, creating window')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
