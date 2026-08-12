import { saveProgress, fetchProfile } from '../api/client.js';
import { VKService } from '../vk/VKBridge.js';

const vkService = new VKService();
const STORAGE_KEY = 'cat_empire_progress';

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
      gridState = [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }];
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
      isReset: Boolean(raw.isReset)
    };
  }

  /**
   * Слить состояния из разных источников по максимальным прогрессивным показателям
   */
  mergeStates(stateA, stateB) {
    const a = this._normalizeState(stateA);
    const b = this._normalizeState(stateB);

    if (!a) return b || {};
    if (!b) return a || {};

    // 1. Приоритет флага жестокого сброса
    if (a.isReset && !b.isReset) return a;
    if (b.isReset && !a.isReset) return b;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('cat_empire_is_reset') === '1') {
      if (a.coins === 100 && a.totalMerges === 0) return a;
      if (b.coins === 100 && b.totalMerges === 0) return b;
    }

    // 2. Векторная Временная Синхронизация (Vector Clock): Снимок с более свежим таймстемпом побеждает 100%!
    const timeA = Number(a.updatedAt) || 0;
    const timeB = Number(b.updatedAt) || 0;

    // Если разница по времени между снимками превышает 2 секунды — забираем более свежий снимок целиком!
    if (Math.abs(timeA - timeB) > 2000) {
      console.log(`⏱️ Векторный выбор снимка по времени: timeA (${timeA}) vs timeB (${timeB}) -> победитель: ${timeA > timeB ? 'A (Local)' : 'B (Cloud)'}`);
      return timeA > timeB ? a : b;
    }

    // 3. Фолбэк для одновременных снимков
    const mergesA = Number(a.totalMerges) || 0;
    const mergesB = Number(b.totalMerges) || 0;
    const boughtA = Number(a.totalCatsBought) || 0;
    const boughtB = Number(b.totalCatsBought) || 0;

    let chooseB = false;
    if (mergesB > mergesA) chooseB = true;
    else if (mergesB === mergesA && boughtB > boughtA) chooseB = true;

    return chooseB ? b : a;
  }

  async loadProgress() {
    // Если активирован флаг сброса — не восстанавливаем старые снимки из облака/БД!
    if (typeof localStorage !== 'undefined' && localStorage.getItem('cat_empire_is_reset') === '1') {
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
      try {
        localStorage.removeItem('cat_empire_is_reset');
      } catch (e) {}
      await this.saveProgress(cleanResetState);
      return cleanResetState;
    }

    // 1. Извлечение из LocalStorage (быстрый кэш браузера)
    let localData = null;
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

    let resultState = localData;

    // 2. Извлечение из Нативного Облачного Хранилища VK (VKWebAppStorageGet)
    try {
      const vkStorage = await vkService.storageGet([STORAGE_KEY]);
      if (vkStorage && vkStorage[STORAGE_KEY]) {
        const raw = vkStorage[STORAGE_KEY];
        const vkState = this._normalizeState(raw);
        resultState = this.mergeStates(resultState, vkState);
      }
    } catch (e) {
      console.warn('Ошибка загрузки из VK Storage:', e);
    }

    // 3. Извлечение из центрального сервера PostgreSQL (HTTPS API)
    try {
      const serverProfile = await fetchProfile();
      if (serverProfile && serverProfile.user) {
        const serverState = this._normalizeState(serverProfile.user);
        resultState = this.mergeStates(resultState, serverState);
      }
    } catch (e) {
      console.warn('Ошибка загрузки с бэкенда:', e);
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

    await this.saveProgress(finalState);
    return finalState;
  }

  async saveProgress(data) {
    if (!data) return;

    const timestamp = Number(data.updatedAt) || Date.now();

    // A. Сохранение в LocalStorage
    try {
      if (data.coins !== undefined) localStorage.setItem('cat_empire_last_coins', String(data.coins));
      if (data.gems !== undefined) localStorage.setItem('cat_empire_last_gems', String(data.gems));
      if (data.maxCatLevel !== undefined) localStorage.setItem('cat_empire_last_max_level', String(data.maxCatLevel));
      if (data.totalCatsBought !== undefined) localStorage.setItem('cat_empire_last_total_bought', String(data.totalCatsBought));
      if (data.totalMerges !== undefined) localStorage.setItem('cat_empire_last_total_merges', String(data.totalMerges));
      if (data.gridState) localStorage.setItem('cat_empire_grid_state', JSON.stringify(data.gridState));
      localStorage.setItem('cat_empire_last_updated_at', String(timestamp));
    } catch (e) {}

    // B. Сохранение в Нативное Облако VK (VKWebAppStorageSet)
    try {
      const compactGrid = Array.isArray(data.gridState)
        ? data.gridState.map(c => [c.slotIndex, c.catLevel])
        : [];
      const payload = {
        c: Math.round(data.coins),
        g: data.gems,
        m: data.maxCatLevel,
        b: data.totalCatsBought,
        r: data.totalMerges,
        s: compactGrid,
        t: timestamp
      };
      await vkService.storageSet(STORAGE_KEY, payload);
    } catch (e) {}

    // C. Сохранение на центральный сервер PostgreSQL
    try {
      await saveProgress({
        ...data,
        updatedAt: timestamp
      });
    } catch (e) {}
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
        c: 100, g: 10, m: 1, b: 0, r: 0, s: [[0, 1], [1, 1]], t: now
      }),
      saveProgress(resetPayload)
    ]);
  }
}

export const storageService = new StorageService();
export default storageService;
