import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
        presets: ['@babel/preset-typescript'],
      },
    }),
  ],
  server: {
    fs: {
      strict: false,
      allow: ['..']
    },
    hmr: {
      overlay: false
    }
  },
  resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      exclude: ['firebase-admin', 'firebase-admin/firestore', 'firebase-functions'],
    }
})
