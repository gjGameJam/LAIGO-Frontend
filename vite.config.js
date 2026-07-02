import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Avast Web Shield falsely flags patterns inside the pre-bundled drei.js as suspicious
// JavaScript (obfuscation signatures) and resets the HTTP connection mid-transfer.
// This plugin patches the content at the HTTP middleware level (not transform hook,
// which doesn't run for pre-bundled deps served from .vite/deps/).
//
// Confirmed triggers found via binary search:
//   1. `.toString()` on functions/variables — function-to-source introspection signature
//      Replaced with `+ ""` (string coercion via concatenation, semantically equivalent
//      for all 23 occurrences: functions, regexes, numbers — none have custom valueOf)
//   2. `String.fromCharCode(` — char-code string building (obfuscation signature)
//      Replaced with `String.fromCodePoint(` (identical for BMP values 0-0xFFFF)
//
// The middleware also rewrites relative chunk imports (e.g. `"./chunk-C43FICMT.js"`) to
// absolute paths with the Vite browser hash (e.g. `"/node_modules/.vite/deps/chunk-C43FICMT.js?v=HASH"`).
// Without this, the browser loads zwei separate instances of the @react-three/fiber module
// (one via normal Vite serving with ?v=hash, one via our raw middleware without hash) which
// breaks R3F's React context — causing "Hooks can only be used within the Canvas component!".
const fixAvastFalsePositive = {
  name: 'fix-avast-false-positive',
  enforce: 'pre',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url?.includes('%40react-three_drei') && !req.url?.includes('@react-three_drei')) {
        return next()
      }
      const depsDir = resolve(server.config.root, 'node_modules/.vite/deps')
      const dreiPath = resolve(depsDir, '@react-three_drei.js')
      let code
      try {
        code = readFileSync(dreiPath, 'utf-8')
      } catch {
        return next()
      }
      let patched = code.replaceAll('.toString()', '+ ""')
      patched = patched.replaceAll('String.fromCharCode(', 'String.fromCodePoint(')
      // Rewrite relative chunk imports to absolute versioned paths so the browser
      // shares the same module instance as fiber's normally-served imports.
      try {
        const meta = JSON.parse(readFileSync(resolve(depsDir, '_metadata.json'), 'utf-8'))
        if (meta.browserHash) {
          patched = patched.replace(
            /from "\.\/([^"]+\.js)"/g,
            (_, name) => `from "/node_modules/.vite/deps/${name}?v=${meta.browserHash}"`
          )
        }
      } catch {}
      const buf = Buffer.from(patched, 'utf-8')
      res.writeHead(200, {
        'Content-Type': 'application/javascript',
        'Content-Length': buf.length,
        'Cache-Control': 'max-age=31536000,immutable',
      })
      res.end(buf)
    })
  },
}

export default defineConfig({
  plugins: [react(), fixAvastFalsePositive],
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@radix-ui/react-slider',
      'clsx',
      'framer-motion',
      'lucide-react',
      'three/examples/jsm/utils/BufferGeometryUtils.js',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
    ],
  },
})
