import assert from 'node:assert';

// Временный макет EventBus для проверок до подключения основного модуля
class TestEventBus {
  constructor() {
    this.listeners = {};
  }
  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  off(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== fn);
  }
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(fn => fn(data));
    }
  }
}

export function runEventBusTests() {
  console.log('🧪 Тестирование реактивной шины событий (EventBus)...');

  const bus = new TestEventBus();
  let emittedValue = 0;

  const callback = (val) => { emittedValue += val; };
  bus.on('CATS_MERGED', callback);

  bus.emit('CATS_MERGED', 5);
  assert.strictEqual(emittedValue, 5, 'Событие CATS_MERGED должно передавать аргументы в слушатели');

  bus.off('CATS_MERGED', callback);
  bus.emit('CATS_MERGED', 5);
  assert.strictEqual(emittedValue, 5, 'Отписанный слушатель не должен реагировать на эмиттинг');

  console.log('  ✅ Шина событий пройдена успешно!');
}
