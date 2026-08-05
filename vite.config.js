import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  define: {
    __PLATFORM__: JSON.stringify(process.env.PLATFORM || 'vk')
  },
  build: {
    outDir: 'dist'
  },
  server: {
    port: 5173,
    allowedHosts: true
  }
});
