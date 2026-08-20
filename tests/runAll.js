import { runBalanceTests } from './unit/balance.test.js';
import { runEventBusTests } from './unit/eventBus.test.js';
import { runGridTests } from './unit/grid.test.js';
import { runMergeTests } from './unit/merge.test.js';
import { runSoundTests } from './unit/sound.test.js';
import { runIdentityTests } from './unit/identity.test.js';
import { runStorageTests } from './unit/storage.test.js';
import { runTutorialAndBridgeTests } from './unit/tutorialAndBridge.test.js';
import { runSyncManagerTests } from './unit/syncManager.test.js';
import { runAntiCheatTests } from './unit/antiCheat.test.js';
import { runDailyLiveOpsTests } from './unit/dailyLiveOps.test.js';
import { runVkAdsTests } from './unit/vkAds.test.js';
import { runMonetizationTests } from './unit/monetization.test.js';
import { runVkPaymentHttpTests } from './unit/vkPaymentHttp.test.js';
import { runFirstSessionTests } from './unit/firstSession.test.js';
import { runPublicAssetTests } from './unit/publicAsset.test.js';
import { runPagesProxyTests } from './unit/pagesProxy.test.js';
import { runSocialTests } from './unit/social.test.js';
import { runFillAllTests } from './unit/fillAll.test.js';
import { runActionRowTests } from './unit/actionRow.test.js';
import { runProgressResetTests } from './unit/progressReset.test.js';
import { runOfflineClaimTests } from './unit/offlineClaim.test.js';
import { runApiClientTests } from './unit/apiClient.test.js';
import { runRubyShopHitsTests } from './unit/rubyShopHits.test.js';
import { runViewInsetsTests } from './unit/viewInsets.test.js';

console.log('🚀 ЗАПУСК ПОЛНОЙ ПРОГРАММНОЙ СЮИТЫ АВТО-ТЕСТОВ (ФАЗА 3)...');
console.log('----------------------------------------------------');

async function main() {
  try {
    runBalanceTests();
    runEventBusTests();
    runGridTests();
    runMergeTests();
    runSoundTests();
    await runIdentityTests();
    runStorageTests();
    await runTutorialAndBridgeTests();
    await runSyncManagerTests();
    runAntiCheatTests();
    runDailyLiveOpsTests();
    await runVkAdsTests();
    runMonetizationTests();
    await runVkPaymentHttpTests();
    runFirstSessionTests();
    runPublicAssetTests();
    runPagesProxyTests();
    await runSocialTests();
    runFillAllTests();
    runActionRowTests();
    await runProgressResetTests();
    await runOfflineClaimTests();
    await runApiClientTests();
    runRubyShopHitsTests();
    runViewInsetsTests();
    console.log('----------------------------------------------------');
    console.log('🎉 ВСЕ ПРОГРАММНЫЕ АВТО-ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ! (100% GREEN)');
  } catch (error) {
    console.error('❌ ОШИБКА В АВТО-ТЕСТАХ:', error);
    process.exit(1);
  }
}

main();
