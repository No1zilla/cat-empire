import assert from 'node:assert';
import { DailyRewardsService, DAILY_REWARD_TABLE, getLocalDateKey } from '../../src/game/DailyRewards.js';
import { DailyQuestsService, pickQuestsForDate, QUEST_POOL } from '../../src/game/DailyQuests.js';

function memoryStorage() {
  const map = {};
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null),
    setItem: (key, value) => { map[key] = String(value); }
  };
}

export function runDailyLiveOpsTests() {
  console.log('🧪 Тестирование daily rewards / quests (AAA live-ops)...');

  const noon = (isoDate) => Date.parse(`${isoDate}T12:00:00`);

  const store = memoryStorage();
  const daily = new DailyRewardsService(store);

  const day1 = noon('2026-08-16');
  const first = daily.getState(day1);
  assert.strictEqual(first.canClaim, true, 'Первый вход должен давать подарок');
  assert.strictEqual(first.currentDay, 1, 'Календарь стартует с дня 1');
  const claimed = daily.claim(day1);
  assert.ok(claimed, 'claim() обязан вернуть награду');
  assert.strictEqual(claimed.day, 1);
  assert.strictEqual(claimed.coins, 500);
  assert.strictEqual(daily.getState(day1).canClaim, false, 'Повторный claim в тот же день запрещён');
  assert.strictEqual(daily.claim(day1), null);

  const day2 = noon('2026-08-17');
  const next = daily.getState(day2);
  assert.strictEqual(next.canClaim, true);
  assert.strictEqual(next.currentDay, 2, 'Вчерашний день 1 продолжает серию на день 2');
  const claimed2 = daily.claim(day2);
  assert.strictEqual(claimed2.gems, 10);

  const skipped = noon('2026-08-20');
  const reset = daily.getState(skipped);
  assert.strictEqual(reset.currentDay, 1, 'Пропуск дней сбрасывает календарь на день 1');
  assert.strictEqual(reset.streak, 0);

  assert.strictEqual(DAILY_REWARD_TABLE.length, 7);
  assert.strictEqual(getLocalDateKey(day1), '2026-08-16');

  const quests = new DailyQuestsService(memoryStorage());
  const qState = quests.getState(day1);
  assert.strictEqual(qState.quests.length, 3, 'Каждый день ровно 3 задания');
  const types = qState.quests.map((q) => q.type).sort();
  assert.deepStrictEqual(types, ['auto_merge', 'buy', 'merge'].sort());

  const sameDay = pickQuestsForDate('2026-08-16');
  const sameDayAgain = pickQuestsForDate('2026-08-16');
  assert.deepStrictEqual(sameDay.map((q) => q.id), sameDayAgain.map((q) => q.id), 'Набор квестов детерминирован датой');

  const mergeQuest = qState.quests.find((q) => q.type === 'merge');
  quests.progress('merge', mergeQuest.target, day1);
  const ready = quests.getState(day1).quests.find((q) => q.id === mergeQuest.id);
  assert.strictEqual(ready.progress, mergeQuest.target);
  const reward = quests.claim(mergeQuest.id, day1);
  assert.ok(reward);
  assert.ok(reward.rewardGems >= 2);
  assert.strictEqual(quests.claim(mergeQuest.id, day1), null, 'Повторный claim квеста запрещён');
  assert.ok(QUEST_POOL.length >= 6);

  console.log('  ✅ Daily rewards и daily quests успешно прошли авто-тесты!');
}
