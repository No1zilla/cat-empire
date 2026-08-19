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
  },
  plugins: [
    {
      name: 'stub-api-on-vite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end('{"ok":false}');
            return;
          }
          next();
        });
      }
    }
  ]
});
