import assert from 'node:assert';
import { Platform } from '../../src/platform/Platform.js';
import { VkPlatform } from '../../src/platform/VkPlatform.js';
import { TelegramPlatform, TG_CLOUD_VALUE_LIMIT } from '../../src/platform/TelegramPlatform.js';
import { createPlatform, resolvePlatformId, getPlatform, setPlatform } from '../../src/platform/index.js';

function fakeVkService() {
  const calls = [];
  return {
    calls,
    lastInsets: { top: 52, right: 0, bottom: 20, left: 0 },
    onInsets: null,
    async init() { calls.push(['init']); return { ok: true }; },
    async getUserInfo() { calls.push(['getUserInfo']); return { id: 7, firstName: 'Кот', lastName: 'Барсик', photo: '' }; },
    async storageGet(keys) { calls.push(['storageGet', keys]); return { cat_empire_progress: { c: 500 } }; },
    async storageSet(key, value) { calls.push(['storageSet', key, value]); return true; },
    async shareLink(link) { calls.push(['shareLink', link]); return { success: true }; },
    async sharePost(msg) { calls.push(['sharePost', msg]); return { success: true }; },
    async showInviteBox() { calls.push(['showInviteBox']); return { success: true }; },
    async joinGroup(id) { calls.push(['joinGroup', id]); return { success: true }; },
    async showOrderBox(item) { calls.push(['showOrderBox', item]); return { success: true, orderId: `order_${item}` }; },
    triggerHaptic(style) { calls.push(['haptic', style]); }
  };
}

function fakeTelegramApp({ items = {}, setOk = true } = {}) {
  return {
    initData: 'query_id=AAA',
    initDataUnsafe: { user: { id: 4242, first_name: 'Аня', last_name: 'К', photo_url: 'http://x/y.jpg' } },
    platform: 'android',
    safeAreaInset: { top: 24, right: 0, bottom: 0, left: 0 },
    contentSafeAreaInset: { top: 46, right: 0, bottom: 0, left: 0 },
    ready() {},
    expand() {},
    onEvent() {},
    HapticFeedback: { impactOccurred() {} },
    CloudStorage: {
      getItems(keys, cb) {
        const out = {};
        keys.forEach((k) => { out[k] = items[k] !== undefined ? items[k] : ''; });
        cb(null, out);
      },
      setItem(key, value, cb) {
        items[key] = value;
        cb(null, setOk);
      }
    },
    _items: items
  };
}

