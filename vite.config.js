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
        server.middlewares.use(async (req, res, next) => {
          const path = String(req.url || '').split('?')[0];
          const method = String(req.method || 'GET').toUpperCase();
          // Топ и health — только чтение с продакшена. Профиль/сейв не проксируем:
          // иначе локальный Vite подтягивает чужой облачный сейв.
          if (method === 'GET' && (path === '/api/leaderboard' || path === '/api/health')) {
            try {
              const upstream = await fetch(`https://cat-empire-production.up.railway.app${path}`);
              const buf = Buffer.from(await upstream.arrayBuffer());
              res.statusCode = upstream.status;
              res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
              res.end(buf);
            } catch {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(path === '/api/leaderboard' ? '{"leaderboard":[],"me":null}' : '{"status":"down"}');
            }
            return;
          }
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
