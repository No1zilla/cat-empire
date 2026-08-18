import { Router } from 'express';
import {
  handleVkPaymentNotification,
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
  return res.status(200).send(JSON.stringify(payload));
}

router.post('/vk', replyVkPayment);
router.get('/vk', replyVkPayment);
router.post('/', replyVkPayment);
router.get('/', replyVkPayment);

export default router;
