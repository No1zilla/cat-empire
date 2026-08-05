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

    const mergedCoins = Math.max(Number(a.coins) || 0, Number(b.coins) || 0);
    const mergedGems = Math.max(Number(a.gems) || 0, Number(b.gems) || 0);
    const mergedMaxLevel = Math.max(Number(a.maxCatLevel) || 1, Number(b.maxCatLevel) || 1);
    const mergedBought = Math.max(Number(a.totalCatsBought) || 0, Number(b.totalCatsBought) || 0);
    const mergedMerges = Math.max(Number(a.totalMerges) || 0, Number(b.totalMerges) || 0);

    const getGridWeight = (grid) => {
      if (!Array.isArray(grid)) return 0;
      return grid.reduce((acc, cell) => acc + (Number(cell.catLevel) || 0), 0);
    };

    const gridWeightA = getGridWeight(a.gridState);
    const gridWeightB = getGridWeight(b.gridState);

    const chosenGrid = gridWeightA >= gridWeightB ? (a.gridState || b.gridState) : b.gridState;

    return {
      coins: mergedCoins,
      gems: mergedGems,
      maxCatLevel: mergedMaxLevel,
      totalCatsBought: mergedBought,
      totalMerges: mergedMerges,
      gridState: chosenGrid || []
    };
  }

  async loadProgress() {
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
    } catch (e) {
      // Игнорируем
    }

    let resultState = localData;

    // 2. Извлечение из Нативного Облачного Хранилища VK (VKWebAppStorageGet - доступно между всеми устройствами VK)
    try {
      const vkStorage = await vkService.storageGet([STORAGE_KEY]);
      if (vkStorage && vkStorage[STORAGE_KEY]) {
        const raw = vkStorage[STORAGE_KEY];
        // Декодирование компактного формата (TASK-042c)
        const vkState = raw.c !== undefined ? {
          coins: raw.c,
          gems: raw.g,
          maxCatLevel: raw.m,
          totalCatsBought: raw.b,
          totalMerges: raw.r,
          gridState: Array.isArray(raw.s) ? raw.s.map(item =>
            Array.isArray(item)
              ? { slotIndex: item[0], catLevel: item[1] }
              : item  // обратная совместимость со старым форматом
          ) : raw.s
        } : raw;  // обратная совместимость: если формат старый — использовать как есть
        resultState = this.mergeStates(resultState, vkState);
        console.log('☁️ VK Storage loaded, merges:', vkState.totalMerges, 'maxLevel:', vkState.maxCatLevel);
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

    // При вычислении финального состояния сглаживаем и обновляем во всех хранилищах
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
    } catch (e) {
      // Игнорируем
    }

    // B. Сохранение в Нативное Облако VK (VKWebAppStorageSet) — TASK-042c: компактный формат
    try {
      // Компактная сериализация gridState: [[slotIndex, catLevel], ...] вместо [{slotIndex, catLevel}, ...]
      const compactGrid = Array.isArray(data.gridState)
        ? data.gridState.map(c => [c.slotIndex, c.catLevel])
        : [];
      const payload = {
        c: Math.round(data.coins),  // coins
        g: data.gems,               // gems
        m: data.maxCatLevel,        // maxCatLevel
        b: data.totalCatsBought,    // totalCatsBought
        r: data.totalMerges,        // totalMerges
        s: compactGrid,             // gridState (compact)
        t: Date.now()               // updatedAt
      };
      const jsonStr = JSON.stringify(payload);
      if (jsonStr.length > 9500) {
        console.warn(`⚠️ VK Storage payload too large: ${jsonStr.length} chars (limit 10000)`);
      }
      const ok = await vkService.storageSet(STORAGE_KEY, payload);
      if (ok) {
        console.log(`💾 VK Storage saved (${jsonStr.length} chars)`);
      } else {
        console.warn('⚠️ VK Storage save returned false');
      }
    } catch (e) {
      console.warn('⚠️ VK Storage save error:', e);
    }

    // C. Сохранение на центральный сервер PostgreSQL
    try {
      await saveProgress(data);
    } catch (e) {
      console.warn('⚠️ Server save error:', e);
    }
  }
}

export const storageService = new StorageService();
export default storageService;
