import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages project sites serve from https://<user>.github.io/<repo>/, not
// from the domain root - `base` must match that subpath so every built
// asset URL resolves correctly. Only applied to `vite build` so the local
// dev server keeps running at "/" (preview_start etc. hit localhost:5173
// directly, not localhost:5173/1dt1/).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/1dt1/' : '/',
  plugins: [react()],
}))
