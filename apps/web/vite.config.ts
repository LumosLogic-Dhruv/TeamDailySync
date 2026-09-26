import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tasksync/shared': path.resolve(__dirname, '../../shared/index.ts'),
      '@tasksync/shared/utils': path.resolve(__dirname, '../../shared/utils'),
      '@tasksync/shared/types': path.resolve(__dirname, '../../shared/types'),
      '@tasksync/shared/constants': path.resolve(__dirname, '../../shared/constants'),
    },
  },
  server: {
    watch: {
      // OneDrive/backup tools can touch build artifacts and cause spurious reloads
      ignored: ['**/dist/**', '**/dist-server/**', '**/data/**', '**/*.log'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
