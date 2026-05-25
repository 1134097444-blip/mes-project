import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2015',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5100', changeOrigin: true },
      '/service': { target: 'http://localhost:5100', changeOrigin: true },
      '/accounts': { target: 'http://localhost:5100', changeOrigin: true },
    }
  }
})
