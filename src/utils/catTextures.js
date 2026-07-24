import { Assets, Texture, Rectangle } from 'pixi.js';

// Размеры спрайт-листов (1280x853, 5 котиков в ряд)
const SHEET_WIDTH  = 1280;
const SHEET_HEIGHT = 853;
const CAT_WIDTH    = SHEET_WIDTH / 5;  // 256px
const CAT_HEIGHT   = SHEET_HEIGHT;     // 853px

let textures = null;

/**
 * Загрузка и нарезка всех спрайт-листов котиков.
 * Вызывать один раз перед game.init().
 */
export async function loadCatTextures() {
  const base = import.meta.env.BASE_URL; // '/cat-empire/' на gh-pages, '/' локально
  const [sheet1, sheet2, sheet3] = await Promise.all([
    Assets.load(`${base}assets/cats/cats_levels_1_5.jpg`),
    Assets.load(`${base}assets/cats/cats_levels_6_10.jpg`),
    Assets.load(`${base}assets/cats/cats_levels_11_15.jpg`),
  ]);

  const sheets = [sheet1, sheet2, sheet3];
  textures = {};

  for (let level = 1; level <= 15; level++) {
    const sheetIndex = Math.floor((level - 1) / 5); // 0, 1, 2
    const posInSheet = (level - 1) % 5;             // 0..4
    const sheet = sheets[sheetIndex];

    textures[level] = new Texture({
      source: sheet.source,
      frame: new Rectangle(
        posInSheet * CAT_WIDTH,
        0,
        CAT_WIDTH,
        CAT_HEIGHT
      )
    });
  }

  console.log('🎨 Текстуры котиков загружены (15 уровней)');
  return textures;
}

/**
 * Получить текстуру для заданного уровня (1-15).
 * Если текстуры ещё не загружены — вернёт null (fallback к эмодзи).
 */
export function getCatTexture(level) {
  if (!textures) return null;
  return textures[Math.min(Math.max(level, 1), 15)] || null;
}
