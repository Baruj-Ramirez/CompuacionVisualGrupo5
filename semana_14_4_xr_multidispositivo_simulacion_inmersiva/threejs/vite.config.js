import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS is required for WebXR APIs in production and cross-device testing.
// basicSsl generates a self-signed certificate for the local dev server.
export default defineConfig({
  plugins: [basicSsl()],
  server: {
    https: true,
    host: true,   // expose on LAN so a headset on the same network can connect
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) requires manualChunks to be a function
        manualChunks(id) {
          if (id.includes('node_modules/three'))           return 'three';
          if (id.includes('node_modules/webxr-polyfill'))  return 'webxr-polyfill';
        },
      },
    },
  },
});
