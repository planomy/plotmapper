import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// - base: './' so JS/CSS resolve when the app is opened from a subpath (some IDE previews, GitHub Pages project sites).
// - allowedHosts: Cursor / tunnel previews often use a non-localhost Host header; Vite 6+ may respond 403 without this.
// For a fixed absolute base (e.g. CDN): vite build --base https://cdn.example.com/foo/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  /** GitHub Pages: Settings → Pages → branch `main`, folder `/docs` (no Actions). */
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: false,
    allowedHosts: true,
  },
})
