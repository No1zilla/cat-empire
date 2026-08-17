import { Assets, Texture } from 'pixi.js';
import { publicAsset } from './publicAsset.js';

let textures = null;
let uiTextures = {};

export const GREEN_EYES_REL = 'assets/cats/green_eyes_gift.jpg';
export const GREEN_EYES_PAGES_URL = 'https://no1zilla.github.io/cat-empire/assets/cats/green_eyes_gift.jpg';

/**
 * Загрузка 15 индивидуальных прозрачных 256x256 PNG спрайтов котиков + 3D UI артов.
 * Вызывать один раз перед game.init().
 */
export async function loadCatTextures() {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  textures = {};
  uiTextures = {};

  for (let level = 1; level <= 15; level++) {
    try {
      textures[level] = await Assets.load(`${base}assets/cats/cat_${level}.png`);
    } catch (e) {
      console.warn(`Failed to load cat_${level}.png, fallback to emoji:`, e);
      textures[level] = null;
    }
  }

  try { uiTextures.pedestal_gold = await Assets.load(`${base}assets/ui/pedestal_gold.jpg`); } catch (e) {}
  try { uiTextures.logo = await Assets.load(`${base}assets/ui/logo_cat_empire.jpg`); } catch (e) {}
  try { uiTextures.btn_buy_pink = await Assets.load(`${base}assets/ui/btn_buy_pink.jpg`); } catch (e) {}
  try {
    await loadGreenEyesTexture();
  } catch (e) {
    console.warn('⚠️ Не удалось предзагрузить green_eyes_gift.jpg:', e);
  }

  console.log('🎨 Текстуры загружены!');
  return textures;
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

async function tryLoadTexture(url) {
  try {
    return await Assets.load(url);
  } catch (e) {
    return await loadTextureFromImage(url);
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
