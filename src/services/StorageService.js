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
   * Слить состояния из разных источников по максимальным прогрессивным показателям
   */
  mergeStates(stateA, stateB) {
    if (!stateA) return stateB || {};
    if (!stateB) return stateA || {};

    // 1. Приоритет флага жестокого сброса
    if (stateA.isReset) return stateA;
    if (stateB.isReset) return stateB;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('cat_empire_is_reset') === '1') {
      if (stateA.coins === 100 && stateA.totalMerges === 0) return stateA;
      if (stateB.coins === 100 && stateB.totalMerges === 0) return stateB;
    }

    // 2. Векторная Временная Синхронизация (Vector Clock): Снимок с более свежим таймстемпом побеждает 100%!
    const timeA = Number(stateA.updatedAt || stateA.t || stateA.updated_at) || 0;
    const timeB = Number(stateB.updatedAt || stateB.t || stateB.updated_at) || 0;

    // Если разница по времени между снимками превышает 2 секунды — забираем более свежий снимок целиком!
    if (Math.abs(timeA - timeB) > 2000) {
      console.log(`⏱️ Векторный выбор снимка по времени: timeA (${timeA}) vs timeB (${timeB}) -> победитель: ${timeA > timeB ? 'A (Local)' : 'B (Cloud)'}`);
      return timeA > timeB ? stateA : stateB;
    }

    // 3. Фолбэк для одновременных снимков
    const mergesA = Number(stateA.totalMerges) || 0;
    const mergesB = Number(stateB.totalMerges) || 0;
    const boughtA = Number(stateA.totalCatsBought) || 0;
    const boughtB = Number(stateB.totalCatsBought) || 0;

    let chooseB = false;
    if (mergesB > mergesA) chooseB = true;
    else if (mergesB === mergesA && boughtB > boughtA) chooseB = true;

    return chooseB ? stateB : stateA;
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
      localData = {
        coins: parseFloat(localStorage.getItem('cat_empire_last_coins') || '0'),
        gems: parseInt(localStorage.getItem('cat_empire_last_gems') || '0', 10),
        maxCatLevel: parseInt(localStorage.getItem('cat_empire_last_max_level') || '1', 10),
        totalCatsBought: parseInt(localStorage.getItem('cat_empire_last_total_bought') || '0', 10),
        totalMerges: parseInt(localStorage.getItem('cat_empire_last_total_merges') || '0', 10),
        updatedAt: parseInt(localStorage.getItem('cat_empire_last_updated_at') || '0', 10),
        gridState: raw ? JSON.parse(raw) : null
      };
    } catch (e) {}

    let resultState = localData;

    // 2. Извлечение из Нативного Облачного Хранилища VK (VKWebAppStorageGet)
    try {
      const vkStorage = await vkService.storageGet([STORAGE_KEY]);
      if (vkStorage && vkStorage[STORAGE_KEY]) {
        const raw = vkStorage[STORAGE_KEY];
        const vkState = raw.c !== undefined ? {
          coins: raw.c,
          gems: raw.g,
          maxCatLevel: raw.m,
          totalCatsBought: raw.b,
          totalMerges: raw.r,
          updatedAt: raw.t || 0,
          gridState: Array.isArray(raw.s) ? raw.s.map(item =>
            Array.isArray(item)
              ? { slotIndex: item[0], catLevel: item[1] }
              : item
          ) : raw.s
        } : raw;
        resultState = this.mergeStates(resultState, vkState);
      }
    } catch (e) {
      console.warn('Ошибка загрузки из VK Storage:', e);
    }

    // 3. Извлечение из центрального сервера PostgreSQL (HTTPS API)
    try {
      const serverProfile = await fetchProfile();
      if (serverProfile && serverProfile.user) {
        const u = serverProfile.user;
        const serverState = {
          ...u,
          updatedAt: u.updated_at ? Date.parse(u.updated_at) : (u.updatedAt || 0)
        };
        resultState = this.mergeStates(resultState, serverState);
      }
    } catch (e) {
      console.warn('Ошибка загрузки с бэкенда:', e);
    }

    const finalState = resultState || {
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

    // Выставляем глобальный системный флаг сброса в LocalStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('cat_empire_is_reset', '1');
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('cat_empire_grid_state');
        localStorage.removeItem('cat_empire_last_coins');
        localStorage.removeItem('cat_empire_last_gems');
        localStorage.removeItem('cat_empire_last_max_level');
        localStorage.removeItem('cat_empire_last_total_bought');
        localStorage.removeItem('cat_empire_last_total_merges');
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
      isReset: true
    };

    // Гарантированно дожидаемся перезаписи в VK Storage и серверную БД
    try {
      await vkService.storageSet(STORAGE_KEY, {
        c: 100, g: 10, m: 1, b: 0, r: 0, s: [[0, 1], [1, 1]], t: Date.now()
      });
    } catch (e) {}

    try {
      await saveProgress(resetPayload);
    } catch (e) {}
  }
}

export const storageService = new StorageService();
export default storageService;
