/**
 * Сервис управления платформой (VK Mini App vs Android APK vs Web)
 */

export const DESKTOP_VK_PLATFORMS = new Set([
  'desktop_web',
  'desktop_web_messenger',
  'desktop_app_messenger',
  'web_external',
  'desktop_web_ok'
]);

export const MOBILE_VK_PLATFORMS = new Set([
  'mobile_iphone',
  'mobile_ipad',
  'mobile_android',
  'mobile_web',
  'mobile_iphone_messenger',
  'mobile_android_messenger',
  'mobile_iphone_ok',
  'mobile_android_ok',
  'mobile_web_ok'
]);

export function parseVkLaunchParams(raw) {
  const out = {};
  const cleaned = String(raw || '')
    .replace(/^[?#]+/, '')
    .replace(/#/g, '&');
  try {
    new URLSearchParams(cleaned).forEach((value, key) => {
      if (key) out[key] = value;
    });
  } catch (e) {
    // ignore malformed launch strings
  }
  return out;
}

export function isDesktopVkPlatform(platform) {
  return DESKTOP_VK_PLATFORMS.has(String(platform || '').toLowerCase());
}

export function isMobileVkPlatform(platform) {
  const p = String(platform || '').toLowerCase();
  if (!p || isDesktopVkPlatform(p)) return false;
  return MOBILE_VK_PLATFORMS.has(p) || p.startsWith('mobile_') || p.includes('iphone') || p.includes('ipad');
}

/** Одноклассники: vk_platform=* _ok или vk_client=ok */
export function isOkLaunch({ platform, client } = {}) {
  const p = String(platform || '').toLowerCase();
  const c = String(client || '').toLowerCase();
  return c === 'ok' || p.endsWith('_ok');
}

function readLaunchParamString() {
  if (typeof window === 'undefined') return '';
  let str = '';
  if (window.location) {
    str = `${window.location.search || ''}&${window.location.hash || ''}`;
  }
  if (!str.includes('vk_platform')) {
    try {
      str = `${str}&${localStorage.getItem('cat_empire_vk_launch_params') || ''}`;
    } catch (e) {}
  }
  return str;
}

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

  static getLaunchParams() {
    return parseVkLaunchParams(readLaunchParamString());
  }

  static getVkPlatform() {
    return String(this.getLaunchParams().vk_platform || '').toLowerCase();
  }

  static isDesktopVK() {
    return isDesktopVkPlatform(this.getVkPlatform());
  }

  static isMobileVK() {
    return isMobileVkPlatform(this.getVkPlatform());
  }

  static isOK() {
    const params = this.getLaunchParams();
    return isOkLaunch({ platform: this.getVkPlatform(), client: params.vk_client });
  }
}

export const isVK = () => PlatformService.isVK();
export const isAndroid = () => PlatformService.isAndroid();
export const isDesktopVK = () => PlatformService.isDesktopVK();
export const isMobileVK = () => PlatformService.isMobileVK();
export const isOK = () => PlatformService.isOK();

export default PlatformService;
