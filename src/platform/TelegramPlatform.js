/**
 * Telegram за контрактом Platform (TASK-110, Фаза 0).
 *
 * Здесь реализовано только то, что работает БЕЗ бэкенда: запуск SDK, профиль,
 * CloudStorage, тактильный отклик, отступы, шаринг. Реклама и касса возвращают
 * `unavailable` осознанно — они появятся в Фазе 1 вместе с ботом, вебхуком Stars
 * и проверкой initData. Полурабочая касса хуже отсутствующей: игрок нажмёт и
 * решит, что игра сломана.
 *
 * Про личность игрока. `initDataUnsafe.user.id` — это данные КЛИЕНТА, их можно
 * подделать из консоли, на что и намекает слово unsafe в названии. Здесь он годится
 * ровно на две вещи: показать имя в интерфейсе и разложить прогресс по ключам
 * CloudStorage (который и так свой у каждого аккаунта Telegram). Всё, что стоит
 * денег или прогресса, обязано проверять подпись `initData` на сервере — это
 * первый пункт Фазы 1, до включения Stars.
 */
import { Platform } from './Platform.js';

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
  }

  get id() {
    return 'telegram';
  }

  get app() {
    return this._webApp || webApp();
  }

  get capabilities() {
    return {
      ads: false,       // Фаза 1: Adsgram
      banner: false,
      payments: false,  // Фаза 1: Stars + вебхук successful_payment
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

  async invite() {
    // Приглашение в Telegram — это та же ссылка с реферальным параметром.
    // Сам параметр появится в Фазе 1 вместе с ботом; пока звать некуда.
    return { unavailable: true };
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
