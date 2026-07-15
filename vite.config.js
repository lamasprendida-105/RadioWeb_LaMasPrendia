import { defineConfig } from 'vite';

export default defineConfig({
  // Servidor de desarrollo
  server: {
    port: 5173,
    // Corrige el error de WebSocket HMR (hot module replacement)
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },

  // Build de producción
  build: {
    // Divide el bundle para mejor caché
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
