import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // drei pulls deps lazily via its barrel; without listing them up front,
    // Vite re-optimizes mid-session when the scene first mounts and the
    // browser ends up holding a now-stale dep hash (504 Outdated Optimize Dep).
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
    ],
  },
})
