import VKService from '../vk/VKBridge.js';
import { eventTracker } from '../analytics/EventTracker.js';

const PROCESSED_ORDERS_KEY = 'cat_empire_iap_orders';

function wasOrderProcessed(orderId) {
  if (!orderId || typeof localStorage === 'undefined') return false;
  try {
    const list = JSON.parse(localStorage.getItem(PROCESSED_ORDERS_KEY) || '[]');
    return Array.isArray(list) && list.includes(String(orderId));
  } catch (e) {
    return false;
  }
}

function markOrderProcessed(orderId) {
  if (!orderId || typeof localStorage === 'undefined') return;
  try {
    const list = JSON.parse(localStorage.getItem(PROCESSED_ORDERS_KEY) || '[]');
    const next = Array.isArray(list) ? list : [];
    next.push(String(orderId));
    localStorage.setItem(PROCESSED_ORDERS_KEY, JSON.stringify(next.slice(-40)));
  } catch (e) {}
}

export async function purchaseVkItem(itemId) {
  const vk = new VKService();
  const result = await vk.showOrderBox(itemId);
  if (!result || result.cancelled) return { ok: false, cancelled: true };
  if (result.unavailable) return { ok: false, unavailable: true };
  if (!result.success) return { ok: false };
  const orderId = result.orderId || `${itemId}:${Date.now()}`;
  if (wasOrderProcessed(orderId)) return { ok: false, duplicate: true };
  markOrderProcessed(orderId);
  eventTracker.track('iap_purchase_completed', { pack: itemId, order_id: orderId });
  return { ok: true, orderId, res: result.res };
}

export default purchaseVkItem;
