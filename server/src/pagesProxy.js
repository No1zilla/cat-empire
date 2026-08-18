const PAGES_ORIGIN = 'https://no1zilla.github.io/cat-empire';

export function rewriteGithubPages(body, contentType = '') {
  if (!contentType || !/html|javascript|css|json/i.test(contentType)) return body;
  return String(body).split(PAGES_ORIGIN).join('');
}

export function pagesUpstreamPath(reqPath = '/') {
  const path = String(reqPath || '/');
  if (path === '/' || path === '') return '/index.html';
  return path;
}

export function shouldProxyToPages(req) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return false;
  const path = String(req.path || '/');
  if (path.startsWith('/api') || path.startsWith('/admin')) return false;
  return true;
}

export async function fetchGithubPages(reqPath, search = '') {
  const url = `${PAGES_ORIGIN}${pagesUpstreamPath(reqPath)}${search || ''}`;
  const upstream = await fetch(url, {
    redirect: 'follow',
    headers: { Accept: '*/*' }
  });
  const buf = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const rewritten = /html|javascript|css/i.test(contentType)
    ? Buffer.from(rewriteGithubPages(buf.toString('utf8'), contentType))
    : buf;
  return { status: upstream.status, contentType, body: rewritten };
}
