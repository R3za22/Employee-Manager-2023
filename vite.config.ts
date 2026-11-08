import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist', sourcemap: false },
  define: { __DEMO__: JSON.stringify(mode === 'demo') },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}))
