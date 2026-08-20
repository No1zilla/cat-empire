import assert from 'node:assert';
import {
  EMPTY_INSET,
  VK_MOBILE_CHROME_TOP,
  VK_IPHONE_TOP_FALLBACK,
  VK_MOBILE_BOTTOM_FALLBACK,
  normalizeInset,
  mergeInsets,
  readCssSafeArea,
  resolveViewInsets,
  contentBoxSize,
  applyContainerInsets
} from '../../src/vk/viewInsets.js';

export function runViewInsetsTests() {
  console.log('🧪 Тестирование отступов VK iPhone (HUD не под крестиком)...');

  assert.deepStrictEqual(normalizeInset(null), EMPTY_INSET);
  assert.deepStrictEqual(normalizeInset({ top: 47.4, bottom: '34', left: -2 }), {
    top: 47,
    right: 0,
    bottom: 34,
    left: 0
  });

  const merged = mergeInsets({ top: 47 }, { top: 88, bottom: 20 });
  assert.strictEqual(merged.top, 88);
  assert.strictEqual(merged.bottom, 20);

  const css = readCssSafeArea({
    getPropertyValue: (key) => ({
      '--sat': '47px',
      '--sab': '34px',
      '--sal': '0px',
      '--sar': '0px'
    }[key] || '0px')
  });
  assert.strictEqual(css.top, 47);
  assert.strictEqual(css.bottom, 34);

  const statusOnly = resolveViewInsets({
    css: { top: 47 },
    vk: { top: 47, bottom: 0 },
    platform: 'mobile_iphone'
  });
  assert.ok(statusOnly.top >= 47 + VK_MOBILE_CHROME_TOP, 'если VK прислал только статус-бар — добавляем ряд крестика');

  const fromVk = resolveViewInsets({
    css: { top: 47, bottom: 34 },
    vk: { top: 96, bottom: 21 },
    platform: 'mobile_iphone'
  });
  assert.strictEqual(fromVk.top, 96, 'берём insets из GetConfig');
  assert.strictEqual(fromVk.bottom, 34);

  const iphoneSilent = resolveViewInsets({
    css: { top: 47 },
    vk: EMPTY_INSET,
    platform: 'mobile_iphone'
  });
  assert.ok(iphoneSilent.top >= 47 + VK_MOBILE_CHROME_TOP, 'к notch добавляем ряд крестика');
  assert.ok(iphoneSilent.top >= VK_IPHONE_TOP_FALLBACK);
  assert.ok(iphoneSilent.bottom >= VK_MOBILE_BOTTOM_FALLBACK);

  const iphoneNoCss = resolveViewInsets({
    css: EMPTY_INSET,
    vk: EMPTY_INSET,
    platform: 'mobile_iphone'
  });
  assert.strictEqual(iphoneNoCss.top, VK_IPHONE_TOP_FALLBACK);

  const desktop = resolveViewInsets({
    css: EMPTY_INSET,
    vk: EMPTY_INSET,
    platform: 'desktop_web'
  });
  assert.deepStrictEqual(desktop, EMPTY_INSET, 'десктопный iframe не двигаем наугад');

  const fakeEl = {
    clientWidth: 390,
    clientHeight: 844,
    style: {}
  };
  applyContainerInsets(fakeEl, { top: 88, bottom: 20 });
  assert.strictEqual(fakeEl.style.paddingTop, '88px');
  assert.strictEqual(fakeEl.style.paddingBottom, '20px');

  const box = contentBoxSize({
    clientWidth: 390,
    clientHeight: 844
  }, 410, 700);
  assert.ok(box.w >= 1 && box.h >= 1);

  console.log('  ✅ HUD на iPhone уезжает ниже хрома VK, не под крестик');
}
