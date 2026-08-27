import { saveProgress } from '../api/client.js';
import { VKService } from '../vk/VKBridge.js';
import { vkIdentity } from './VkIdentity.js';
import { isStarterSnapshot } from '../game/bootProgress.js';

const vkService = new VKService();
const STORAGE_KEY = 'cat_empire_progress';
const BEST_LEVEL_KEY = 'cat_empire_best_max_level';
const BEST_MERGES_KEY = 'cat_empire_best_merges';

export function progressRank(state = {}) {
  return (Number(state.maxCatLevel) || 1) * 1_000_000
    + (Number(state.totalMerges) || 0) * 100
    + (Number(state.totalCatsBought) || 0);
}

// TASK-108: правило живёт в bootProgress.js — чистом модуле без vk-bridge, чтобы
// его можно было покрыть тестами. Здесь реэкспорт, чтобы не плодить вторую копию.
export { isStarterSnapshot };

/**
 * Единый Сервис Хранения Данных с Алгоритмом Трехсторонней Конвергенции (Smart Tri-State Merger)
 * Гарантирует синхронизацию прогресса по п. 2.3.8 правил VK Mini Apps между ПК, Android, iOS и мобильным вебом.
 */
export class StorageService {
  /**
   * Нормализация снимков данных из любых источников (LocalStorage, VK Storage, PostgreSQL Server DB)
   */
  _normalizeState(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const coins = raw.c !== undefined ? raw.c : (raw.coins !== undefined ? raw.coins : 100);
    const gems = raw.g !== undefined ? raw.g : (raw.gems !== undefined ? raw.gems : 10);
    const maxCatLevel = raw.m !== undefined ? raw.m : (raw.maxCatLevel !== undefined ? raw.maxCatLevel : (raw.max_cat_level !== undefined ? raw.max_cat_level : 1));
    const totalCatsBought = raw.b !== undefined ? raw.b : (raw.totalCatsBought !== undefined ? raw.totalCatsBought : (raw.total_cats_bought !== undefined ? raw.total_cats_bought : 0));
    const totalMerges = raw.r !== undefined ? raw.r : (raw.totalMerges !== undefined ? raw.totalMerges : (raw.total_merges !== undefined ? raw.total_merges : 0));

    let gridState = raw.s !== undefined ? raw.s : (raw.gridState !== undefined ? raw.gridState : raw.grid_state);
    if (Array.isArray(gridState)) {
      gridState = gridState.map(item =>
        Array.isArray(item) ? { slotIndex: item[0], catLevel: item[1] } : item
      );
    } else {
      gridState = (Number(maxCatLevel) || 1) > 1
        ? []
        : [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }];
    }

    let updatedAt = raw.t !== undefined ? raw.t : (raw.updatedAt !== undefined ? raw.updatedAt : (raw.updated_at !== undefined ? (typeof raw.updated_at === 'string' ? Date.parse(raw.updated_at) : raw.updated_at) : 0));

    let normBought = Math.max(0, Number(totalCatsBought) || 0);
    const normMaxLvl = Math.max(1, Number(maxCatLevel) || 1);
    // Защита новичков: для уровней 1-6 стоимость не должна улетать в 1300 из-за рекламы/ошибок
    if (normMaxLvl < 7 && normBought > normMaxLvl * 30) {
      normBought = normMaxLvl * 30;
    }

