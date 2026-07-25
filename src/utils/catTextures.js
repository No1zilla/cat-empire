import { Assets } from 'pixi.js';

let textures = null;
let uiTextures = {};

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

  try { uiTextures['pedestal_gold'] = await Assets.load(`${base}assets/ui/pedestal_gold.jpg`); } catch (e) {}
  try { uiTextures['logo'] = await Assets.load(`${base}assets/ui/logo_cat_empire.jpg`); } catch (e) {}
  try { uiTextures['btn_buy_pink'] = await Assets.load(`${base}assets/ui/btn_buy_pink.jpg`); } catch (e) {}

  console.log('🎨 Текстуры загружены!');
  return textures;
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
