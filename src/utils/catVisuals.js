// Данные о котиках по уровням (1-15)

const CAT_DATA_MAP = {
  1:  { name: 'Обычный котик',      emoji: '🐱',   color: '#4a90e2' },
  2:  { name: 'Весёлый котик',      emoji: '😺',   color: '#5ba35f' },
  3:  { name: 'Котик-студент',      emoji: '😸',   color: '#e2a04a' },
  4:  { name: 'Котик-работяга',     emoji: '😻',   color: '#c0392b' },
  5:  { name: 'Котик-бизнесмен',    emoji: '🐱‍👤', color: '#8e44ad' },
  6:  { name: 'Котик-магнат',       emoji: '👑',   color: '#2980b9' },
  7:  { name: 'Звёздный котик',     emoji: '🌟',   color: '#d35400' },
  8:  { name: 'Котик-гений',        emoji: '🧠',   color: '#16a085' },
  9:  { name: 'Котик-герой',        emoji: '⚔️',   color: '#c0392b' },
  10: { name: 'Котик-волшебник',    emoji: '🔮',   color: '#6c3483' },
  11: { name: 'Котик-дракон',       emoji: '🐉',   color: '#922b21' },
  12: { name: 'Космический котик',  emoji: '🚀',   color: '#1a5276' },
  13: { name: 'Котик-феникс',       emoji: '🦅',   color: '#b7950b' },
  14: { name: 'Котик-легенда',      emoji: '💎',   color: '#148f77' },
  15: { name: 'Кото-Бог',           emoji: '🏆',   color: '#1a1a1a' },
};

/**
 * Возвращает визуальные данные и доходность для котика определённого уровня
 * @param {number} level - уровень котика (1-15)
 * @returns {{ name: string, emoji: string, color: string, income: number }}
 */
export function getCatData(level) {
  const currentLevel = Math.max(1, Math.min(15, level || 1));
  const baseData = CAT_DATA_MAP[currentLevel] || CAT_DATA_MAP[1];
  
  // income = Math.pow(2, level - 1)
  const income = Math.pow(2, currentLevel - 1);

  return {
    ...baseData,
    income
  };
}

export default getCatData;
