/**
 * Сервис управления платформой (VK Mini App vs Android APK vs Web)
 */

export const DESKTOP_VK_PLATFORMS = new Set([
  'desktop_web',
  'desktop_web_messenger',
  'desktop_app_messenger',
  'web_external'
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
}

export const isVK = () => PlatformService.isVK();
export const isAndroid = () => PlatformService.isAndroid();
export const isDesktopVK = () => PlatformService.isDesktopVK();

export default PlatformService;
