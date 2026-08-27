import { Router } from 'express';
import pool from '../db.js';
import userService from '../services/userService.js';
import playerAuth, { requirePlayer } from '../middleware/playerAuth.js';
import { playerKey } from '../utils/playerKey.js';

/**
 * Приглашения друзей в Telegram (TASK-115).
 *
 * Ссылка `t.me/<bot>?startapp=ref_<id>` приводит нового игрока, и обе стороны
 * получают рубины. Всё интересное здесь — про то, как это НЕ превратить в
 * бесконечный кран рубинов:
 *
 *   1. Кто пришёл — решает подпись initData, а не тело запроса. Прислать чужой
 *      идентификатор нельзя.
 *   2. Себя пригласить нельзя.
 *   3. Одного приглашённого засчитываем один раз — за это отвечает первичный ключ
 *      таблицы, а не проверка в коде: гонка двух запросов проиграет базе, а не нам.
 *   4. Награду получает только новичок: если у игрока уже есть прогресс, он не
 *      «пришёл по ссылке», а решил собрать рубины со знакомых.
 */

const router = Router();

/** Сколько рубинов получают приглашённый и пригласивший. */
export const REFERRAL_REWARD = 25;

/** Новичок ли игрок: пришедший по ссылке ещё ничего не успел. */
export function isFreshInvitee(user) {
  if (!user) return true;
  return (Number(user.maxCatLevel) || 1) <= 1
    && (Number(user.totalMerges) || 0) <= 0
    && (Number(user.totalCatsBought) || 0) <= 2;
}

export async function ensureReferralTable() {
  if (!pool || !process.env.DATABASE_URL) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS referrals (
      invitee_key TEXT PRIMARY KEY,
      referrer_key TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_key);
  `);
}

/**
 * Разбор и проверки вынесены из HTTP, чтобы тест мог прогнать все отказы без
 * поднятого сервера и без базы.
 *
 * @returns {Promise<{status: string, reward?: number}>}
 */
export async function claimReferral({ inviteeKey, referrerId }, deps = {}) {
  const platform = String(inviteeKey || '').startsWith('tg:') ? 'telegram' : 'vk';
  const referrerKey = playerKey({ platform, externalId: referrerId });

  if (!inviteeKey || !referrerKey) return { status: 'bad_request' };
  if (inviteeKey === referrerKey) return { status: 'self_invite' };

  const getUser = deps.getUser || ((key) => userService.getOrCreateUser(key));
  const insertLink = deps.insertLink || defaultInsertLink;
  const grant = deps.grant || ((key, amount) => userService.addGems(key, amount));

  const invitee = await getUser(inviteeKey);
  if (!isFreshInvitee(invitee)) return { status: 'not_fresh' };

  // Пригласивший должен существовать: ссылка могла быть выдумана.
  const referrer = await getUser(referrerKey);
  if (!referrer) return { status: 'unknown_referrer' };

  const linked = await insertLink(inviteeKey, referrerKey);
  if (!linked) return { status: 'already_claimed' };

  await grant(inviteeKey, REFERRAL_REWARD);
  await grant(referrerKey, REFERRAL_REWARD);

  return { status: 'granted', reward: REFERRAL_REWARD };
}

/** @returns {Promise<boolean>} удалось ли записать связь (false = уже была). */
async function defaultInsertLink(inviteeKey, referrerKey) {
  if (!pool || !process.env.DATABASE_URL) return false;
  const { rowCount } = await pool.query(
    `INSERT INTO referrals (invitee_key, referrer_key)
     VALUES ($1, $2)
     ON CONFLICT (invitee_key) DO NOTHING`,
    [inviteeKey, referrerKey]
  );
  return rowCount > 0;
}

/** POST /api/referral/claim — тело: { ref: '<id пригласившего>' } */
router.post('/claim', playerAuth, requirePlayer, async (req, res) => {
  try {
    const player = req.player || {};
    const inviteeKey = playerKey(player);
    const referrerId = String((req.body && req.body.ref) || '').replace(/[^0-9]/g, '');

    const result = await claimReferral({ inviteeKey, referrerId });

    if (result.status === 'granted') {
      console.log(`🤝 Приглашение засчитано: ${referrerId} привёл ${inviteeKey}`);
      return res.json({ ok: true, reward: result.reward });
    }
    return res.json({ ok: false, reason: result.status });
  } catch (e) {
    console.error('referral/claim error:', e);
    return res.status(500).json({ ok: false, reason: 'internal' });
  }
});

export default router;
