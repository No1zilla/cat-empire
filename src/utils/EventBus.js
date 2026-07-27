/**
 * Легковесная реактивная шина событий (EventBus) для полной отвязки компонента Game от интерфейсных событий
 */
export class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Подписка на событие
   */
  on(event, fn) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(fn);
  }

  /**
   * Отписка от события
   */
  off(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(listener => listener !== fn);
  }

  /**
   * Публикация события с аргументами
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(fn => fn(data));
    }
  }

  /**
   * Очистить все подписки
   */
  clear() {
    this.listeners = {};
  }
}

export const eventBus = new EventBus();
export default eventBus;
