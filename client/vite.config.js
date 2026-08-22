import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { readFileSync } from 'fs'

// Versione mostrata in /settings: il semver del package.json alla radice, alzato
// con `npm run v:patch|v:minor|v:major` secondo i criteri in CLAUDE.md.
// Vite valuta questo file una volta sola all'avvio, quindi in dev la versione si
// aggiorna al riavvio del dev server.
const packageVersion = JSON.parse(
  readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
).version

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(packageVersion),
  },
    resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
