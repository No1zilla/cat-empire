// Константы и конфигурация игры «Империя Котиков» (TASK-015 Visual Glow-Up)
export const CONFIG = {
  GAME_WIDTH: 410,         // ширина игрового поля в пикселях
  GAME_HEIGHT: 700,        // минимум; на высоком iframe подгоняется под окно
  GRID_SIZE: 5,            // сетка 5x5
  CELL_SIZE: 77,           // Крупный сочный размер ячейки (77px)
  GRID_PADDING: 4,         // плотные аккуратные отступы (4px)
  FONT_FAMILY: "'Fredoka', 'Nunito', sans-serif",
  COLORS: {
    BG_TOP: 0x2a1b54,      // Градиент сверху
    BG_BOTTOM: 0x100b20,   // Градиент снизу
    GRID_BG: 0x15122c,     // Тёмный сочный фон сетки
    CELL_BG: 0x1d193d,     // Углубленный фон ячейки
    CELL_BORDER: 0x3d356c, // Тонкий стильный контур ячейки
    ACCENT: 0xff5e62,      // Coral/Pink акцентный цвет
    GOLD: 0xffd700,        // Золото
    EMERALD: 0x2ecc71,     // Изумрудно-зелёный
    TEXT: '#ffffff',       // Текст
    TEXT_DIM: '#9ca3af',   // Приглушённый текст
  },
  MAX_CAT_LEVEL: 15,
};

export const GAME_HEIGHT_MIN = 700;
export const GAME_HEIGHT_MAX = 1100;

/** Высота холста под iframe: ширина 410, сетка 77px. Не ниже 700. */
export function fitGameHeight(viewW, viewH) {
  const w = CONFIG.GAME_WIDTH || 410;
  const vw = Math.max(1, Number(viewW) || w);
  const vh = Math.max(1, Number(viewH) || GAME_HEIGHT_MIN);
  CONFIG.GAME_HEIGHT = Math.max(
    GAME_HEIGHT_MIN,
    Math.min(GAME_HEIGHT_MAX, Math.round(w * (vh / vw)))
  );
  return CONFIG.GAME_HEIGHT;
}

/**
 * CSS-размер канваса 1-в-1 с логическим полем.
 * 100% + object-fit:contain сдвигает тапы: «Соединить» попадает в «Заполнить».
 */
export function canvasCssSize(viewW, viewH, gameW = CONFIG.GAME_WIDTH, gameH = CONFIG.GAME_HEIGHT) {
  const gw = Math.max(1, Number(gameW) || 410);
  const gh = Math.max(1, Number(gameH) || GAME_HEIGHT_MIN);
  const vw = Math.max(1, Number(viewW) || gw);
  const vh = Math.max(1, Number(viewH) || gh);
  const scale = Math.min(vw / gw, vh / gh);
  return {
    width: Math.max(1, Math.round(gw * scale)),
    height: Math.max(1, Math.round(gh * scale)),
    scale
  };
}

export default CONFIG;