export async function runPlatformTests() {
  console.log('🧪 Тестирование платформенного шва (VK / Telegram)...');

  // Базовый контракт: всё «не умею», но предсказуемой формы — без исключений.
  const base = new Platform();
  assert.strictEqual(base.id, 'standalone');
  assert.strictEqual(await base.storageGet(), null, 'Молчание хранилища — это null, а не пустой объект');
  assert.strictEqual(await base.storageSet('k', 'v'), false);
  assert.deepStrictEqual(await base.purchase('pack'), { ok: false, unavailable: true });
  assert.strictEqual((await base.showRewardedAd()).success, false);
  base.haptic('medium'); // не бросает там, где вибрации нет

  // VK: обёртка обязана звать ровно старый код, не подменяя семантику.
  const service = fakeVkService();
  const vk = new VkPlatform({
    service,
    ads: { async showRewardedAd() { return { success: true }; }, async showDesktopBannerAd() { return { success: true }; } },
    identity: {
      async getVkUserId() { return '12345'; },
      persistProfile() {},
      readProfile() { return { id: '12345', firstName: 'Кот', lastName: '', avatar: '' }; }
    },
    isDesktopVK: () => true,
    groupId: 240490134
  });

  assert.strictEqual(vk.id, 'vk');
  await vk.init();
  assert.deepStrictEqual(vk.insets, { top: 52, right: 0, bottom: 20, left: 0 }, 'init прокидывает отступы VK в контракт');

  const loaded = await vk.storageGet(['cat_empire_progress']);
  assert.deepStrictEqual(loaded, { cat_empire_progress: { c: 500 } });
  assert.strictEqual(await vk.storageSet('cat_empire_progress', { c: 1 }), true);
  assert.strictEqual(await vk.getUserId(), '12345');
  assert.strictEqual((await vk.purchase('gems_pack_10')).orderId, 'order_gems_pack_10');
  await vk.joinCommunity();
  assert.deepStrictEqual(
    service.calls.find((c) => c[0] === 'joinGroup'),
    ['joinGroup', 240490134],
    'joinCommunity без аргумента берёт сообщество из конфига'
  );
  vk.haptic('light');
  assert.deepStrictEqual(service.calls.find((c) => c[0] === 'haptic'), ['haptic', 'light']);
  assert.strictEqual(vk.capabilities.payments, true);
  assert.strictEqual(vk.capabilities.banner, true, 'Баннер VK доступен на десктопе');

  // Telegram: то, что работает без бэкенда.
  const app = fakeTelegramApp({ items: { cat_empire_progress: JSON.stringify({ c: 900, m: 5 }) } });
  const tg = new TelegramPlatform({ webApp: app });

  assert.strictEqual(tg.id, 'telegram');
  await tg.init();
  assert.deepStrictEqual(
    tg.insets,
    { top: 70, right: 0, bottom: 0, left: 0 },
    'Отступы Telegram — сумма выреза устройства и шапки клиента'
  );

  const profile = await tg.getUserInfo();
  assert.strictEqual(profile.id, 4242);
  assert.strictEqual(profile.firstName, 'Аня');
  assert.strictEqual(await tg.getUserId(), '4242');

  const tgLoaded = await tg.storageGet(['cat_empire_progress']);
  assert.deepStrictEqual(tgLoaded, { cat_empire_progress: { c: 900, m: 5 } }, 'CloudStorage отдаёт распарсенный JSON');
  assert.strictEqual(await tg.storageSet('cat_empire_progress', { c: 10 }), true);

  // Лимит 4096 байт: Telegram такое значение молча не примет, поэтому проверяем сами.
  const tooBig = { s: new Array(3000).fill([1, 15]) };
  assert.strictEqual(
    await tg.storageSet('cat_empire_progress', tooBig),
    false,
    `Значение больше ${TG_CLOUD_VALUE_LIMIT} Б не считается сохранённым`
  );

  // Без openInvoice и без блока Adsgram касса и реклама честно недоступны.
  assert.deepStrictEqual(await tg.purchase('gems_pack_10'), { ok: false, unavailable: true });
  assert.strictEqual(tg.capabilities.payments, false, 'Нет openInvoice — нет кассы');
  assert.strictEqual(tg.capabilities.ads, false, 'Нет блока Adsgram — нет рекламы');
  assert.strictEqual((await tg.showRewardedAd()).reason, 'ADS_NOT_CONFIGURED');

  // --- Оплата звёздами ---
  const invoiceCalls = [];
  function payingApp(status) {
    return Object.assign(fakeTelegramApp(), {
      openInvoice(link, cb) { invoiceCalls.push(link); cb(status); }
    });
  }

  const paid = new TelegramPlatform({
    webApp: payingApp('paid'),
    createInvoice: async (itemId) => ({ link: `https://t.me/invoice/${itemId}`, stars: 200, rubies: 50 })
  });
  assert.strictEqual(paid.capabilities.payments, true, 'openInvoice есть — касса доступна');

  const paidResult = await paid.purchase('gems_pack_50');
  assert.strictEqual(paidResult.ok, true);
  assert.strictEqual(
    paidResult.serverGranted,
    true,
    'Рубины за звёзды начисляет вебхук: клиент обязан знать, что добавлять их самому нельзя'
  );
  assert.deepStrictEqual(invoiceCalls, ['https://t.me/invoice/gems_pack_50']);

  const cancelled = new TelegramPlatform({
    webApp: payingApp('cancelled'),
    createInvoice: async () => ({ link: 'https://t.me/invoice/x' })
  });
  assert.deepStrictEqual(await cancelled.purchase('gems_pack_50'), { ok: false, cancelled: true });

  // pending — это не успех: товар ещё не выдан, обещать его игроку нельзя.
  const pending = new TelegramPlatform({
    webApp: payingApp('pending'),
    createInvoice: async () => ({ link: 'https://t.me/invoice/x' })
  });
  assert.deepStrictEqual(await pending.purchase('gems_pack_50'), { ok: false, pending: true });

  // Сервер не выписал счёт — покупка не начинается.
  const noInvoice = new TelegramPlatform({
    webApp: payingApp('paid'),
    createInvoice: async () => null
  });
  assert.deepStrictEqual(await noInvoice.purchase('gems_pack_50'), { ok: false, unavailable: true });

  // --- Реклама Adsgram ---
  const withAds = new TelegramPlatform({
    webApp: fakeTelegramApp(),
    adsgramBlockId: 'block-1',
    adController: { async show() { return { done: true }; } }
  });
  assert.strictEqual(withAds.capabilities.ads, true);
  assert.strictEqual((await withAds.showRewardedAd()).success, true, 'Досмотренный ролик считается успехом');

  const failingAds = new TelegramPlatform({
    webApp: fakeTelegramApp(),
    adsgramBlockId: 'block-1',
    adController: { async show() { throw { description: 'no ads available' }; } }
  });
  const failed = await failingAds.showRewardedAd();
  assert.strictEqual(failed.success, false);
  assert.strictEqual(failed.reason, 'no ads available', 'Причина отказа сохраняется для аналитики');

  // Пустое хранилище: null означает «не ответило», а не «пусто».
  const silent = new TelegramPlatform({ webApp: { initData: '', CloudStorage: null } });
  assert.strictEqual(await silent.storageGet(['cat_empire_progress']), null);

  // Выбор платформы.
  assert.strictEqual(createPlatform('telegram').id, 'telegram');
  assert.strictEqual(createPlatform('vk').id, 'vk');
  assert.strictEqual(createPlatform('standalone').id, 'standalone');
  assert.strictEqual(resolvePlatformId(), 'vk', 'Без сборочного флага и без клиента остаёмся на VK');

  const stub = new Platform();
  setPlatform(stub);
  assert.strictEqual(getPlatform(), stub, 'Платформу можно подменить в тесте');
  setPlatform(null);

  console.log('  ✅ Контракт платформы держится: VK делегирует старый код, Telegram живёт без бэкенда');
}
