import { defineConfig } from 'vite';

export default defineConfig({
  base: '/cat-empire/',
  build: {
    outDir: 'dist'
  },
  server: {
    port: 5173
  }
});
