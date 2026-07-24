// Константы и конфигурация игры «Империя Котиков»
export const CONFIG = {
  GAME_WIDTH: 400,         // ширина игрового поля в пикселях
  GAME_HEIGHT: 700,        // высота (мобильные пропорции)
  GRID_SIZE: 5,            // сетка 5x5
  CELL_SIZE: 74,           // МАКСИМАЛЬНЫЙ размер ячейки (74px)
  GRID_PADDING: 5,         // минимальные плотные отступы (5px)
  COLORS: {
    BG: '#1a1a2e',         // тёмный фон
    GRID_BG: '#16213e',    // фон сетки
    CELL_BG: '#0f3460',    // фон ячейки
    CELL_BORDER: '#533483', // рамка ячейки
    ACCENT: '#e94560',     // акцентный цвет
    GOLD: '#ffd700',       // цвет монет
    TEXT: '#ffffff',       // текст
    TEXT_DIM: '#8899aa',   // приглушённый текст
  },
  MAX_CAT_LEVEL: 15,
};

export default CONFIG;
