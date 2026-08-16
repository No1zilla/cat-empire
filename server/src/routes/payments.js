import { Router } from 'express';
import { handleVkPaymentNotification } from '../utils/vkPayments.js';

const router = Router();

function collectParams(req) {
  return { ...(req.query || {}), ...(req.body || {}) };
}

function replyVkPayment(req, res) {
  const params = collectParams(req);
  const secret = process.env.VK_APP_SECRET || process.env.VK_SECRET || '';
  const payload = handleVkPaymentNotification(params, secret);
  return res.json(payload);
}

// VK шлёт callback POST (form/json); GET оставляем на случай ручной проверки.
router.post('/vk', replyVkPayment);
router.get('/vk', replyVkPayment);

export default router;
