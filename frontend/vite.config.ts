import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3000', // Change this if your backend runs on a different port
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/auth/, '/auth'),
        // rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})
