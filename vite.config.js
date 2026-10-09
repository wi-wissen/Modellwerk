import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { EXAMPLES } from './src/examples.js'

const here = import.meta.dirname
const GUIDE_TEMPLATE = 'examples/_guide/index.html'
const PLACEHOLDER = '%EXAMPLE_ID%'

// One guide page per example: examples/<id>/index.html, built from a shared template.
function guidePages() {
  return {
    name: 'modellwerk-guide-pages',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/examples\/([a-z0-9-]+)\/(?:index\.html)?(?:[?#].*)?$/)
        if (!match || !EXAMPLES.some((e) => e.id === match[1])) return next()
        const html = readFileSync(resolve(here, GUIDE_TEMPLATE), 'utf8').replace(PLACEHOLDER, match[1])
        res.setHeader('Content-Type', 'text/html')
        res.end(await server.transformIndexHtml(req.url, html, `/${GUIDE_TEMPLATE}`))
      })
    },
    closeBundle() {
      const out = resolve(here, 'dist')
      const template = readFileSync(resolve(out, GUIDE_TEMPLATE), 'utf8')
      for (const ex of EXAMPLES) {
        mkdirSync(resolve(out, 'examples', ex.id), { recursive: true })
        writeFileSync(resolve(out, 'examples', ex.id, 'index.html'), template.replace(PLACEHOLDER, ex.id))
      }
      rmSync(resolve(out, 'examples/_guide'), { recursive: true, force: true })
    },
  }
}

// Build modes:
//   (default)      website: landing page /, examples /examples/…, app /app/  → dist/
//   --mode app     the app alone, for the Tauri desktop/mobile shell         → dist-app/
//   --mode single  the app as one self-contained offline HTML file           → dist-single/
export default defineConfig(({ mode }) => {
  const standalone = mode === 'app' || mode === 'single'
  return {
    root: standalone ? resolve(here, 'app') : here,
    base: './',
    plugins: [
      vue(),
      tailwindcss(),
      ...(mode === 'single' ? [viteSingleFile()] : []),
      ...(standalone ? [] : [guidePages()]),
    ],
    server: { fs: { allow: [here] } },
    build: {
      outDir: resolve(here, mode === 'single' ? 'dist-single' : standalone ? 'dist-app' : 'dist'),
      emptyOutDir: true,
      rollupOptions: standalone ? undefined : {
        input: {
          landing: resolve(here, 'index.html'),
          app: resolve(here, 'app/index.html'),
          examples: resolve(here, 'examples/index.html'),
          guide: resolve(here, GUIDE_TEMPLATE),
        },
      },
    },
    test: { root: here, environment: 'node' },
  }
})
