/**
 * Telegram за контрактом Platform (TASK-110, TASK-114).
 *
 * Запуск SDK, профиль, CloudStorage, тактильный отклик, отступы, шаринг работают
 * сами по себе. Касса (Stars) и реклама (Adsgram) требуют настройки: без токена
 * бота на сервере и без идентификатора рекламного блока в сборке они честно
 * отвечают `unavailable` вместо того, чтобы делать вид, что работают.
 *
 * Про личность игрока. `initDataUnsafe.user.id` — это данные КЛИЕНТА, их можно
 * подделать из консоли, на что и намекает слово unsafe в названии. Здесь он годится
 * ровно на две вещи: показать имя в интерфейсе и разложить прогресс по ключам
 * CloudStorage (который и так свой у каждого аккаунта Telegram). Всё, что стоит
 * денег или прогресса, обязано проверять подпись `initData` на сервере — этим
 * занимается server/src/middleware/playerAuth.js.
 */
import { Platform } from './Platform.js';
import { createStarsInvoice } from '../api/client.js';
import { telegramInviteLink, parseReferralParam } from '../config/telegram.js';

/** Лимит значения в Telegram CloudStorage — 4096 байт на ключ. */
export const TG_CLOUD_VALUE_LIMIT = 4096;

function webApp() {
  if (typeof window === 'undefined') return null;
  return (window.Telegram && window.Telegram.WebApp) || null;
}

export class TelegramPlatform extends Platform {
  constructor(deps = {}) {
    super();
    this._webApp = deps.webApp || null;
    this._invoice = deps.createInvoice || createStarsInvoice;
    // Идентификатор рекламного блока приходит из сборки: без него рекламы нет,
    // и модалка не должна делать вид, что она есть.
    this._adsgramBlockId = deps.adsgramBlockId !== undefined
      ? deps.adsgramBlockId
      : (typeof __ADSGRAM_BLOCK_ID__ !== 'undefined' ? __ADSGRAM_BLOCK_ID__ : '');
    this._adController = deps.adController || null;
  }

  get id() {
    return 'telegram';
  }

  get app() {
    return this._webApp || webApp();
  }

  get capabilities() {
    return {
      ads: Boolean(this._adsgramBlockId),
      banner: false,
      payments: typeof (this.app && this.app.openInvoice) === 'function',
      invite: true,
      wallPost: false,
      community: false,
      haptics: true
    };
  }

  async init() {
    const app = this.app;
    if (!app) return null;
    try {
      if (typeof app.ready === 'function') app.ready();
      if (typeof app.expand === 'function') app.expand();
      this._readInsets();
      if (typeof app.onEvent === 'function') {
        app.onEvent('safeAreaChanged', () => this._readInsets());
        app.onEvent('contentSafeAreaChanged', () => this._readInsets());
        app.onEvent('viewportChanged', () => this._readInsets());
      }
    } catch (e) {
      console.warn('Telegram WebApp init warning:', e);
    }
    return app;
  }

  /**
   * Отступы: у Telegram их два набора. `safeAreaInset` — это вырез самого
   * устройства, `contentSafeAreaInset` — шапка клиента с кнопками. Под HUD нужна
   * сумма: иначе он уедет под системную чёлку или под кнопку «закрыть».
   */
  _readInsets() {
    const app = this.app;
    if (!app) return this._insets;
    const device = app.safeAreaInset || {};
    const content = app.contentSafeAreaInset || {};
    return this._setInsets({
      top: (Number(device.top) || 0) + (Number(content.top) || 0),
      right: (Number(device.right) || 0) + (Number(content.right) || 0),
      bottom: (Number(device.bottom) || 0) + (Number(content.bottom) || 0),
      left: (Number(device.left) || 0) + (Number(content.left) || 0)
    });
  }

  _user() {
    const app = this.app;
    const unsafe = app && app.initDataUnsafe;
    return (unsafe && unsafe.user) || null;
  }

