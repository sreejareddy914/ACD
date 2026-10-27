import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'demo',
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    open: false
  },
  build: {
    outDir: resolve(__dirname, 'dist-demo'),
    emptyOutDir: true
  }
});
