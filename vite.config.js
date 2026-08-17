import { defineConfig } from 'vite';

const pagesBase = process.env.VK_PAGES_BASE || './';

export default defineConfig({
  base: pagesBase.endsWith('/') || pagesBase === './' ? pagesBase : `${pagesBase}/`,
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
