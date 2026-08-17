/**
 * URL статики из public/, устойчивый к iframe VK без завершающего слэша.
 * `./assets/...` при href=.../cat-empire (без /) уезжает на github.io/assets/... — 404.
 */
export function resolvePublicAsset(relPath, locationHref = '') {
  const rel = String(relPath || '').replace(/^\.?\//, '');
  const href = String(locationHref || 'https://example.com/').split('#')[0].split('?')[0];
  const last = href.split('/').pop() || '';
  const dir = /\.[a-zA-Z0-9]+$/.test(last)
    ? href.replace(/\/[^/]+$/, '/')
    : href.replace(/\/?$/, '/');
  try {
    return new URL(rel, dir).href;
  } catch (e) {
    return rel;
  }
}

export function publicAsset(relPath) {
  if (typeof window !== 'undefined' && window.location && window.location.href) {
    return resolvePublicAsset(relPath, window.location.href);
  }
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
  return `${String(base).replace(/\/?$/, '/')}${String(relPath || '').replace(/^\.?\//, '')}`;
}

export default publicAsset;
