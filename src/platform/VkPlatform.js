/**
 * VK за контрактом Platform (TASK-110).
 *
 * ВАЖНО: это обёртка, а не переписывание. Каждый метод дёргает ровно тот код,
 * который работал в проде до появления шва — те же таймауты, те же фолбэки, те же
 * формы ответа. Умный рефакторинг «по дороге» здесь запрещён: иначе при регрессии
 * не отличить «шов сломал» от «и так было сломано». Наводить порядок внутри
 * VKBridge.js можно потом, отдельным коммитом, с тестами на руках.
 *
 * Зависимости принимаются через конструктор — чтобы тест мог подсунуть заглушку
 * вместо живого vk-bridge, которому нужен браузер.
 */
import { Platform } from './Platform.js';
import { VKService } from '../vk/VKBridge.js';
import { showRewardedAd, showDesktopBannerAd } from '../api/vkAds.js';
import { purchaseVkItem } from '../game/iapBuy.js';
import { vkIdentity } from '../services/VkIdentity.js';
import { isDesktopVK } from '../services/PlatformService.js';
import { VK_GROUP_ID } from '../config/vkCommunity.js';

export class VkPlatform extends Platform {
  constructor(deps = {}) {
    super();
    this.service = deps.service || new VKService();
    this.ads = deps.ads || { showRewardedAd, showDesktopBannerAd };
    this.purchaseItem = deps.purchaseItem || purchaseVkItem;
    this.identity = deps.identity || vkIdentity;
    this.isDesktopVk = deps.isDesktopVK || isDesktopVK;
    this.groupId = deps.groupId !== undefined ? deps.groupId : VK_GROUP_ID;
  }

  get id() {
    return 'vk';
  }

  get capabilities() {
    return {
      ads: true,
      // Баннер VK живёт только на десктопе — на мобильном его просто нет.
      banner: this.isDesktop(),
      payments: true,
      invite: true,
      wallPost: true,
      community: Boolean(this.groupId),
      haptics: true
    };
  }

  async init() {
    // Отступы приходят событием VKWebAppUpdateConfig — прокидываем их в свой канал.
    this.service.onInsets = (next) => this._setInsets(next);
    const result = await this.service.init();
    this._setInsets(this.service.lastInsets);
    return result;
  }

  async getUserInfo() {
    return this.service.getUserInfo();
  }

  async getUserId() {
    return this.identity.getVkUserId();
  }

  persistProfile(info) {
    return this.identity.persistProfile(info);
  }

  readProfile() {
    return this.identity.readProfile();
  }

  async storageGet(keys) {
    return this.service.storageGet(keys);
  }

  async storageSet(key, value) {
    return this.service.storageSet(key, value);
  }

  async showRewardedAd() {
    return this.ads.showRewardedAd();
  }

  async showBannerAd() {
    return this.ads.showDesktopBannerAd();
  }

  async purchase(itemId) {
    return this.purchaseItem(itemId);
  }

  async share(link) {
    return this.service.shareLink(link);
  }

  async sharePost(message) {
    return this.service.sharePost(message);
  }

  async invite() {
    return this.service.showInviteBox();
  }

  async joinCommunity(groupId) {
    return this.service.joinGroup(groupId !== undefined ? groupId : this.groupId);
  }

  haptic(style = 'medium') {
    return this.service.triggerHaptic(style);
  }

  isDesktop() {
    return Boolean(this.isDesktopVk());
  }
}

export default VkPlatform;
