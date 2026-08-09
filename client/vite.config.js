import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // Exclude directories that must never trigger a rebuild.
      // The 'dist' folder is the build output — watching it causes
      // a feedback loop where building triggers a reload which triggers a rebuild.
      // node_modules is excluded by Vite by default but we make it explicit.
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
    // Use polling only if iCloud Drive is syncing the folder.
    // Since we are cleaning up iCloud workarounds, disable polling for performance.
    // Set to true and adjust interval if file changes are not detected.
    // usePolling: false,
  },
  optimizeDeps: {
    // Force Vite to not re-scan on every restart.
    // Remove this if you add new dependencies that need pre-bundling.
    force: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.jsx'],
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
  },
})

