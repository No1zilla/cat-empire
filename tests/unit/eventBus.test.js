import assert from 'node:assert';
import { EventBus } from '../../src/utils/EventBus.js';

export function runEventBusTests() {
  console.log('🧪 Тестирование реактивной шины событий (src/utils/EventBus.js)...');

  const bus = new EventBus();
  let emittedValue = 0;

  const callback = (val) => { emittedValue += val; };
  bus.on('CATS_MERGED', callback);

  bus.emit('CATS_MERGED', 5);
  assert.strictEqual(emittedValue, 5, 'Событие CATS_MERGED должно передавать аргументы в слушатели');

  bus.off('CATS_MERGED', callback);
  bus.emit('CATS_MERGED', 5);
  assert.strictEqual(emittedValue, 5, 'Отписанный слушатель не должен реагировать на эмиттинг');

  bus.clear();
  assert.deepStrictEqual(bus.listeners, {}, 'clear() должен очищать все слушатели');

  console.log('  ✅ Шина событий EventBus прошла все автоматические тесты!');
}
