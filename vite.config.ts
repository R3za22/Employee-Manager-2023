import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

/** Inline the (small) stylesheet into index.html so it does not block rendering on a second request. */
function inlineCss(): Plugin {
  return {
    name: 'inline-css',
    enforce: 'post',
    apply: 'build',
    generateBundle(_, bundle) {
      const html = bundle['index.html']
      if (!html || html.type !== 'asset' || typeof html.source !== 'string') return
      let source = html.source
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === 'asset' && name.endsWith('.css') && typeof file.source === 'string') {
          const re = new RegExp(`<link rel="stylesheet"[^>]*href="[^"]*${name.split('/').pop()}"[^>]*>`)
          if (re.test(source)) {
            source = source.replace(re, () => `<style>${file.source}</style>`)
            delete bundle[name]
          }
        }
      }
      html.source = source
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), inlineCss()],
  base: './',
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist', sourcemap: false },
  define: { __DEMO__: JSON.stringify(mode === 'demo') },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}))
