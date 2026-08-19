import assert from 'node:assert';
import { Economy } from '../../src/game/Economy.js';
import {
  grantOfflineCoins,
  persistOfflineClaim,
  resolveOfflinePayout
} from '../../src/game/offlineClaim.js';

export async function runOfflineClaimTests() {
  console.log('🧪 Тестирование мгновенного офлайн-начисления...');

  assert.deepStrictEqual(resolveOfflinePayout({
    isTriple: false,
    baseCoins: 1200,
    tripleCoins: 3600
  }), { ok: true, earned: 1200, multiplier: 1 });

  assert.deepStrictEqual(resolveOfflinePayout({
    isTriple: true,
    adSuccess: true,
    baseCoins: 1200,
    tripleCoins: 3600
  }), { ok: true, earned: 3600, multiplier: 3 });

  assert.deepStrictEqual(resolveOfflinePayout({
    isTriple: true,
    adSuccess: false,
    baseCoins: 1200,
    tripleCoins: 3600
  }), { ok: false, earned: 0, multiplier: 0 });

  const economy = new Economy({ slots: [] });
  economy.setBalance(100, 10, 0, 0);
  assert.strictEqual(grantOfflineCoins(economy, 1200), 1200);
  assert.strictEqual(economy.coins, 1300);

  let saveFinished = false;
  persistOfflineClaim(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    saveFinished = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.strictEqual(saveFinished, false, 'Сохранение не блокирует выдачу монет');

  console.log('  ✅ Офлайн-монеты падают сразу, облако не держит модалку');
}
