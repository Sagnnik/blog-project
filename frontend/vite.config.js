import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    watch: { usePolling: true },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('froala-editor')) return 'froala'
          if (id.includes('react') || id.includes('react-dom')) return 'react'
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