    return {
      coins: Number(coins) || 0,
      gems: Number(gems) || 0,
      maxCatLevel: normMaxLvl,
      totalCatsBought: normBought,
      totalMerges: Math.max(0, Number(totalMerges) || 0),
      gridState,
      updatedAt: Number(updatedAt) || 0,
      isReset: Boolean(raw.isReset || raw.is_reset || raw.x)
    };
  }

  /**
   * Слить снимки по прогрессу, не по часам. Свежая пустая катка не затирает империю.
   */
  mergeStates(stateA, stateB) {
    const a = this._normalizeState(stateA);
    const b = this._normalizeState(stateB);

    if (!a) return b || {};
    if (!b) return a || {};

    if (a.isReset && !b.isReset && isStarterSnapshot(a)) return a;
    if (b.isReset && !a.isReset && isStarterSnapshot(b)) return b;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('cat_empire_is_reset') === '1') {
      if (a.coins === 100 && a.totalMerges === 0) return a;
      if (b.coins === 100 && b.totalMerges === 0) return b;
    }

    const rankA = progressRank(a);
    const rankB = progressRank(b);
    if (rankB !== rankA) return rankB > rankA ? b : a;

    const timeA = Number(a.updatedAt) || 0;
    const timeB = Number(b.updatedAt) || 0;
    if (timeB !== timeA) return timeB > timeA ? b : a;

    return (Number(b.coins) || 0) > (Number(a.coins) || 0) ? b : a;
  }

  async loadProgress() {
    // Сброс из настроек: не подмешиваем старую империю из VK/БД, пока флаг жив.
    let resetting = false;
    try {
      resetting = typeof localStorage !== 'undefined' && localStorage.getItem('cat_empire_is_reset') === '1';
    } catch (e) {}
    if (resetting) {
      console.log('🧹 Загрузка после сброса прогресса: чистый баланс...');
      const cleanResetState = {
        coins: 100,
        gems: 10,
        maxCatLevel: 1,
        totalCatsBought: 0,
        totalMerges: 0,
        gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }],
        updatedAt: Date.now(),
        isReset: true
      };
      this._writeLocalCache(cleanResetState, cleanResetState.updatedAt);
      // Не ждём VK Storage / API на сплэше — облако пишем в фоне.
      this.saveProgress(cleanResetState)
        .then(() => {
          // TASK-109: сброс доехал до облака — флаг больше не нужен. Пока он висел,
          // КАЖДАЯ загрузка возвращалась сюда и переписывала VK Storage пустышкой,
          // то есть прогресс обнулялся при любом обновлении страницы.
          if (this.lastCloudSaveOk) this._clearResetFlag();
        })
        .catch((e) => {
          console.warn('Сброс: облако не записалось на загрузке', e);
        });
      return cleanResetState;
    }

    const hasLocalCache = typeof localStorage !== 'undefined' && (
      localStorage.getItem('cat_empire_last_updated_at') ||
      localStorage.getItem('cat_empire_grid_state') ||
      localStorage.getItem('cat_empire_last_max_level')
    );

    let localData = null;
    if (hasLocalCache) {
      try {
        const raw = localStorage.getItem('cat_empire_grid_state');
        localData = this._normalizeState({
          coins: parseFloat(localStorage.getItem('cat_empire_last_coins') || '100'),
          gems: parseInt(localStorage.getItem('cat_empire_last_gems') || '10', 10),
          maxCatLevel: parseInt(localStorage.getItem('cat_empire_last_max_level') || '1', 10),
          totalCatsBought: parseInt(localStorage.getItem('cat_empire_last_total_bought') || '0', 10),
          totalMerges: parseInt(localStorage.getItem('cat_empire_last_total_merges') || '0', 10),
          updatedAt: parseInt(localStorage.getItem('cat_empire_last_updated_at') || '0', 10),
          gridState: raw ? JSON.parse(raw) : null
        });
      } catch (e) {}
    }

    // TASK-107: прогресс живёт в VK Storage. Сервер из пути загрузки убран целиком —
    // он на Railway, а до него из РФ ответ регулярно шёл дольше таймаута, и игра
    // сваливалась в стартовую заглушку (TASK-106). VK Storage идёт через инфраструктуру
    // самого ВКонтакте: он и быстрее, и привязан к аккаунту, то есть сам по себе даёт
    // кросс-платформенность между десктопом и телефоном.
    let resultState = localData;
    const vkStorage = await vkService.storageGet([STORAGE_KEY]).catch((e) => {
      console.warn('Ошибка загрузки из VK Storage:', e);
      return null;
    });

    if (vkStorage && vkStorage[STORAGE_KEY]) {
      resultState = this.mergeStates(resultState, this._normalizeState(vkStorage[STORAGE_KEY]));
    }

    // Подтверждено ли состояние? Если VK Storage промолчал и локального кэша нет,
    // прогресс игрока нам неизвестен — ниже подставится стартовый снимок, и без
    // этого флага он уехал бы в облако и затёр настоящую империю.
    this.lastLoadVerified = Boolean((vkStorage && vkStorage[STORAGE_KEY]) || localData);
    if (!this.lastLoadVerified) {
      console.warn('⚠️ Прогресс не подтверждён ни одним хранилищем — облачные записи заморожены до успешной загрузки');
    }

    const finalState = this._normalizeState(resultState) || {
      coins: 100,
      gems: 10,
      maxCatLevel: 1,
      totalCatsBought: 0,
      totalMerges: 0,
      updatedAt: Date.now(),
      gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }]
    };

    this._writeLocalCache(finalState, Number(finalState.updatedAt) || Date.now());
    this._rememberHighWater(finalState);
    return finalState;
  }

  _rememberHighWater(data) {
    if (typeof localStorage === 'undefined' || !data) return;
    try {
      const bestLvl = Math.max(Number(localStorage.getItem(BEST_LEVEL_KEY)) || 1, Number(data.maxCatLevel) || 1);
      const bestMerges = Math.max(Number(localStorage.getItem(BEST_MERGES_KEY)) || 0, Number(data.totalMerges) || 0);
      localStorage.setItem(BEST_LEVEL_KEY, String(bestLvl));
      localStorage.setItem(BEST_MERGES_KEY, String(bestMerges));
    } catch (e) {}
  }

  _writeLocalCache(data, timestamp) {
    if (typeof localStorage === 'undefined' || !data) return;
    try {
      if (data.coins !== undefined) localStorage.setItem('cat_empire_last_coins', String(data.coins));
      if (data.gems !== undefined) localStorage.setItem('cat_empire_last_gems', String(data.gems));
      if (data.maxCatLevel !== undefined) localStorage.setItem('cat_empire_last_max_level', String(data.maxCatLevel));
      if (data.totalCatsBought !== undefined) localStorage.setItem('cat_empire_last_total_bought', String(data.totalCatsBought));
      if (data.totalMerges !== undefined) localStorage.setItem('cat_empire_last_total_merges', String(data.totalMerges));
      if (data.gridState) localStorage.setItem('cat_empire_grid_state', JSON.stringify(data.gridState));
      localStorage.setItem('cat_empire_last_updated_at', String(timestamp));
    } catch (e) {}
  }

  /** Стоит ли флаг «прогресс только что сброшен». */
  _isResetFlagged() {
    if (typeof localStorage === 'undefined') return false;
    try {
      return localStorage.getItem('cat_empire_is_reset') === '1';
    } catch (e) {
      return false;
    }
  }

  /** Снять флаг сброса. Единственная точка — чтобы он снова не залип. */
  _clearResetFlag() {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.removeItem('cat_empire_is_reset'); } catch (e) {}
  }

  async saveProgress(data) {
    if (!data) return;

    const timestamp = Number(data.updatedAt) || Date.now();
    const starter = isStarterSnapshot(data);

    // TASK-109: флаг сброса помечает только сам сброс и стартовое состояние сразу
    // после него. Раньше он делал resetSave=true у ЛЮБОГО сохранения — включая
    // настоящую империю, — а снять флаг мог лишь код под `!resetSave`. Условие
    // противоречило само себе: единожды выставленный флаг не снимался никогда, и
    // loadProgress на каждой загрузке отдавал чистый баланс поверх прогресса.
    const resetSave = Boolean(data.isReset) || (this._isResetFlagged() && starter);
    if (!resetSave) this._rememberHighWater(data);
    this._writeLocalCache(data, timestamp);

    // Игрок сыграл после сброса — флагу конец, дальше сохраняемся как обычно.
    if (!starter) this._clearResetFlag();

    // TASK-106: не затираем облако состоянием, которого не подтверждали.
    // Если загрузка свалилась в стартовую заглушку по таймауту, писать её в VK Storage
    // и на сервер нельзя — именно так терялась настоящая империя. Локальный кэш выше
    // уже записан, игрок не теряет сессию; в облако уйдёт после успешной загрузки.
    if (this.lastLoadVerified === false && isStarterSnapshot(data) && !resetSave) {
      console.warn('🛑 Загрузка не подтверждена — стартовый снимок в облако не пишем');
      return;
    }

    // Раньше здесь стоял ранний return по _isDowngrade — «не писать сейв слабее прежнего».
    // Метки рекорда живут в localStorage и только растут, поэтому после потери облачного
    // прогресса игрок навсегда оказывался ниже собственного рекорда и КАЖДОЕ сохранение
    // отбрасывалось — отыграть путь назад было невозможно, ведь он не сохранялся.
    // Защита от отката осталась на сервере (userService.saveUserProgress), и там она
    // сравнивает с РЕАЛЬНО сохранённым значением, а не с протухшей локальной меткой.

    const compactGrid = Array.isArray(data.gridState)
      ? data.gridState.map((c) => [c.slotIndex, c.catLevel])
      : [];
    const profile = vkIdentity.readProfile ? vkIdentity.readProfile() : {};
    const compact = {
      c: Math.round(Number(data.coins) || 0),
      g: data.gems,
      m: data.maxCatLevel,
      b: data.totalCatsBought,
      r: data.totalMerges,
      s: compactGrid,
      t: timestamp
    };
    if (resetSave) compact.x = 1;

    // TASK-107: VK Storage — единственное хранилище прогресса, его ждём и проверяем.
    const stored = await vkService.storageSet(STORAGE_KEY, compact);
    this.lastCloudSaveOk = Boolean(stored);
    if (!stored) {
      console.warn('⚠️ VK Storage не подтвердил запись прогресса');
    }

    // Сервер прогресс больше не хранит — копия уходит только ради таблицы лидеров,
    // которая ранжирует игроков запросом FROM users. Специально без await: медленный
    // Railway не должен ни задерживать игру, ни влиять на судьбу сохранения.
    saveProgress({
      ...data,
      isReset: resetSave,
      firstName: data.firstName || profile.firstName,
      lastName: data.lastName != null ? data.lastName : profile.lastName,
      avatar: data.avatar || profile.avatar,
      updatedAt: timestamp
    }).catch(() => {});
  }

  /**
   * TASK-107: докрутить валюту к сохранённому состоянию и записать его целиком.
   *
   * Рубины за рекламу, покупки и награды раньше уходили прямым вызовом
   * saveProgress({ gems }) в API — мимо VK Storage. Пока источником правды был
   * сервер, это работало; теперь такие рубины (включая купленные за деньги)
   * просто не дожили бы до следующей загрузки. Читаем текущий снимок, правим
   * нужные поля и сохраняем обычным путём — в VK Storage, локально и на сервер.
   */
  async persistCurrency(patch = {}) {
    const current = this._readLocalCache() || {};
    const next = { ...current };
    ['coins', 'gems', 'totalCatsBought', 'totalMerges', 'maxCatLevel'].forEach((key) => {
      if (patch[key] !== undefined && patch[key] !== null) next[key] = patch[key];
    });
    next.updatedAt = Date.now();
    return this.saveProgress(next);
  }

  /** Текущий локальный снимок в нормализованном виде (или null, если кэша нет). */
  _readLocalCache() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem('cat_empire_grid_state');
      return this._normalizeState({
        coins: parseFloat(localStorage.getItem('cat_empire_last_coins') || '100'),
        gems: parseInt(localStorage.getItem('cat_empire_last_gems') || '10', 10),
        maxCatLevel: parseInt(localStorage.getItem('cat_empire_last_max_level') || '1', 10),
        totalCatsBought: parseInt(localStorage.getItem('cat_empire_last_total_bought') || '0', 10),
        totalMerges: parseInt(localStorage.getItem('cat_empire_last_total_merges') || '0', 10),
        updatedAt: parseInt(localStorage.getItem('cat_empire_last_updated_at') || '0', 10),
        gridState: raw ? JSON.parse(raw) : null
      });
    } catch (e) {
      return null;
    }
  }

  // Полный гарантийный сброс игрового прогресса в 0 во всех 3 элементах (LocalStorage, VK Storage и Сервер DB)
  async clearAllProgress() {
    console.log('🔄 Сброс всего игрового прогресса в 0...');
    const now = Date.now();

    // Синхронная немедленная перезапись локального кэша каноничными чистыми значениями (100 монет, 10 гемов)
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('cat_empire_is_reset', '1');
        localStorage.setItem('cat_empire_last_coins', '100');
        localStorage.setItem('cat_empire_last_gems', '10');
        localStorage.setItem('cat_empire_last_max_level', '1');
        localStorage.setItem('cat_empire_last_total_bought', '0');
        localStorage.setItem('cat_empire_last_total_merges', '0');
        localStorage.setItem('cat_empire_last_updated_at', String(now));
        localStorage.setItem('cat_empire_grid_state', JSON.stringify([{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }]));
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('cat_empire_last_timestamp');
        localStorage.removeItem('cat_empire_tutorial_done');
        localStorage.setItem(BEST_LEVEL_KEY, '1');
        localStorage.setItem(BEST_MERGES_KEY, '0');
        localStorage.removeItem('cat_empire_meta_v1');
        localStorage.removeItem('cat_empire_booster_expires_at');
        localStorage.removeItem('cat_empire_daily_v1');
        localStorage.removeItem('cat_empire_quests_v1');
      } catch (e) {}
    }

    const resetPayload = {
      coins: 100,
      gems: 10,
      maxCatLevel: 1,
      totalCatsBought: 0,
      totalMerges: 0,
      gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }],
      updatedAt: now,
      isReset: true
    };

    // Гарантированно параллельно отправляем и дожидаемся перезаписи в VK Storage и серверную БД
    await Promise.allSettled([
      vkService.storageSet(STORAGE_KEY, {
        c: 100, g: 10, m: 1, b: 0, r: 0, s: [[0, 1], [1, 1]], t: now, x: 1
      }),
      saveProgress(resetPayload)
    ]);
  }
}

export const storageService = new StorageService();
export default storageService;
