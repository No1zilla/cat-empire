import { Assets } from 'pixi.js';

let textures = null;

/**
 * Загрузка 15 индивидуальных прозрачных 256x256 PNG спрайтов котиков.
 * Вызывать один раз перед game.init().
 */
export async function loadCatTextures() {
  const base = import.meta.env.BASE_URL; // '/cat-empire/' на gh-pages, '/' локально
  const promises = [];

  for (let level = 1; level <= 15; level++) {
    promises.push(Assets.load(`${base}assets/cats/cat_${level}.png`));
  }

  const loaded = await Promise.all(promises);
  textures = {};

  for (let level = 1; level <= 15; level++) {
    textures[level] = loaded[level - 1];
  }

  console.log('🎨 Все 15 прозрачных спрайтов котиков загружены!');
  return textures;
}

/**
 * Получить текстуру для заданного уровня (1-15).
 */
export function getCatTexture(level) {
  if (!textures) return null;
  return textures[Math.min(Math.max(level, 1), 15)] || null;
}
