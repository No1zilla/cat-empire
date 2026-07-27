import { saveProgress, fetchProfile } from '../api/client.js';

/**
 * Единый Сервис Хранения Данных с Алгоритмом Конвергенции (Smart State Merger)
 */
export class StorageService {
  /**
   * Слить локальный и серверный прогресс по максимальным показателям
   */
  mergeStates(serverState, localState) {
    const s = serverState || {};
    const l = localState || {};

    const mergedCoins = Math.max(Number(s.coins) || 0, Number(l.coins) || 0);
    const mergedGems = Math.max(Number(s.gems) || 0, Number(l.gems) || 0);
    const mergedMaxLevel = Math.max(Number(s.maxCatLevel) || 1, Number(l.maxCatLevel) || 1);
    const mergedBought = Math.max(Number(s.totalCatsBought) || 0, Number(l.totalCatsBought) || 0);
    const mergedMerges = Math.max(Number(s.totalMerges) || 0, Number(l.totalMerges) || 0);

    // Сравнение веса сетки (выбор сетки с большей суммой уровней)
    const getGridWeight = (grid) => {
      if (!Array.isArray(grid)) return 0;
      return grid.reduce((acc, cell) => acc + (Number(cell.catLevel) || 0), 0);
    };

    const serverGridWeight = getGridWeight(s.gridState);
    const localGridWeight = getGridWeight(l.gridState);

    const chosenGrid = serverGridWeight >= localGridWeight ? (s.gridState || l.gridState) : l.gridState;

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
    } catch {
      // Игнорируем
    }

    try {
      const serverProfile = await fetchProfile();
      if (serverProfile && serverProfile.user) {
        const merged = this.mergeStates(serverProfile.user, localData);
        // Мгновенно мигрируем и сохраняем объединенный прогресс в облачный PostgreSQL
        await this.saveProgress(merged);
        return merged;
      }
    } catch {
      // Игнорируем ошибки сети
    }

    return localData || {
      coins: 100,
      gems: 10,
      maxCatLevel: 1,
      totalCatsBought: 0,
      totalMerges: 0,
      gridState: [{ slotIndex: 0, catLevel: 1 }, { slotIndex: 1, catLevel: 1 }]
    };
  }

  async saveProgress(data) {
    if (!data) return;

    try {
      if (data.coins !== undefined) localStorage.setItem('cat_empire_last_coins', String(data.coins));
      if (data.gems !== undefined) localStorage.setItem('cat_empire_last_gems', String(data.gems));
      if (data.maxCatLevel !== undefined) localStorage.setItem('cat_empire_last_max_level', String(data.maxCatLevel));
      if (data.totalCatsBought !== undefined) localStorage.setItem('cat_empire_last_total_bought', String(data.totalCatsBought));
      if (data.totalMerges !== undefined) localStorage.setItem('cat_empire_last_total_merges', String(data.totalMerges));
      if (data.gridState) localStorage.setItem('cat_empire_grid_state', JSON.stringify(data.gridState));
    } catch {
      // Игнорируем
    }

    try {
      await saveProgress(data);
    } catch {
      // Игнорируем
    }
  }
}

export const storageService = new StorageService();
export default storageService;
