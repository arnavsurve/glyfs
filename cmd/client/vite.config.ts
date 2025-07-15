import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const __dirname = path.resolve()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/signup': 'http://localhost:8080',
      '/login': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
      '/agent': 'http://localhost:8080',
    }
  }
})
