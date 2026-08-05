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
        resultState = this.mergeStates(resultState, vkStorage[STORAGE_KEY]);
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

    // B. Сохранение в Нативное Облако VK (VKWebAppStorageSet)
    try {
      const payload = {
        coins: data.coins,
        gems: data.gems,
        maxCatLevel: data.maxCatLevel,
        totalCatsBought: data.totalCatsBought,
        totalMerges: data.totalMerges,
        gridState: data.gridState,
        updatedAt: Date.now()
      };
      await vkService.storageSet(STORAGE_KEY, payload);
    } catch (e) {
      // Игнорируем
    }

    // C. Сохранение на центральный сервер PostgreSQL
    try {
      await saveProgress(data);
    } catch (e) {
      // Игнорируем
    }
  }
}

export const storageService = new StorageService();
export default storageService;
