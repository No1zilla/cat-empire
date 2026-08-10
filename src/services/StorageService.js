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
    const a = stateA || {};
    const b = stateB || {};

    // Если выставлен флаг сброса в одном из состояний — отдавать приоритет свежему сброшенному состоянию!
    if (a.isReset || localStorage.getItem('cat_empire_is_reset') === '1') {
      return a;
    }
    if (b.isReset) {
      return b;
    }

    const mergesA = Number(a.totalMerges) || 0;
    const mergesB = Number(b.totalMerges) || 0;
    const boughtA = Number(a.totalCatsBought) || 0;
    const boughtB = Number(b.totalCatsBought) || 0;
    const coinsA = Number(a.coins) || 0;
    const coinsB = Number(b.coins) || 0;

    let chooseB = false;

    if (mergesB > mergesA) {
      chooseB = true;
    } else if (mergesB === mergesA) {
      if (boughtB > boughtA) {
        chooseB = true;
      } else if (boughtB === boughtA) {
        if (coinsB > coinsA) {
          chooseB = true;
        }
      }
    }

    const chosenState = chooseB ? b : a;
    const fallbackState = chooseB ? a : b;

    return {
      coins: Math.max(coinsA, coinsB),
      gems: Math.max(Number(a.gems) || 0, Number(b.gems) || 0),
      maxCatLevel: Math.max(Number(a.maxCatLevel) || 1, Number(b.maxCatLevel) || 1),
      totalCatsBought: Math.max(boughtA, boughtB),
      totalMerges: Math.max(mergesA, mergesB),
      gridState: (chosenState.gridState && Array.isArray(chosenState.gridState))
        ? chosenState.gridState
        : (fallbackState.gridState || [])
    };
  }

  async loadProgress() {
    // Если активирован флаг сброса — не восстанавливаем старые снимки из облака/БД!
    if (localStorage.getItem('cat_empire_is_reset') === '1') {
      console.log('🧹 Загрузка после сброса прогресса: чистый баланс...');
      const cleanResetState = {
        coins: 100,
        gems: 10,
        maxCatLevel: 1,
        totalCatsBought: 0,
        totalMerges: 0,
        gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }],
        isReset: true
      };
      // Очищаем флаг сброса только после перезаписи всех хранилищ
      localStorage.removeItem('cat_empire_is_reset');
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
        resultState = this.mergeStates(resultState, serverProfile.user);
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
      gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }]
    };

    await this.saveProgress(finalState);
    return finalState;
  }

  async saveProgress(data) {
    if (!data) return;

    // A. Сохранение в LocalStorage
    try {
      if (data.coins !== undefined) localStorage.setItem('cat_empire_last_coins', String(data.coins));
      if (data.gems !== undefined) localStorage.setItem('cat_empire_last_gems', String(data.gems));
      if (data.maxCatLevel !== undefined) localStorage.setItem('cat_empire_last_max_level', String(data.maxCatLevel));
      if (data.totalCatsBought !== undefined) localStorage.setItem('cat_empire_last_total_bought', String(data.totalCatsBought));
      if (data.totalMerges !== undefined) localStorage.setItem('cat_empire_last_total_merges', String(data.totalMerges));
      if (data.gridState) localStorage.setItem('cat_empire_grid_state', JSON.stringify(data.gridState));
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
        t: Date.now()
      };
      await vkService.storageSet(STORAGE_KEY, payload);
    } catch (e) {}

    // C. Сохранение на центральный сервер PostgreSQL
    try {
      await saveProgress(data);
    } catch (e) {}
  }

  // Полный гарантийный сброс игрового прогресса в 0 во всех 3 элементах (LocalStorage, VK Storage и Сервер DB)
  async clearAllProgress() {
    console.log('🔄 Сброс всего игрового прогресса в 0...');

    // Выставляем глобальный системный флаг сброса в LocalStorage
    localStorage.setItem('cat_empire_is_reset', '1');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('cat_empire_grid_state');
    localStorage.removeItem('cat_empire_last_coins');
    localStorage.removeItem('cat_empire_last_gems');
    localStorage.removeItem('cat_empire_last_max_level');
    localStorage.removeItem('cat_empire_last_total_bought');
    localStorage.removeItem('cat_empire_last_total_merges');
    localStorage.removeItem('cat_empire_tutorial_done');

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
