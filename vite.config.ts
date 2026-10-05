import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

// Runtime target: Node.js via Nitro (`.output/server/index.mjs`).
// Application model is unchanged: the data layer stays local-first
// (localStorage on the client); no backend/database is introduced here.
export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src',
    }),
    // react's vite plugin must come after start's vite plugin
    viteReact(),
    nitro(),
  ],
})
