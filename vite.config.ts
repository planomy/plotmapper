import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// GitHub Pages project site: https://planomy.github.io/plotmapper/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/plotmapper/' : '/',
  plugins: [react(), tailwindcss()],
})
