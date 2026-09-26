import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: '@tasksync/shared/utils', replacement: path.resolve(__dirname, '../../shared/utils/ai-parse.ts') },
      { find: '@tasksync/shared/types', replacement: path.resolve(__dirname, '../../shared/types/index.ts') },
      { find: '@tasksync/shared/constants', replacement: path.resolve(__dirname, '../../shared/constants/index.ts') },
      { find: '@tasksync/shared', replacement: path.resolve(__dirname, '../../shared/index.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
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
