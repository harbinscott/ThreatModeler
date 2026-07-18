import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Packaged Electron loads dist/index.html via file:// (see electron/main.js's
  // loadFile), where Vite's default root-absolute asset paths ("/assets/...")
  // resolve to the filesystem root instead of the dist folder. Relative paths
  // fix that while staying correct for the dev server too.
  base: './',
  plugins: [react()],
})
