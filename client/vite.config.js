import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { readFileSync } from 'fs'

// Versione mostrata in /settings: il semver del package.json alla radice, che
// l'hook .githooks/post-commit alza a ogni commit.
//
// Passa da process.env e non da `define`: il plugin vite:define esce subito in
// dev (`if (consumer === "client" && !isBuild) return`), quindi una costante
// dichiarata li' esisterebbe solo nella build e in `npm run dev` sarebbe un
// identificatore non definito. Vite invece raccoglie da process.env tutte le
// chiavi con prefisso VITE_ e le espone come import.meta.env in entrambi i casi.
const packageJsonPath = path.resolve(__dirname, '../package.json')
const packageVersion = JSON.parse(readFileSync(packageJsonPath, 'utf-8')).version
process.env.VITE_APP_VERSION = packageVersion

// Vite valuta questo file una volta sola, quindi in dev la versione resterebbe
// quella del momento in cui hai avviato il server. Dato che l'hook post-commit
// la alza a ogni commit, sarebbe vecchia quasi sempre: qui teniamo d'occhio
// package.json e facciamo ripartire il dev server quando cambia.
const restartOnVersionChange = {
  name: 'restart-on-version-change',
  configureServer(server) {
    server.watcher.add(packageJsonPath)
    server.watcher.on('change', (file) => {
      if (path.resolve(file) === packageJsonPath) server.restart()
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), restartOnVersionChange],
    resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
