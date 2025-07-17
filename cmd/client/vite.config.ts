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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React and core dependencies
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI components
          'ui-vendor': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-label', 
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            'lucide-react',
            'sonner'
          ],
          
          // Markdown and syntax highlighting
          'markdown-vendor': [
            'react-markdown',
            'remark-gfm',
            'remark-breaks', 
            'rehype-highlight',
            'highlight.js'
          ],
          
          // Assistant UI
          'assistant-vendor': [
            '@assistant-ui/react',
            '@assistant-ui/react-markdown'
          ],
          
          // Utilities
          'util-vendor': [
            'clsx',
            'tailwind-merge',
            'class-variance-authority'
          ]
        }
      }
    }
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