  async getUserInfo() {
    const user = this._user();
    if (!user || !user.id) {
      return { id: 0, firstName: '', lastName: '', photo: '' };
    }
    return {
      id: user.id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      photo: user.photo_url || ''
    };
  }

  async getUserId() {
    const user = this._user();
    return user && user.id ? String(user.id) : '';
  }

  persistProfile(info = {}) {
    if (typeof localStorage === 'undefined') return;
    try {
      if (info.id) localStorage.setItem('cat_empire_tg_user_id', String(info.id));
      if (info.firstName != null) localStorage.setItem('cat_empire_tg_first_name', String(info.firstName || ''));
      if (info.lastName != null) localStorage.setItem('cat_empire_tg_last_name', String(info.lastName || ''));
      if (info.photo != null || info.avatar != null) {
        localStorage.setItem('cat_empire_tg_avatar', String(info.photo || info.avatar || ''));
      }
    } catch (e) {}
  }

  readProfile() {
    if (typeof localStorage === 'undefined') return super.readProfile();
    try {
      return {
        id: localStorage.getItem('cat_empire_tg_user_id') || '',
        firstName: localStorage.getItem('cat_empire_tg_first_name') || '',
        lastName: localStorage.getItem('cat_empire_tg_last_name') || '',
        avatar: localStorage.getItem('cat_empire_tg_avatar') || ''
      };
    } catch (e) {
      return super.readProfile();
    }
  }

  get _cloud() {
    const app = this.app;
    return (app && app.CloudStorage) || null;
  }

