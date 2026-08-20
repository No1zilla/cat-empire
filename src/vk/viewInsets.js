/**
 * Отступы VK Mini App: статус-бар, крестик, логотип, home indicator.
 * Без них HUD на iPhone заезжает под хром VK.
 */

export const EMPTY_INSET = { top: 0, right: 0, bottom: 0, left: 0 };

/** Ряд крестика / логотипа VK, если кабинет не прислал insets. */
export const VK_MOBILE_CHROME_TOP = 52;

/** Минимум сверху на iPhone, когда insets пустые (notch + хром). */
export const VK_IPHONE_TOP_FALLBACK = 88;

/** Home indicator, если insets.bottom пустой. */
export const VK_MOBILE_BOTTOM_FALLBACK = 20;

export function normalizeInset(raw) {
  const src = raw && typeof raw === 'object' ? raw : EMPTY_INSET;
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? Math.round(x) : 0;
  };
  return {
    top: n(src.top),
    right: n(src.right),
    bottom: n(src.bottom),
    left: n(src.left)
  };
}

export function mergeInsets(a, b) {
  const left = normalizeInset(a);
  const right = normalizeInset(b);
  return {
    top: Math.max(left.top, right.top),
    right: Math.max(left.right, right.right),
    bottom: Math.max(left.bottom, right.bottom),
    left: Math.max(left.left, right.left)
  };
}

export function readCssSafeArea(styleMap) {
  const read = (key) => {
    if (!styleMap) return 0;
    const raw = typeof styleMap.getPropertyValue === 'function'
      ? styleMap.getPropertyValue(key)
      : styleMap[key];
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  };
  return normalizeInset({
    top: read('--sat'),
    right: read('--sar'),
    bottom: read('--sab'),
    left: read('--sal')
  });
}

/**
 * Итоговые отступы контейнера.
 * vk — insets из GetConfig / UpdateConfig.
 * css — env(safe-area-inset-*).
 * Если VK молчит на телефоне, добавляем хром крестика, иначе HUD снова под логотипом.
 */
export function resolveViewInsets({ css, vk, platform } = {}) {
  const cssN = normalizeInset(css);
  const vkN = normalizeInset(vk);
  const merged = mergeInsets(cssN, vkN);
  const p = String(platform || '').toLowerCase();
  const isIphone = p.includes('iphone') || p.includes('ipad');
  const isAndroid = p.includes('android');
  const isMobileWeb = p === 'mobile_web';
  const isMobile = isIphone || isAndroid || isMobileWeb;

  if (isMobile && vkN.top === 0) {
    if (isIphone) {
      merged.top = Math.max(merged.top, cssN.top + VK_MOBILE_CHROME_TOP, VK_IPHONE_TOP_FALLBACK);
    } else {
      merged.top = Math.max(merged.top, cssN.top + VK_MOBILE_CHROME_TOP);
    }
  }
  if (isMobile && vkN.bottom === 0) {
    merged.bottom = Math.max(merged.bottom, cssN.bottom, VK_MOBILE_BOTTOM_FALLBACK);
  }
  return merged;
}

export function contentBoxSize(el, fallbackW = 410, fallbackH = 700) {
  if (!el) {
    return { w: Math.max(1, fallbackW), h: Math.max(1, fallbackH) };
  }
  let pl = 0;
  let pr = 0;
  let pt = 0;
  let pb = 0;
  if (typeof getComputedStyle === 'function') {
    const cs = getComputedStyle(el);
    pl = parseFloat(cs.paddingLeft) || 0;
    pr = parseFloat(cs.paddingRight) || 0;
    pt = parseFloat(cs.paddingTop) || 0;
    pb = parseFloat(cs.paddingBottom) || 0;
  }
  const w = (Number(el.clientWidth) || fallbackW) - pl - pr;
  const h = (Number(el.clientHeight) || fallbackH) - pt - pb;
  return {
    w: Math.max(1, Math.round(w)),
    h: Math.max(1, Math.round(h))
  };
}

export function applyContainerInsets(el, inset) {
  if (!el || !el.style) return;
  const n = normalizeInset(inset);
  el.style.paddingTop = `${n.top}px`;
  el.style.paddingRight = `${n.right}px`;
  el.style.paddingBottom = `${n.bottom}px`;
  el.style.paddingLeft = `${n.left}px`;
}

export default {
  normalizeInset,
  mergeInsets,
  readCssSafeArea,
  resolveViewInsets,
  contentBoxSize,
  applyContainerInsets
};
