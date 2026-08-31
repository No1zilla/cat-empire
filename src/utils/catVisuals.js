// Данные о котиках по уровням (1-15)

import { DUNE_CATS, getWorldLineId, getWorldTint } from '../config/worlds.js';

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
  14: { name: 'Котик-легенда',      emoji: '🔻',   color: '#148f77' },
  15: { name: 'Кото-Бог',           emoji: '🏆',   color: '#1a1a1a' },
};

let currentWorldIndex = 1;

export function setCatWorld(index = 1) {
  currentWorldIndex = Math.max(1, Number(index) || 1);
}

export function getCatWorldTint(index = currentWorldIndex) {
  return getWorldTint(index);
}

export function getCatData(level, worldIndex = currentWorldIndex) {
  const currentLevel = Math.max(1, Math.min(15, level || 1));
  const baseData = CAT_DATA_MAP[currentLevel] || CAT_DATA_MAP[1];
  const income = Math.pow(2, currentLevel - 1);
  const line = getWorldLineId(worldIndex);
  const dune = line === 2 ? DUNE_CATS[currentLevel] : null;

  return {
    ...baseData,
    name: dune ? dune.name : baseData.name,
    color: dune ? dune.color : baseData.color,
    income,
    worldIndex: Math.max(1, Number(worldIndex) || 1)
  };
}

export default getCatData;
