// Константы и конфигурация игры «Империя Котиков» (TASK-015 Visual Glow-Up)
export const CONFIG = {
  GAME_WIDTH: 410,         // ширина игрового поля в пикселях
  GAME_HEIGHT: 700,        // высота (мобильные пропорции)
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

export default CONFIG;
