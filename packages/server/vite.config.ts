import { defineConfig } from 'vite';
import { gameVersion } from '../../scripts/game-version.ts';
export default defineConfig({
  define: { __GAME_VERSION__: JSON.stringify(gameVersion()) },
  build: {
    ssr: 'src/index.ts',
    target: 'node24',
    outDir: 'dist',
    rollupOptions: { output: { entryFileNames: 'index.js' } },
  },
  ssr: { noExternal: ['@emberfall/common'] },
});
