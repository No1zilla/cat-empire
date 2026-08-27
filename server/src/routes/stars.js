import { Router } from 'express';
import pool from '../db.js';
import userService from '../services/userService.js';
import playerAuth, { requirePlayer, telegramBotToken } from '../middleware/playerAuth.js';
import { playerKey } from '../utils/playerKey.js';
import { findStarsItem } from '../utils/starsCatalog.js';

/**
 * Покупки за Telegram Stars (TASK-114).
 *
 * Главное правило: рубины начисляет СЕРВЕР по вебхуку `successful_payment`, и
 * никогда — клиент. В VK-версии начисление жило на клиенте, и это работало ровно
 * до первого человека, который откроет консоль. Со Stars это реальные деньги
 * Telegram, поэтому единственный источник правды здесь — апдейт от Telegram,
 * подтверждённый секретным заголовком вебхука.
 *
 * Идемпотентность — по `telegram_payment_charge_id`. Telegram может доставить
 * апдейт повторно (ретраи при таймауте), и без этой проверки один платёж выдал бы
 * товар дважды.
 */

const router = Router();

const TELEGRAM_API = 'https://api.telegram.org/bot';

/** Секрет вебхука: задаётся при setWebhook и приходит заголовком в каждом апдейте. */
export function webhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET || '';
}

async function callTelegram(method, payload) {
  const token = telegramBotToken();
  if (!token) return { ok: false, error: 'no_bot_token' };
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    console.error(`Telegram ${method} failed:`, e && e.message);
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/** Уже выдавали товар по этому платежу? */
async function chargeAlreadyGranted(chargeId) {
  if (!pool || !process.env.DATABASE_URL || !chargeId) return false;
  const { rowCount } = await pool.query(
    `SELECT 1 FROM analytics_events
     WHERE event = 'iap_purchase_completed'
       AND props->>'charge_id' = $1
     LIMIT 1`,
    [String(chargeId)]
  );
  return rowCount > 0;
}

async function recordGrant({ key, item, chargeId, stars }) {
  if (!pool || !process.env.DATABASE_URL) return;
  await pool.query(
    `INSERT INTO analytics_events (event, user_id, session_id, platform, props)
     VALUES ('iap_purchase_completed', $1, '', 'telegram', $2::jsonb)`,
    [
      String(key),
      JSON.stringify({
        pack: item.id,
        rubies: item.rubies,
        stars,
        charge_id: String(chargeId || ''),
        source: 'telegram_webhook'
      })
    ]
  );
}

/**
 * POST /api/stars/invoice — ссылка на оплату.
 * Клиент открывает её через Telegram.WebApp.openInvoice.
 */
router.post('/invoice', playerAuth, requirePlayer, async (req, res) => {
  try {
    const player = req.player || {};
    if (player.platform !== 'telegram') {
      return res.status(400).json({ error: 'Stars are only available inside Telegram' });
    }

    const item = findStarsItem(req.body && req.body.itemId);
    if (!item) return res.status(400).json({ error: 'Unknown item' });

    const key = playerKey(player);
    if (!key) return res.status(400).json({ error: 'Unknown player' });

    // payload вернётся к нам в successful_payment — по нему и узнаём, кому и что выдать.
    const payload = JSON.stringify({ k: key, i: item.id, t: Date.now() });

    const result = await callTelegram('createInvoiceLink', {
      title: item.title,
      description: item.description,
      payload,
      currency: 'XTR',
      prices: [{ label: item.title, amount: item.stars }]
    });

    if (!result || !result.ok || !result.result) {
      console.warn('createInvoiceLink отказал:', result && (result.description || result.error));
      return res.status(502).json({ error: 'Invoice not created' });
    }

    return res.json({ link: result.result, stars: item.stars, rubies: item.rubies });
  } catch (e) {
    console.error('stars/invoice error:', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * Разбор апдейта: вынесено отдельно, чтобы тест мог прогнать сценарий оплаты
 * без живого HTTP и без токена бота.
 */
export async function handleTelegramUpdate(update, deps = {}) {
  const grantGems = deps.grantGems || ((key, amount) => userService.addGems(key, amount));
  const alreadyGranted = deps.alreadyGranted || chargeAlreadyGranted;
  const record = deps.record || recordGrant;
  const answerPreCheckout = deps.answerPreCheckout
    || ((id) => callTelegram('answerPreCheckoutQuery', { pre_checkout_query_id: id, ok: true }));

  // Шаг 1: Telegram спрашивает, подтверждаем ли платёж. Молчание = отказ игроку.
  if (update && update.pre_checkout_query) {
    const query = update.pre_checkout_query;
    let known = false;
    try {
      const parsed = JSON.parse(query.invoice_payload || '{}');
      known = Boolean(findStarsItem(parsed.i));
    } catch (e) {
      known = false;
    }
    if (!known) {
      await (deps.rejectPreCheckout || ((id) => callTelegram('answerPreCheckoutQuery', {
        pre_checkout_query_id: id,
        ok: false,
        error_message: 'Этот товар больше недоступен'
      })))(query.id);
      return { handled: 'pre_checkout_rejected' };
    }
    await answerPreCheckout(query.id);
    return { handled: 'pre_checkout_ok' };
  }

  // Шаг 2: деньги прошли — выдаём товар.
  const payment = update && update.message && update.message.successful_payment;
  if (!payment) return { handled: 'ignored' };

  let parsed = null;
  try {
    parsed = JSON.parse(payment.invoice_payload || '{}');
  } catch (e) {
    parsed = null;
  }

  const item = findStarsItem(parsed && parsed.i);
  const key = parsed && parsed.k;
  if (!item || !key) {
    console.error('successful_payment с непонятным payload:', payment.invoice_payload);
    return { handled: 'bad_payload' };
  }

  const chargeId = payment.telegram_payment_charge_id;
  if (await alreadyGranted(chargeId)) {
    return { handled: 'duplicate', chargeId };
  }

  await grantGems(key, item.rubies);
  await record({ key, item, chargeId, stars: payment.total_amount });

  return { handled: 'granted', key, itemId: item.id, rubies: item.rubies, chargeId };
}

/**
 * POST /api/telegram/webhook — апдейты бота.
 * Защита — секретный заголовок из setWebhook: без него любой мог бы прислать
 * поддельный successful_payment и выписать себе рубины.
 */
router.post('/webhook', async (req, res) => {
  const secret = webhookSecret();
  if (!secret) {
    console.warn('[stars] TELEGRAM_WEBHOOK_SECRET не задан — вебхук отключён, чтобы не выдавать товар по подделке');
    return res.status(503).json({ error: 'Webhook not configured' });
  }
  if (req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    console.warn('[stars] вебхук с неверным секретом отклонён');
    return res.status(401).json({ error: 'Bad secret' });
  }

  try {
    const result = await handleTelegramUpdate(req.body || {});
    if (result.handled === 'granted') {
      console.log(`⭐ Выдано ${result.rubies} рубинов игроку ${result.key} за ${result.itemId}`);
    }
    // Telegram ретраит всё, что не 200 — отвечаем успехом на любой разобранный апдейт.
    return res.json({ ok: true });
  } catch (e) {
    console.error('telegram webhook error:', e);
    // Здесь 500 осмысленно: пусть Telegram доставит ещё раз, идемпотентность защитит.
    return res.status(500).json({ ok: false });
  }
});

export default router;
