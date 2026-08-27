import assert from 'node:assert';
import { wasOrderProcessed, markOrderProcessed } from '../../src/game/orderLedger.js';
import { VkPlatform } from '../../src/platform/VkPlatform.js';

class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

export async function runOrderLedgerTests() {
  console.log('🧪 Тестирование реестра оплаченных заказов...');

  const previousLs = global.localStorage;
  global.localStorage = new LocalStorageMock();

  assert.strictEqual(wasOrderProcessed('order_1'), false, 'Незнакомый заказ не считается выданным');
  assert.strictEqual(markOrderProcessed('order_1'), true);
  assert.strictEqual(wasOrderProcessed('order_1'), true, 'После пометки заказ считается выданным');
  assert.strictEqual(wasOrderProcessed(''), false, 'Пустой id никогда не «уже выдан»');
  assert.strictEqual(markOrderProcessed(''), false, 'Пустой id не пишем в реестр');

  // Помним последние 40: старые вытесняются, свежие остаются.
  for (let i = 0; i < 45; i += 1) markOrderProcessed(`bulk_${i}`);
  assert.strictEqual(wasOrderProcessed('bulk_44'), true, 'Свежий заказ остаётся в реестре');
  assert.strictEqual(wasOrderProcessed('order_1'), false, 'Самые старые заказы вытесняются');

  /**
   * ГЛАВНЫЙ ИНВАРИАНТ ЭТОГО ФАЙЛА.
   *
   * Касса платформы не имеет права сама помечать заказ выданным. Пока это делала
   * покупка (старый iapBuy.purchaseVkItem), между «сжечь заказ» и «сохранить рубины»
   * оставалась щель: запись падала — игрок платил, товара нет, а повторить выдачу
   * уже нельзя, реестр отвечал «зачислено». Порядок обязан принадлежать вызывающему
   * коду: выдать → дождаться сохранения → и только теперь пометить.
   */
  global.localStorage = new LocalStorageMock();
  const service = {
    async showOrderBox(item) {
      return { success: true, orderId: `order_${item}` };
    }
  };
  const platform = new VkPlatform({
    service,
    ads: {},
    identity: { async getVkUserId() { return '1'; }, persistProfile() {}, readProfile() { return {}; } },
    isDesktopVK: () => false,
    groupId: 0
  });

  const purchase = await platform.purchase('gems_pack_50');
  assert.strictEqual(purchase.ok, true);
  assert.strictEqual(purchase.orderId, 'order_gems_pack_50');
  assert.strictEqual(
    wasOrderProcessed('order_gems_pack_50'),
    false,
    'Покупка НЕ сжигает заказ: иначе упавшее сохранение навсегда съедает оплаченный товар'
  );

  // Отмена и недоступность различимы — от этого зависит текст игроку.
  const cancelled = await new VkPlatform({
    service: { async showOrderBox() { return { cancelled: true }; } },
    ads: {}, identity: {}, isDesktopVK: () => false, groupId: 0
  }).purchase('x');
  assert.deepStrictEqual(cancelled, { ok: false, cancelled: true });

  const unavailable = await new VkPlatform({
    service: { async showOrderBox() { return { unavailable: true }; } },
    ads: {}, identity: {}, isDesktopVK: () => false, groupId: 0
  }).purchase('x');
  assert.deepStrictEqual(unavailable, { ok: false, unavailable: true });

  global.localStorage = previousLs;

  console.log('  ✅ Заказ сжигается только после сохранения выдачи, касса реестр не трогает');
}
