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

export const PAGES_ORIGIN = 'https://no1zilla.github.io/cat-empire';

export function catSpriteRel(level) {
  const n = Math.min(15, Math.max(1, Math.round(Number(level) || 1)));
  return `assets/cats/cat_${n}.png`;
}

/** Кандидатные URL спрайта: iframe без слэша, затем абсолютный Pages. */
export function catSpriteUrls(level, locationHref = '') {
  const rel = catSpriteRel(level);
  const urls = [];
  const push = (u) => {
    if (u && !urls.includes(u)) urls.push(u);
  };
  push(resolvePublicAsset(rel, locationHref));
  push(`${PAGES_ORIGIN}/${rel}`);
  return urls;
}

export default publicAsset;
