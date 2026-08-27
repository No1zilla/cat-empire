/**
 // Единый источник правды стилей (Design Tokens) для "Империи Котиков"
 // Снято 1-в-1 с рабочего UI игры
 */

export const TOKENS = {
  colors: {
    // TASK-120: дневной мир. Тёмная гамма спорила с пастельными котами и делала
    // игру безликим идл-кликером. Панели теперь кремовые, текст — тёплый тёмный:
    // на светлом фоне белые подписи не читаются, и менять их надо вместе с фоном.
    background: '#EAF4FF',
    panelBg: '#FFF6E6',
    panelBorder: '#E2C39A',

    // Сетка и ячейки
    gridCellBg: '#BFE3C6',
    gridCellBorder: '#D9B98A',
    gridCellActive: '#D8F0DA',
    
    // Кнопки управления (1-в-1)
    btnBuy: '#FF6B6B',
    btnFill: '#FF9F43',
    btnMerge: '#A55EEA',
    
    // Валюты и ресурсы
    gold: '#FFD15C',
    gems: '#FF4757',
    income: '#A855F7',
    
    // Текст на кремовых панелях: тёплый тёмный, не чёрный — иначе холодно и жёстко.
    textPrimary: '#3B2A1C',
    textSecondary: '#8A7259',
    textMuted: '#B09A80'
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
