import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolvePublicAsset } from '../../src/utils/publicAsset.js';

export function runPublicAssetTests() {
  console.log('🧪 Тестирование URL зеленоглазой кисы в iframe без слэша...');

  const rel = 'assets/cats/green_eyes_gift.jpg';
  const expected = 'https://no1zilla.github.io/cat-empire/assets/cats/green_eyes_gift.jpg';

  assert.strictEqual(
    resolvePublicAsset(rel, 'https://no1zilla.github.io/cat-empire'),
    expected,
    'без завершающего слэша iframe не должен уводить на github.io/assets/...'
  );
  assert.strictEqual(
    resolvePublicAsset(rel, 'https://no1zilla.github.io/cat-empire/'),
    expected
  );
  assert.strictEqual(
    resolvePublicAsset(rel, 'https://no1zilla.github.io/cat-empire/index.html'),
    expected
  );
  assert.strictEqual(
    resolvePublicAsset(rel, 'https://no1zilla.github.io/cat-empire/?vk_platform=mobile_iphone#/'),
    expected
  );
  assert.strictEqual(
    resolvePublicAsset(rel, 'https://no1zilla.github.io/cat-empire/dev'),
    'https://no1zilla.github.io/cat-empire/dev/assets/cats/green_eyes_gift.jpg'
  );

  const modalSrc = readFileSync(new URL('../../src/ui/DesktopRewardModal.js', import.meta.url), 'utf8');
  assert.equal(modalSrc.includes('👀🐱'), false, 'эмодзи-фолбэк больше не подменяет кису');
  assert.ok(modalSrc.includes('drawGreenEyedCatFallback'), 'на модалке сразу рисуются зелёные глаза');
  assert.ok(modalSrc.includes('loadGreenEyesTexture'), 'фото кисы грузится через устойчивый URL');

  console.log('  ✅ URL кисы чинится, эмодзи 👀🐱 убраны');
}
