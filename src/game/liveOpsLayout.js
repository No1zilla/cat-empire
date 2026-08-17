function formatDays(ms) {
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/**
 * Под рядом купить/заполнить/соединить — только нужное поле, не витрина рекламы.
 * Идол и 2× за ролик с поля сняты. Паёк — если указ уже куплен. Портал — перелёт.
 */
export function getLiveOpsLayout({
  pendingFlight = false,
  edictActive = false,
  canClaimDaily = false,
  edictRemainingMs = 0
} = {}) {
  const nights = formatDays(edictRemainingMs);
  const rationLabel = canClaimDaily ? `Паёк · ${nights}н` : `Указ · ${nights}н`;

  if (pendingFlight) {
    return { visible: true, mode: 'portal', left: 'Портал открыт', right: null };
  }
  if (edictActive) {
    return { visible: true, mode: 'ration', left: rationLabel, right: null };
  }
  return { visible: false, mode: 'hidden', left: null, right: null };
}

export default getLiveOpsLayout;
