import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

let electronPlugin: any[] = []
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('vite-plugin-electron')
  // Check if electron binary is available
  require('electron')
  electronPlugin = [
    electron.default
      ? electron.default([
          {
            entry: 'electron/main.ts',
            vite: {
              build: {
                outDir: 'dist-electron',
              },
            },
          },
          {
            entry: 'electron/preload.ts',
            onstart(options: any) {
              options.reload()
            },
            vite: {
              build: {
                outDir: 'dist-electron',
              },
            },
          },
        ])
      : null,
  ].filter(Boolean)
} catch (e) {
  console.warn('[WARN] Electron not available, running in web-only mode')
}

export default defineConfig({
  plugins: [react(), ...electronPlugin],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
})
