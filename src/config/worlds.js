export const DUNE_CATS = {
  1:  { name: 'Песчаный котёнок',   color: '#e2a04a' },
  2:  { name: 'Кот бархана',        color: '#d35400' },
  3:  { name: 'Кот-караванщик',     color: '#c0392b' },
  4:  { name: 'Кот оазиса',         color: '#16a085' },
  5:  { name: 'Кот-султан',         color: '#8e44ad' },
  6:  { name: 'Кот дюнной стражи',  color: '#2980b9' },
  7:  { name: 'Кот миража',         color: '#b7950b' },
  8:  { name: 'Кот-астроном',       color: '#1a5276' },
  9:  { name: 'Кот-самуум',         color: '#922b21' },
  10: { name: 'Кот-джинн',          color: '#6c3483' },
  11: { name: 'Кот-скарабей',       color: '#1e8449' },
  12: { name: 'Кот созвездий',      color: '#1a1a4a' },
  13: { name: 'Кот-феникс дюн',     color: '#e67e22' },
  14: { name: 'Легенда пустыни',    color: '#7d3c98' },
  15: { name: 'Кото-Бог дюн',       color: '#1a1a1a' }
};

export function getWorldIndex(index = 1) {
  return Math.max(1, Number(index) || 1);
}

export function getWorldTitle(index = 1) {
  const i = getWorldIndex(index);
  if (i <= 1) return 'Луга';
  if (i === 2) return 'Земля дюн';
  return `Земля ${i}`;
}

export function getWorldTint(index = 1) {
  return getWorldIndex(index) <= 1 ? 0xffffff : 0xffc56b;
}

export function getWorldLineId(index = 1) {
  return getWorldIndex(index) <= 1 ? 1 : 2;
}

export default { DUNE_CATS, getWorldTitle, getWorldTint, getWorldLineId };
