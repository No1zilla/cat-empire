/**
 * Сервис управления платформой (VK Mini App vs Android APK vs Web)
 */
export class PlatformService {
  static get platform() {
    if (typeof __PLATFORM__ !== 'undefined') {
      return __PLATFORM__;
    }
    return 'vk';
  }

  static isVK() {
    return this.platform === 'vk';
  }

  static isAndroid() {
    return this.platform === 'android';
  }
}

export const isVK = () => PlatformService.isVK();
export const isAndroid = () => PlatformService.isAndroid();

export default PlatformService;
