import { playerKey } from '../utils/playerKey.js';

/**
 * Правила приглашений (TASK-115).
 *
 * Как и starsService, модуль без express и pg: здесь только решение «засчитывать
 * или нет», а запись в базу приходит через `deps`.
 */

/** Сколько рубинов получают приглашённый и пригласивший. */
export const REFERRAL_REWARD = 25;

/** Новичок ли игрок: пришедший по ссылке ещё ничего не успел. */
export function isFreshInvitee(user) {
  if (!user) return true;
  return (Number(user.maxCatLevel) || 1) <= 1
    && (Number(user.totalMerges) || 0) <= 0
    && (Number(user.totalCatsBought) || 0) <= 2;
}

/**
 * @returns {Promise<{status: string, reward?: number}>} статусы:
 *   granted | bad_request | self_invite | not_fresh | unknown_referrer | already_claimed
 */
export async function claimReferral({ inviteeKey, referrerId }, deps = {}) {
  const { getUser, insertLink, grant } = deps;

  const platform = String(inviteeKey || '').startsWith('tg:') ? 'telegram' : 'vk';
  const referrerKey = playerKey({ platform, externalId: referrerId });

  if (!inviteeKey || !referrerKey) return { status: 'bad_request' };
  // Приглашение самого себя — самый очевидный способ печатать рубины.
  if (inviteeKey === referrerKey) return { status: 'self_invite' };

  const invitee = await getUser(inviteeKey);
  // Игрок с прогрессом не «пришёл по ссылке»: иначе ветеран собирал бы награду
  // со знакомых по кругу.
  if (!isFreshInvitee(invitee)) return { status: 'not_fresh' };

  const referrer = await getUser(referrerKey);
  if (!referrer) return { status: 'unknown_referrer' };

  // Защита от повтора — на первичном ключе таблицы: гонка двух запросов проиграет
  // базе, а не проверке в коде.
  const linked = await insertLink(inviteeKey, referrerKey);
  if (!linked) return { status: 'already_claimed' };

  await grant(inviteeKey, REFERRAL_REWARD);
  await grant(referrerKey, REFERRAL_REWARD);

  return { status: 'granted', reward: REFERRAL_REWARD };
}

export default claimReferral;
