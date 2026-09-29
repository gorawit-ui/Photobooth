import { createReadStream, copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 * Serve MediaPipe's WASM runtime from /mediapipe/ (dev) and copy it into
 * dist/mediapipe/ (build), so person segmentation works fully offline
 * without committing ~23 MB of WASM to git.
 */
function mediapipeWasm(): Plugin {
  const srcDir = resolve(__dirname, 'node_modules/@mediapipe/tasks-vision/wasm');
  const files = () => readdirSync(srcDir).filter((f) => /^vision_wasm(_nosimd)?_internal\.(js|wasm)$/.test(f));
  let outDir = 'dist';
  return {
    name: 'mediapipe-wasm',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use('/mediapipe/', (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '');
        if (!files().includes(name)) return next();
        res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
        createReadStream(join(srcDir, name)).pipe(res);
      });
    },
    closeBundle() {
      const dest = join(outDir, 'mediapipe');
      mkdirSync(dest, { recursive: true });
      files().forEach((f) => copyFileSync(join(srcDir, f), join(dest, f)));
    },
  };
}

// HTTPS (self-signed) is required for camera access on iPad over Wi-Fi.
// server.host = true exposes the dev server on the local network.
export default defineConfig({
  plugins: [react(), basicSsl(), mediapipeWasm()],
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
