import { Router } from 'express';
import pool from '../db.js';
import {
  buildChargeAnalyticsEvent,
  handleVkPaymentNotification,
  isVkChargeNotification,
  normalizeVkPaymentParams
} from '../utils/vkPayments.js';

const router = Router();

export function coerceVkPaymentContentType(req, _res, next) {
  const path = String(req.path || '');
  const pay = path === '/' || path.startsWith('/api/payments');
  if (pay && req.method === 'POST') {
    const ct = String(req.headers['content-type'] || '').toLowerCase();
    if (!ct || ct.startsWith('text/') || ct.includes('octet-stream')) {
      req.headers['content-type'] = 'application/x-www-form-urlencoded';
    }
  }
  next();
}

export function collectParams(req) {
  return {
    ...normalizeVkPaymentParams(req.query),
    ...normalizeVkPaymentParams(req.body)
  };
}

export function isVkPaymentPayload(req) {
  const params = collectParams(req);
  return Boolean(params.notification_type || params.item || params.item_id);
}

export function replyVkPayment(req, res) {
  const params = collectParams(req);
  const secret = process.env.VK_APP_SECRET || process.env.VK_SECRET || '';
  const payload = handleVkPaymentNotification(params, secret);
  const kind = payload.response ? 'ok' : `err:${payload.error && payload.error.error_code}`;
  console.log(
    '[vk-pay]',
    params.notification_type || 'none',
    params.item || params.item_id || '-',
    kind
  );
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.status(200).send(JSON.stringify(payload));
  if (payload.response && isVkChargeNotification(params)) {
    recordVkCharge(params).catch((err) => {
      console.warn('[vk-pay] analytics insert failed:', err && err.message);
    });
  }
  return res;
}

async function recordVkCharge(params) {
  const event = buildChargeAnalyticsEvent(params);
  if (!event || !pool || !process.env.DATABASE_URL) return;
  const orderId = String(event.props.order_id || '');
  const exists = await pool.query(
    `SELECT 1 FROM analytics_events
     WHERE event = 'iap_purchase_completed'
       AND props->>'order_id' = $1
       AND props->>'source' = 'vk_callback'
     LIMIT 1`,
    [orderId]
  );
  if (exists.rowCount) return;
  await pool.query(
    `INSERT INTO analytics_events (event, user_id, session_id, platform, props)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [event.event, event.user_id, event.session_id, event.platform, JSON.stringify(event.props)]
  );
}

router.post('/vk', replyVkPayment);
router.get('/vk', replyVkPayment);
router.post('/', replyVkPayment);
router.get('/', replyVkPayment);

export default router;
