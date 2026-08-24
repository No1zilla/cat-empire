import assert from 'node:assert';
import {
  parseVkLaunchParams,
  isDesktopVkPlatform,
  isMobileVkPlatform,
  isOkLaunch,
  PlatformService
} from '../../src/services/PlatformService.js';
import {
  getNativeAdFormatOrder,
  isAdUserClosed,
  shouldSkipNativeAd,
  showRewardedAd,
  showDesktopBannerAd
} from '../../src/api/vkAds.js';

function installWindow({ search = '', hash = '', stored = null, bridge = null } = {}) {
  const store = {};
  if (stored != null) store.cat_empire_vk_launch_params = stored;
  const localStorage = {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); }
  };
  global.window = {
    location: { search, hash },
    vkBridge: bridge,
    localStorage
  };
  global.localStorage = localStorage;
}

export async function runVkAdsTests() {
  console.log('🧪 Тестирование VK Ads на desktop_web (interstitial + banner)...');

  assert.strictEqual(parseVkLaunchParams('?vk_platform=desktop_web&vk_user_id=1').vk_platform, 'desktop_web');
  assert.strictEqual(isDesktopVkPlatform('desktop_web'), true);
  assert.strictEqual(isDesktopVkPlatform('desktop_web_messenger'), true);
  assert.strictEqual(isDesktopVkPlatform('desktop_web_ok'), true);
  assert.strictEqual(isDesktopVkPlatform('mobile_android'), false);
  assert.strictEqual(isMobileVkPlatform('mobile_iphone'), true);
  assert.strictEqual(isMobileVkPlatform('mobile_iphone_ok'), true);
  assert.strictEqual(isMobileVkPlatform('mobile_web_ok'), true);
  assert.strictEqual(isMobileVkPlatform('desktop_web'), false);
  assert.strictEqual(isMobileVkPlatform('desktop_web_ok'), false);
  assert.deepStrictEqual(getNativeAdFormatOrder(true), ['interstitial', 'reward']);
  assert.deepStrictEqual(getNativeAdFormatOrder(false), ['reward', 'interstitial']);
  assert.strictEqual(isAdUserClosed('AD_CLOSED_EARLY'), true);
  assert.strictEqual(isAdUserClosed('NO_ADS'), false);
  assert.strictEqual(shouldSkipNativeAd({ result: false }), true);
  assert.strictEqual(shouldSkipNativeAd({ result: true }), false);
  assert.strictEqual(shouldSkipNativeAd(null), false);

  installWindow({ search: '?vk_platform=desktop_web&vk_user_id=7' });
  assert.strictEqual(PlatformService.isDesktopVK(), true);
  assert.strictEqual(PlatformService.isOK(), false);

  installWindow({ search: '?vk_platform=mobile_iphone&vk_user_id=7' });
  assert.strictEqual(PlatformService.isDesktopVK(), false);

  installWindow({ search: '?vk_platform=desktop_web_ok&vk_user_id=7&vk_client=ok' });
  assert.strictEqual(PlatformService.isDesktopVK(), true, 'ПК Одноклассников — тот же desktop iframe');
  assert.strictEqual(PlatformService.isOK(), true);
  assert.strictEqual(isOkLaunch({ platform: 'mobile_web_ok', client: '' }), true);
  assert.strictEqual(isOkLaunch({ platform: 'desktop_web', client: 'ok' }), true);

  const desktopCalls = [];
  installWindow({
    search: '?vk_platform=desktop_web&vk_user_id=7',
    bridge: {
      send: async (method, params) => {
        desktopCalls.push({ method, params: params || {} });
        if (method === 'VKWebAppCheckNativeAds') return { result: true };
        if (method === 'VKWebAppShowNativeAds' && params.ad_format === 'interstitial') {
          return { result: true };
        }
        throw { error_data: { error_reason: 'reward_unsupported' } };
      },
      subscribe: () => {},
      unsubscribe: () => {}
    }
  });
  const desktopShown = await showRewardedAd();
  assert.strictEqual(desktopShown.success, true, 'На ПК interstitial должен засчитать просмотр');
  assert.strictEqual(desktopShown.format, 'interstitial');
  const desktopShow = desktopCalls.filter((c) => c.method === 'VKWebAppShowNativeAds');
  assert.strictEqual(desktopShow[0].params.ad_format, 'interstitial', 'На ПК первой идёт полноэкранная реклама');
  assert.strictEqual(desktopShow.length, 1, 'После успешного interstitial второй формат не вызываем');

  const fallbackCalls = [];
  installWindow({
    search: '?vk_platform=desktop_web&vk_user_id=7',
    bridge: {
      send: async (method, params) => {
        fallbackCalls.push({ method, params: params || {} });
        if (method === 'VKWebAppCheckNativeAds') return { result: true };
        if (method === 'VKWebAppShowNativeAds' && params.ad_format === 'interstitial') {
          throw { error_data: { error_reason: 'no_ads' } };
        }
        if (method === 'VKWebAppShowNativeAds' && params.ad_format === 'reward') {
          assert.strictEqual(params.use_waterfall, true);
          return { result: true };
        }
        return { result: false };
      },
      subscribe: () => {},
      unsubscribe: () => {}
    }
  });
  const fallback = await showRewardedAd();
  assert.strictEqual(fallback.success, true);
  assert.strictEqual(fallback.format, 'reward');
  const fallbackShow = fallbackCalls.filter((c) => c.method === 'VKWebAppShowNativeAds').map((c) => c.params.ad_format);
  assert.deepStrictEqual(fallbackShow, ['interstitial', 'reward']);

  const closedCalls = [];
  installWindow({
    search: '?vk_platform=desktop_web&vk_user_id=7',
    bridge: {
      send: async (method, params) => {
        closedCalls.push({ method, params: params || {} });
        if (method === 'VKWebAppCheckNativeAds') return { result: true };
        if (method === 'VKWebAppShowNativeAds') {
          throw { error_data: { error_reason: 'AD_CLOSED_EARLY' } };
        }
        return { result: false };
      },
      subscribe: () => {},
      unsubscribe: () => {}
    }
  });
  const closed = await showRewardedAd();
  assert.strictEqual(closed.success, false);
  const closedShow = closedCalls.filter((c) => c.method === 'VKWebAppShowNativeAds');
  assert.strictEqual(closedShow.length, 1, 'Если игрок закрыл interstitial, reward не крутим следом');

  // Предпроверка сказала «нет» — show всё равно пробуем (она ложноотрицательная),
  // но ждём коротко, а не 20с. Раньше show не вызывался вообще и все отказы
  // были нашими собственными: 8 из 8 за сутки (TASK-083).
  const noAdsCalls = [];
  installWindow({
    search: '?vk_platform=desktop_web&vk_user_id=7',
    bridge: {
      send: async (method, params) => {
        noAdsCalls.push({ method, params: params || {} });
        if (method === 'VKWebAppCheckNativeAds') return { result: false };
        return { result: false, error_reason: 'No ads' };
      },
      subscribe: () => {},
      unsubscribe: () => {}
    }
  });
  const noAds = await showRewardedAd();
  assert.strictEqual(noAds.success, false);
  assert.strictEqual(noAds.check_said_no, true, 'Флаг предпроверки уезжает в аналитику');
  assert.strictEqual(
    noAdsCalls.some((c) => c.method === 'VKWebAppShowNativeAds'),
    true,
    'Отрицательная предпроверка больше не отменяет показ — VK спрашиваем сами'
  );

  // Показ ПОСЛЕ отрицательной предпроверки = она соврала. Это и надо померить.
  installWindow({
    search: '?vk_platform=desktop_web&vk_user_id=7',
    bridge: {
      send: async (method) => {
        if (method === 'VKWebAppCheckNativeAds') return { result: false };
        return { result: true };
      },
      subscribe: () => {},
      unsubscribe: () => {}
    }
  });
  const falseNegative = await showRewardedAd();
  assert.strictEqual(falseNegative.success, true, 'Ролик есть, хотя предпроверка отрицала');
  assert.strictEqual(falseNegative.check_said_no, true);

  // Лимит общий на приложение: второй формат его же и добьёт
  const quotaCalls = [];
  installWindow({
    search: '?vk_platform=desktop_web&vk_user_id=7',
    bridge: {
      send: async (method, params) => {
        quotaCalls.push({ method, params: params || {} });
        if (method === 'VKWebAppCheckNativeAds') return { result: true };
        return { result: false, error_reason: 'Requests limit reached' };
      },
      subscribe: () => {},
      unsubscribe: () => {}
    }
  });
  const quota = await showRewardedAd();
  assert.strictEqual(quota.success, false);
  assert.strictEqual(
    quotaCalls.filter((c) => c.method === 'VKWebAppShowNativeAds').length,
    1,
    'После «Requests limit reached» второй формат не запрашиваем'
  );

  const bannerCalls = [];
  installWindow({
    search: '?vk_platform=desktop_web&vk_user_id=7',
    bridge: {
      send: async (method, params) => {
        bannerCalls.push({ method, params: params || {} });
        if (method === 'VKWebAppCheckBannerAd') return { result: true };
        if (method === 'VKWebAppShowBannerAd') return { result: true, banner_height: 50 };
        return { result: false };
      }
    }
  });
  const banner = await showDesktopBannerAd();
  assert.strictEqual(banner.success, true);
  assert.strictEqual(bannerCalls.some((c) => c.method === 'VKWebAppShowBannerAd'), true);
  assert.strictEqual(bannerCalls.find((c) => c.method === 'VKWebAppShowBannerAd').params.banner_location, 'bottom');

  installWindow({
    search: '?vk_platform=mobile_android&vk_user_id=7',
    bridge: {
      send: async () => {
        throw new Error('banner should not run on mobile');
      }
    }
  });
  const mobileBanner = await showDesktopBannerAd();
  assert.strictEqual(mobileBanner.success, false);
  assert.strictEqual(mobileBanner.reason, 'NOT_DESKTOP');

  console.log('  ✅ VK Ads desktop waterfall и banner успешно пройдены!');
}
