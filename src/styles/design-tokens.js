/**
 // Единый источник правды стилей (Design Tokens) для "Империи Котиков"
 // Снято 1-в-1 с рабочего UI игры
 */

export const TOKENS = {
  colors: {
    // Основной фон и панели
    background: '#0D0A1C',
    panelBg: '#15102A',
    panelBorder: '#271F4F',
    
    // Сетка и ячейки
    gridCellBg: '#181335',
    gridCellBorder: '#271F4F',
    gridCellActive: '#231B4B',
    
    // Кнопки управления (1-в-1)
    btnBuy: '#FF6B6B',
    btnFill: '#FF9F43',
    btnMerge: '#A55EEA',
    
    // Валюты и ресурсы
    gold: '#FFD15C',
    gems: '#FF4757',
    income: '#A855F7',
    
    // Текст
    textPrimary: '#FFFFFF',
    textSecondary: '#A4A0C1',
    textMuted: '#6E6A8F'
  },

  radii: {
    cell: 16,
    button: 20,
    modal: 24,
    hud: 24
  },

  typography: {
    fontFamily: "'Fredoka', 'Nunito', sans-serif",
    fontWeightBold: 'bold',
    fontWeightNormal: 'normal'
  }
};

export default TOKENS;
