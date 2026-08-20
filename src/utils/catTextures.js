import { Assets, Texture } from 'pixi.js';
import { publicAsset, catSpriteUrls, PAGES_ORIGIN } from './publicAsset.js';

let textures = null;
let uiTextures = {};
const textureListeners = [];
let notifyTimer = 0;

export const GREEN_EYES_REL = 'assets/cats/green_eyes_gift.jpg';
export const GREEN_EYES_PAGES_URL = `${PAGES_ORIGIN}/assets/cats/green_eyes_gift.jpg`;

export function whenCatTexturesChange(fn) {
  if (typeof fn === 'function') textureListeners.push(fn);
  return () => {
    const i = textureListeners.indexOf(fn);
    if (i >= 0) textureListeners.splice(i, 1);
  };
}

function notifyCatTextures() {
  if (notifyTimer) clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => {
    notifyTimer = 0;
    textureListeners.slice().forEach((fn) => {
      try { fn(); } catch (e) {}
    });
  }, 50);
}

/**
 * Загрузка 15 PNG котиков. В VK iframe `./assets` часто 404 — пробуем устойчивый URL,
 * потом абсолютный GitHub Pages. Не оставляем поле на эмодзи 👑🚀🐉 навсегда.
 */
export async function loadCatTextures() {
  const href = (typeof window !== 'undefined' && window.location && window.location.href) || '';
  textures = textures || {};
  uiTextures = uiTextures || {};

  const jobs = [];
  for (let level = 1; level <= 15; level++) {
    jobs.push(
      loadOneCat(level, href)
        .then((tex) => {
          textures[level] = tex;
          notifyCatTextures();
        })
        .catch((e) => {
          console.warn(`Failed to load cat_${level}.png, fallback to emoji:`, e);
          if (!textures[level]) textures[level] = null;
        })
    );
  }
  jobs.push(
    tryLoadTexture(publicAsset('assets/ui/pedestal_gold.jpg'))
      .then((tex) => { uiTextures.pedestal_gold = tex; })
      .catch(() => {})
  );
  jobs.push(
    tryLoadTexture(publicAsset('assets/ui/logo_cat_empire.jpg'))
      .then((tex) => { uiTextures.logo = tex; })
      .catch(() => {})
  );
  jobs.push(
    tryLoadTexture(publicAsset('assets/ui/btn_buy_pink.jpg'))
      .then((tex) => { uiTextures.btn_buy_pink = tex; })
      .catch(() => {})
  );
  await Promise.all(jobs);
  loadGreenEyesTexture().catch((e) => {
    console.warn('⚠️ Не удалось предзагрузить green_eyes_gift.jpg:', e);
  });

  console.log('🎨 Текстуры загружены!');
  notifyCatTextures();
  return textures;
}

async function loadOneCat(level, href) {
  let lastErr;
  for (const url of catSpriteUrls(level, href)) {
    try {
      const tex = await tryLoadTexture(url);
      if (tex) return tex;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`cat_${level} missing`);
}

function greenEyesUrls() {
  const urls = [];
  const resolved = publicAsset(GREEN_EYES_REL);
  if (resolved) urls.push(resolved);
  if (!urls.includes(GREEN_EYES_PAGES_URL)) urls.push(GREEN_EYES_PAGES_URL);
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
  const relative = `${String(base).replace(/\/?$/, '/')}${GREEN_EYES_REL}`;
  if (!urls.includes(relative)) urls.push(relative);
  return urls;
}

async function loadTextureFromImage(url) {
  if (typeof Image === 'undefined') throw new Error('no Image');
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error(`image error ${url}`));
    img.src = url;
  });
  return Texture.from(img);
}

async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout ${label}`)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function tryLoadTexture(url) {
  if (!url) throw new Error('empty texture url');
  try {
    return await withTimeout(Assets.load(url), 8000, url);
  } catch (e) {
    return await withTimeout(loadTextureFromImage(url), 8000, url);
  }
}

/**
 * Фотореалистичная зеленоглазая киса: Pixi Assets, затем HTML Image, затем Pages URL.
 */
export async function loadGreenEyesTexture() {
  if (uiTextures.green_eyes_gift) return uiTextures.green_eyes_gift;
  let lastErr;
  for (const url of greenEyesUrls()) {
    try {
      const tex = await tryLoadTexture(url);
      if (tex) {
        uiTextures.green_eyes_gift = tex;
        return tex;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('green_eyes_gift.jpg not loaded');
}

/**
 * Получить текстуру для заданного уровня (1-15).
 */
export function getCatTexture(level) {
  if (!textures) return null;
  return textures[Math.min(Math.max(level, 1), 15)] || null;
}

/**
 * Получить 3D UI текстуры (пьедестал, логотип)
 */
export function getUITexture(key) {
  return uiTextures[key] || null;
}
