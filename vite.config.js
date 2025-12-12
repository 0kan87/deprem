import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: './',
  plugins: [
    svelte()
  ],
  build: {
    // Optimize bundle splitting
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet'],
          socket: ['socket.io-client']
        }
      }
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minify for production
    minify: 'esbuild',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000
  },
  server: {
    // HTTP/2 for dev server
    https: false,
    // Enable compression
    middlewareMode: false
  },
  // Optimize deps
  optimizeDeps: {
    include: ['leaflet', 'socket.io-client'],
    exclude: []
  }
});
