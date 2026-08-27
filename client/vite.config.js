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

// Il package.json di root sta fuori da client/, quindi in un build con root
// directory su client/ (com'e' quello di Railway) non e' nel contesto e la
// lettura fallisce. Una versione mancante non e' un buon motivo per far cadere
// il build: ripieghiamo su quella gia' in ambiente, poi sul package.json locale.
function readVersion() {
  const candidates = [packageJsonPath, path.resolve(__dirname, 'package.json')]
  for (const candidate of candidates) {
    try {
      return JSON.parse(readFileSync(candidate, 'utf-8')).version
    } catch {
      // fuori dal contesto di build o illeggibile: passiamo al prossimo
    }
  }
  return null
}

process.env.VITE_APP_VERSION = process.env.VITE_APP_VERSION || readVersion() || '0.0.0'

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
