function formatDays(ms) {
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/**
 * Что висит под бустером 2×.
 * Покупку указа на поле не кладём — это витрина до первого merge.
 * Идол — после первого слияния. Паёк — только если указ уже куплен.
 */
export function getLiveOpsLayout({
  pendingFlight = false,
  idolUnlocked = false,
  idolRemaining = 0,
  edictActive = false,
  canClaimDaily = false,
  edictRemainingMs = 0
} = {}) {
  const nights = formatDays(edictRemainingMs);
  const rationLabel = canClaimDaily ? `Паёк · ${nights}н` : `Указ · ${nights}н`;
  const idolLabel = idolRemaining > 0 ? `Идол · ${idolRemaining}/3` : 'Идол сыт';

  if (pendingFlight) {
    return { visible: true, mode: 'portal', left: 'Портал открыт', right: null };
  }

  const showIdol = Boolean(idolUnlocked);
  const showRation = Boolean(edictActive);

  if (showIdol && showRation) {
    return { visible: true, mode: 'split', left: idolLabel, right: rationLabel };
  }
  if (showIdol) {
    return { visible: true, mode: 'idol', left: idolLabel, right: null };
  }
  if (showRation) {
    return { visible: true, mode: 'ration', left: rationLabel, right: null };
  }
  return { visible: false, mode: 'hidden', left: null, right: null };
}

export default getLiveOpsLayout;