  /**
   * Чтение из CloudStorage. Возвращает ту же форму, что и VK: карта ключ → значение
   * с распарсенным JSON, либо null, если хранилище не ответило. Разница между null
   * и пустым объектом здесь так же важна, как в VK: на ней держится защита от
   * записи стартовой заглушки поверх настоящего прогресса.
   */
  async storageGet(keys = ['cat_empire_progress']) {
    const cloud = this._cloud;
    if (!cloud || typeof cloud.getItems !== 'function') return null;
    const list = Array.isArray(keys) ? keys : [keys];

    const raw = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 5000);
      try {
        cloud.getItems(list, (err, values) => {
          clearTimeout(timer);
          resolve(err ? null : values);
        });
      } catch (e) {
        clearTimeout(timer);
        resolve(null);
      }
    });

    if (!raw || typeof raw !== 'object') return null;

    const result = {};
    Object.keys(raw).forEach((key) => {
      const value = raw[key];
      if (value === undefined || value === null || value === '') return;
      try {
        result[key] = JSON.parse(value);
      } catch (e) {
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * Запись в CloudStorage. Значение свыше 4096 байт Telegram молча не примет,
   * поэтому проверяем сами и честно возвращаем false — вызывающая сторона по
   * этому флагу решает, доверять ли сохранению.
   */
  async storageSet(key, value) {
    const cloud = this._cloud;
    if (!cloud || typeof cloud.setItem !== 'function') return false;

    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    const size = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(payload).length
      : payload.length;
    if (size > TG_CLOUD_VALUE_LIMIT) {
      console.warn(`⚠️ Telegram CloudStorage: значение ${size} Б превышает лимит ${TG_CLOUD_VALUE_LIMIT} Б`);
      return false;
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 5000);
      try {
        cloud.setItem(key, payload, (err, stored) => {
          clearTimeout(timer);
          resolve(!err && Boolean(stored));
        });
      } catch (e) {
        clearTimeout(timer);
        resolve(false);
      }
    });
  }

  async share(link) {
    const app = this.app;
    if (!app || typeof app.openTelegramLink !== 'function' || !link) {
      return { unavailable: true };
    }
    try {
      app.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}`);
      return { success: true };
    } catch (e) {
      return { unavailable: true };
    }
  }

  /** Кто привёл игрока: параметр из ссылки `?startapp=ref_<id>`. */
  referrerId() {
    const app = this.app;
    const unsafe = app && app.initDataUnsafe;
    return parseReferralParam(unsafe && unsafe.start_param);
  }

  /**
   * Приглашение — это ссылка на бота с параметром. Открываем штатный диалог
   * «поделиться»: он предлагает выбрать чат, а не отправляет что-то за игрока.
   */
  async invite() {
    const app = this.app;
    const user = this._user();
    if (!app || typeof app.openTelegramLink !== 'function' || !user || !user.id) {
      return { unavailable: true };
    }
    const link = telegramInviteLink(user.id);
    const text = 'Забирай котиков и 25 рубинов на старте';
    try {
      app.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
      );
      return { success: true, link };
    } catch (e) {
      return { unavailable: true };
    }
  }

  /**
   * Покупка за звёзды.
   *
   * Клиент здесь НИЧЕГО не начисляет и не может: ссылку на оплату выписывает
   * сервер по идентификатору товара, а рубины выдаёт вебхук `successful_payment`.
   * Поэтому в ответе стоит `serverGranted` — вызывающий код по нему понимает, что
   * добавлять валюту локально нельзя, надо забрать подтверждённый баланс.
   *
   * `openInvoice` отвечает статусом: paid | cancelled | failed | pending.
   * `pending` — это «Telegram ещё думает»: товар не выдан, но и отказа нет,
   * поэтому обещать игроку успех нельзя.
   */
  async purchase(itemId) {
    const app = this.app;
    if (!app || typeof app.openInvoice !== 'function') {
      return { ok: false, unavailable: true };
    }

    const invoice = await this._invoice(itemId);
    if (!invoice || !invoice.link) {
      return { ok: false, unavailable: true };
    }

    const status = await new Promise((resolve) => {
      try {
        app.openInvoice(invoice.link, resolve);
      } catch (e) {
        resolve('failed');
      }
    });

    if (status === 'paid') {
      return { ok: true, orderId: invoice.link, serverGranted: true, rubies: invoice.rubies };
    }
    if (status === 'cancelled') return { ok: false, cancelled: true };
    if (status === 'pending') return { ok: false, pending: true };
    return { ok: false };
  }

  /**
   * Ролик Adsgram. SDK грузится по требованию: тянуть его на старте — значит
   * замедлить первый экран ради того, что понадобится далеко не каждому игроку.
   */
  async showRewardedAd() {
    if (!this._adsgramBlockId) return { success: false, reason: 'ADS_NOT_CONFIGURED' };

    try {
      const controller = await this._getAdController();
      if (!controller) return { success: false, reason: 'ADS_SDK_UNAVAILABLE' };
      await controller.show();
      // Adsgram резолвит промис только на досмотренном ролике.
      return { success: true, format: 'adsgram_reward' };
    } catch (e) {
      const reason = (e && (e.description || e.message)) || 'ADS_FAILED';
      return { success: false, reason: String(reason) };
    }
  }

  async _getAdController() {
    if (this._adController) return this._adController;
    if (typeof window === 'undefined') return null;

    if (!window.Adsgram) {
      const loaded = await new Promise((resolve) => {
        try {
          const script = document.createElement('script');
          script.src = 'https://sad.adsgram.ai/js/sad.min.js';
          script.async = true;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.head.appendChild(script);
          setTimeout(() => resolve(Boolean(window.Adsgram)), 8000);
        } catch (e) {
          resolve(false);
        }
      });
      if (!loaded || !window.Adsgram) return null;
    }

    this._adController = window.Adsgram.init({ blockId: String(this._adsgramBlockId) });
    return this._adController;
  }

  haptic(style = 'medium') {
    const app = this.app;
    const haptics = app && app.HapticFeedback;
    if (!haptics || typeof haptics.impactOccurred !== 'function') return;
    try {
      haptics.impactOccurred(style === 'heavy' ? 'heavy' : style === 'light' ? 'light' : 'medium');
    } catch (e) {}
  }

  isDesktop() {
    const app = this.app;
    const platform = String((app && app.platform) || '').toLowerCase();
    return platform === 'tdesktop' || platform === 'macos' || platform === 'web' || platform === 'weba';
  }
}

export default TelegramPlatform;
