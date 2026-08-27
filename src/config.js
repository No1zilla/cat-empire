// Константы и конфигурация игры «Империя Котиков» (TASK-015 Visual Glow-Up)
export const CONFIG = {
  GAME_WIDTH: 410,         // ширина игрового поля в пикселях
  GAME_HEIGHT: 700,        // минимум; на высоком iframe подгоняется под окно
  GRID_SIZE: 5,            // сетка 5x5
  CELL_SIZE: 77,           // Крупный сочный размер ячейки (77px)
  GRID_PADDING: 4,         // плотные аккуратные отступы (4px)
  FONT_FAMILY: "'Fredoka', 'Nunito', sans-serif",
  COLORS: {
    // TASK-120: дневной мир. Тёмно-фиолетовая гамма спорила с пастельными котами
    // и читалась как безликий идл-кликер. Лоток поля — тёплый крем, ячейки —
    // мягкая мята: белые коты с тёмным контуром на ней читаются лучше всего.
    BG_TOP: 0x8ec5ff,      // Небо сверху
    BG_BOTTOM: 0xffd9a8,   // Тёплый горизонт
    GRID_BG: 0xf7e6c8,     // Кремовый лоток поля
    CELL_BG: 0xbfe3c6,     // Мятная ячейка
    CELL_BORDER: 0xd9b98a, // Тёплый кант лотка
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

/** VKWebAppResizeWindow: ширина от 600 до 1000, высота от 500. */
export const VK_DESKTOP_IFRAME_WIDTH_MIN = 600;
export const VK_DESKTOP_IFRAME_WIDTH_MAX = 1000;
export const VK_DESKTOP_IFRAME_HEIGHT_MIN = 500;
export const VK_DESKTOP_IFRAME_HEIGHT_MAX = 10000;

/**
 * Размер desktop-iframe под поле 410×700.
 * VK не даёт ширину < 600 — берём contain и зажимаем в лимиты кабинета.
 */
export function vkDesktopIframeSize(viewW, viewH, gameW = CONFIG.GAME_WIDTH, gameH = GAME_HEIGHT_MIN) {
  const gw = Math.max(1, Number(gameW) || 410);
  const gh = Math.max(1, Number(gameH) || GAME_HEIGHT_MIN);
  const vh = Math.max(
    VK_DESKTOP_IFRAME_HEIGHT_MIN,
    Math.min(VK_DESKTOP_IFRAME_HEIGHT_MAX, Math.round(Number(viewH) || gh))
  );
  const idealW = Math.round(gw * (vh / gh));
  const vw = Math.max(
    VK_DESKTOP_IFRAME_WIDTH_MIN,
    Math.min(VK_DESKTOP_IFRAME_WIDTH_MAX, idealW)
  );
  void viewW;
  return { width: vw, height: vh };
}

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
 * CSS-размер канваса: contain в iframe, масштаб и вверх, и вниз.
 * Логическое поле остаётся 410×CELL_SIZE 77 — меняются только CSS-пиксели.
 * Не ставить width/height 100% + object-fit:contain: тапы едут
 * (центр «Соединить» бьёт в «Заполнить»). Явные px + getBoundingClientRect.
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

/**
 * Сцена не сдвигается внутри канваса. Поле уже 410 = ширина холста.
 * Раньше сюда передавали ширину в backing-пикселях и получали x≈205 и разъезд
 * кнопок vs тапов. Осторожно: в Pixi v8 renderer.width — ЛОГИЧЕСКАЯ ширина (410),
 * backing-размер это canvas.width = renderer.width × resolution.
 */
export function gameContainerOffsetX(screenW, gameW = CONFIG.GAME_WIDTH) {
  void screenW;
  void gameW;
  return 0;
}

/** clientX по боксу канваса → логический X поля 410. */
export function pointerToGameX(clientX, canvasRect, gameWidth = CONFIG.GAME_WIDTH) {
  const gw = Math.max(1, Number(gameWidth) || 410);
  const left = canvasRect && Number(canvasRect.left);
  const width = canvasRect && Number(canvasRect.width);
  if (!Number.isFinite(left) || !Number.isFinite(width) || width <= 0) return NaN;
  const x = Number(clientX);
  if (!Number.isFinite(x)) return NaN;
  return (x - left) * (gw / width);
}

export default CONFIG;
