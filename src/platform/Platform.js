/**
 * Контракт платформы (TASK-110, Фаза 0 захода в Telegram).
 *
 * Игра не должна знать, где она запущена. До этого модуля знала: `vk-bridge`
 * импортировался прямо в UI, `new VKService()` создавался в девяти местах, а
 * реклама и покупки звались из `vkAds.js` / `iapBuy.js` напрямую. Второй
 * платформе там было не за что зацепиться.
 *
 * Здесь описано ТОЛЬКО то, что игра реально просит у платформы. Никаких методов
 * «на будущее»: каждый пункт ниже имеет живой вызов в коде.
 *
 * Базовый класс отвечает «не умею» на всё. Это осознанно: платформа, где нет
 * рекламы или кассы, наследуется и переопределяет только то, что умеет, а
 * вызывающая сторона всегда получает предсказуемую форму ответа, а не исключение.
 */

/** Пустые отступы: столько же полей, сколько отдаёт VK, чтобы не ветвиться у вызова. */
export const EMPTY_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

export class Platform {
  constructor() {
    /** Колбэк на изменение отступов; выставляется снаружи (main.js). */
    this.onInsets = null;
    this._insets = { ...EMPTY_INSETS };
  }

  /** Короткий идентификатор: 'vk' | 'telegram' | 'standalone'. */
  get id() {
    return 'standalone';
  }

  /**
   * Что платформа умеет. Читается UI, чтобы не рисовать мёртвые кнопки:
   * «Пригласить» без инвайтов или «Двор» без сообществ — это ловушка для игрока.
   */
  get capabilities() {
    return {
      ads: false,
      banner: false,
      payments: false,
      invite: false,
      wallPost: false,
      community: false,
      haptics: false
    };
  }

  /** Последние известные отступы (вырез, шапка клиента). */
  get insets() {
    return this._insets;
  }

  /** Запуск SDK платформы. Никогда не бросает — игра должна стартовать всегда. */
  async init() {
    return null;
  }

  /** Профиль игрока. Форма ответа одна на все платформы. */
  async getUserInfo() {
    return { id: 0, firstName: '', lastName: '', photo: '' };
  }

  /** Стабильный идентификатор игрока в пределах платформы. */
  async getUserId() {
    return '';
  }

  /** Запомнить профиль локально (имя и аватар нужны таблице лидеров офлайн). */
  persistProfile() {}

  /** Прочитать локально запомненный профиль. */
  readProfile() {
    return { id: '', firstName: '', lastName: '', avatar: '' };
  }

  /**
   * Облачное хранилище платформы.
   * @returns {Promise<Object|null>} карта ключ → значение, либо null, если не ответило.
   *   null и пустой объект — разные вещи: первое значит «не знаем», второе «пусто».
   *   На этом различии держится защита от затирания прогресса (TASK-106).
   */
  async storageGet() {
    return null;
  }

  /**
   * Запись в облако. Возвращает РЕАЛЬНЫЙ результат: true только если платформа
   * подтвердила запись. Таймаут — это false, а не «наверное сохранилось».
   */
  async storageSet() {
    return false;
  }

  /** Ролик за награду. @returns {Promise<{success: boolean, reason?: string}>} */
  async showRewardedAd() {
    return { success: false, reason: 'ADS_UNAVAILABLE' };
  }

  /** Баннер (там, где он вообще есть). */
  async showBannerAd() {
    return { success: false, reason: 'ADS_UNAVAILABLE' };
  }

  /**
   * Покупка за валюту платформы.
   * @returns {Promise<{ok: boolean, cancelled?: boolean, unavailable?: boolean,
   *   duplicate?: boolean, orderId?: string}>}
   */
  async purchase() {
    return { ok: false, unavailable: true };
  }

  /** Поделиться ссылкой на игру. */
  async share() {
    return { unavailable: true };
  }

  /** Пост на стену / в канал. */
  async sharePost() {
    return { unavailable: true };
  }

  /** Позвать друзей. */
  async invite() {
    return { unavailable: true };
  }

  /** Вступить в сообщество игры. */
  async joinCommunity() {
    return { unavailable: true };
  }

  /** Тактильный отклик. Молча ничего не делает там, где его нет. */
  haptic() {}

  /** Десктопный клиент: от этого зависит порядок форматов рекламы и размер окна. */
  isDesktop() {
    return false;
  }

  /** Внутреннее: запомнить отступы и дёрнуть подписчика. */
  _setInsets(next) {
    this._insets = { ...EMPTY_INSETS, ...(next || {}) };
    if (typeof this.onInsets === 'function') this.onInsets(this._insets);
    return this._insets;
  }
}

export default Platform;
