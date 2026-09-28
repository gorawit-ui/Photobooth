import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS (self-signed) is required for camera access on iPad over Wi-Fi.
// server.host = true exposes the dev server on the local network.
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: ['es2020', 'safari14', 'chrome90', 'edge90'],
  },
});
