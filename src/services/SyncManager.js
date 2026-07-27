import { vkIdentity } from './VkIdentity.js';
import { storageService } from './StorageService.js';
import { eventBus } from '../utils/EventBus.js';

/**
 * Единый Архитектурный Менеджер Синхронизации (SyncManager)
 * Дэкаплирует синхронизацию данных между PixiJS сценой, бэкендом PostgreSQL и LocalStorage.
 */
export class SyncManager {
  constructor() {
    this.currentVkId = null;
    this.isInitialized = false;
    this.autoSaveDebounceTimer = null;
  }

  /**
   * Полный цикл инициализации профиля пользователя с авто-трансфером незакрепленного прогресса
   */
  async initializeSession() {
    this.currentVkId = await vkIdentity.getVkUserId();
    const state = await storageService.loadProgress();
    
    // Если на устройстве есть прогресс выше серверного — сразу связываем его с авторизованным VK аккаунтом
    if (state && (state.maxCatLevel > 1 || state.totalCatsBought > 0)) {
      await storageService.saveProgress(state);
    }

    this.isInitialized = true;
    eventBus.emit('SESSION_INITIALIZED', { vkId: this.currentVkId, state });
    return state;
  }

  /**
   * Умная сглаженная синхронизация (Debounced Persistence):
   * Накапливает серию быстрых покупок и отправляет один единый пакет через 800мс тишины
   */
  scheduleSave(stateData, delayMs = 800) {
    if (this.autoSaveDebounceTimer) {
      clearTimeout(this.autoSaveDebounceTimer);
    }
    this.autoSaveDebounceTimer = setTimeout(async () => {
      await storageService.saveProgress(stateData);
      eventBus.emit('STATE_SYNCED_TO_CLOUD', { vkId: this.currentVkId });
    }, delayMs);
  }

  /**
   * Мгновенный сброс в PostgreSQL при контрольных событиях (Скрещивание, Новые коты, Сворачивание)
   */
  async flushImmediate(stateData) {
    if (this.autoSaveDebounceTimer) {
      clearTimeout(this.autoSaveDebounceTimer);
      this.autoSaveDebounceTimer = null;
    }
    await storageService.saveProgress(stateData);
    eventBus.emit('STATE_SYNCED_TO_CLOUD', { vkId: this.currentVkId });
  }
}

export const syncManager = new SyncManager();
export default syncManager;
