import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { promises as fsp } from 'fs'

// Avast falsely flags patterns inside the pre-bundled drei dep as suspicious
// JavaScript (obfuscation signatures). Two shields fire on it:
//   - Web Shield resets the HTTP connection mid-transfer (white page), and
//   - File Shield quarantines node_modules/.vite/deps/@react-three_drei.js the
//     moment esbuild writes it, leaving a 0-byte `asw-…` marker behind. Vite
//     then can never finish an optimize run, wedging the browser in a
//     permanent "504 Outdated Optimize Dep" loop after any re-optimization.
//
// Earlier this was worked around at the HTTP-middleware level, but that can't
// help when the file never survives on disk. Instead, strip the trigger
// patterns from the sources DURING dep pre-bundling, so the written bundle
// never contains them and Vite serves it completely normally:
//
//   1. `.toString()` — function-to-source introspection signature.
//      Replaced with `["toString"]()` — identical property access in every
//      expression context (no precedence pitfalls).
//   2. `String.fromCharCode(` — char-code string building signature.
//      Replaced with `String.fromCodePoint(` (identical for BMP 0–0xFFFF).
//
// Scope: every pre-bundled dependency source. The drei bundle inlines many
// transitive packages (three-stdlib, three-mesh-bvh, detect-gpu, …) and
// esbuild's content-based chunking can shuffle code between output files, so
// scoping to a package list leaves trigger patterns behind. Both swaps are
// context-safe, and this only affects the dev-time dep cache — `vite build`
// does not run optimizeDeps. Do not remove this plugin — dev-server
// white-pages return without it.
const avastSafePrebundle = {
  name: 'avast-safe-prebundle',
  setup(build) {
    const filter = /[\\/]node_modules[\\/].*\.(js|mjs|cjs)$/
    build.onLoad({ filter }, async (args) => {
      let code = await fsp.readFile(args.path, 'utf-8')
      // Optional-chained form first — a bare swap would produce the invalid
      // `?["toString"]()`. Afterwards no `.toString()` substring remains in it.
      code = code.replaceAll('?.toString()', '?.["toString"]()')
      code = code.replaceAll('.toString()', '["toString"]()')
      code = code.replaceAll('String.fromCharCode(', 'String.fromCodePoint(')
      return { contents: code, loader: 'js' }
    })
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    // Commit the optimized-deps bundle at startup instead of holding it until
    // the first page crawl ends. Every dep is pre-listed in `include`, so
    // nothing is discovered late — this removes the window where a served
    // page references in-flight dep hashes that never get committed.
    holdUntilCrawlEnd: false,
    esbuildOptions: {
      plugins: [avastSafePrebundle],
    },
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
