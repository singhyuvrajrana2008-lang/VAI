import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiTarget = process.env.VITE_DEV_API_TARGET ?? 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    proxy: {
      // Keeps browser requests same-origin behind dev servers and remote previews.
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  preview: { host: true, port: 3000 },
});
