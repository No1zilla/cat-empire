import { Assets } from 'pixi.js';

let textures = null;
let uiTextures = {};

/**
 * Загрузка 15 индивидуальных прозрачных 256x256 PNG спрайтов котиков + 3D UI артов.
 * Вызывать один раз перед game.init().
 */
export async function loadCatTextures() {
  const base = import.meta.env.BASE_URL; // '/cat-empire/' на gh-pages, '/' локально
  const promises = [];

  for (let level = 1; level <= 15; level++) {
    promises.push(Assets.load(`${base}assets/cats/cat_${level}.png`));
  }

  // Загружаем 3D активы из промо-артов
  promises.push(Assets.load(`${base}assets/ui/pedestal_gold.jpg`));
  promises.push(Assets.load(`${base}assets/ui/logo_cat_empire.jpg`));

  const loaded = await Promise.all(promises);
  textures = {};

  for (let level = 1; level <= 15; level++) {
    textures[level] = loaded[level - 1];
  }

  uiTextures['pedestal_gold'] = loaded[15];
  uiTextures['logo'] = loaded[16];

  console.log('🎨 Все 15 спрайтов и 3D UI-активы загружены!');
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
