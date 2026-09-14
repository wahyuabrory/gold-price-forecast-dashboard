import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendEnvPath = path.resolve(__dirname, '..', 'backend', '.env')

function getBackendPort() {
  try {
    const envContents = fs.readFileSync(backendEnvPath, 'utf8')
    const match = envContents.match(/^\s*PORT\s*=\s*(\d+)\s*$/m)
    if (match) {
      return Number.parseInt(match[1], 10)
    }
  } catch {
    return 5000
  }

  return 5000
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${getBackendPort()}`,
        changeOrigin: true,
      },
    },
  },
})
