import { Router } from 'express';
import pool from '../db.js';
import userService from '../services/userService.js';
import playerAuth, { requireVerifiedPlayer } from '../middleware/playerAuth.js';
import { playerKey } from '../utils/playerKey.js';
import { claimReferral } from '../services/referralService.js';

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
router.post('/claim', playerAuth, requireVerifiedPlayer, async (req, res) => {
  try {
    const player = req.player || {};
    const inviteeKey = playerKey(player);
    const referrerId = String((req.body && req.body.ref) || '').replace(/[^0-9]/g, '');

    const result = await claimReferral({ inviteeKey, referrerId }, {
      getUser: (key) => userService.getOrCreateUser(key),
      insertLink: defaultInsertLink,
      grant: (key, amount) => userService.addGems(key, amount)
    });

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
