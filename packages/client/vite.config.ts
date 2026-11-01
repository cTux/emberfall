import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import { compression } from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'node:url';
import { Agent } from 'node:https';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export default defineConfig(({ command, mode }) => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const env = {
    ...loadEnv(mode, root, ''),
    ...loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), ''),
    ...process.env,
  };
  const buildId = command === 'build' ? randomUUID() : 'development';
  const shared = {
    base: env.PAGES_BASE_PATH || '/',
    define: {
      __BUILD_ID__: JSON.stringify(buildId),
      'import.meta.env.BASE_API': JSON.stringify(env.BASE_API || ''),
      'import.meta.env.BASE_PORT': JSON.stringify(env.BASE_PORT || ''),
    },
    plugins: [
      react(),
      ViteImageOptimizer({
        test: /\.png$/i,
        includePublic: true,
        png: { compressionLevel: 9, adaptiveFiltering: true, palette: false, progressive: true },
      }),
      {
        name: 'client-version',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'version.json',
            source: JSON.stringify({ buildId }),
          });
        },
        configureServer(server) {
          server.middlewares.use('/version.json', (_req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify({ buildId }));
          });
        },
      } satisfies import('vite').Plugin,
      compression({
        algorithms: ['brotliCompress', 'gzip'],
        include: /\.(js|mjs|css|html|json|svg)$/,
        exclude: /(^|\/)version\.json$/,
        threshold: 1024,
      }),
      mode === 'analyze' &&
        visualizer({
          filename: fileURLToPath(
            new URL('./node_modules/.cache/bundle-report.html', import.meta.url),
          ),
          gzipSize: true,
          brotliSize: true,
          open: false,
        }),
    ],
  };

  if (command === 'build') {
    return { ...shared, build: { manifest: true } };
  }

  const cert = readFileSync(new URL('../../.certs/localhost.pem', import.meta.url));
  const serverPort = env.BASE_PORT ?? env.PORT_NEW ?? '4003';

  return {
    ...shared,
    server: {
      port: 5174,
      strictPort: true,
      https: {
        cert,
        key: readFileSync(new URL('../../.certs/localhost-key.pem', import.meta.url)),
      },
      proxy: {
        '/auth': { target: `https://127.0.0.1:${serverPort}`, agent: new Agent({ ca: cert }) },
        '/api': { target: `https://127.0.0.1:${serverPort}`, agent: new Agent({ ca: cert }) },
        '/matchmake': { target: `https://127.0.0.1:${serverPort}`, agent: new Agent({ ca: cert }) },
        '/colyseus': {
          target: `wss://127.0.0.1:${serverPort}`,
          ws: true,
          rewrite: (path) => {
            return path.replace(/^\/colyseus/, '');
          },
          agent: new Agent({ ca: cert }),
        },
      },
    },
  };
});
