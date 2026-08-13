# 📌 TASK-066: Аналитическая инфраструктура — EventTracker (трекинг игровых событий)

> **Статус:** 🔲 В ОЧЕРЕДИ
> **Приоритет:** Критический (P0 — фундамент всей data-driven разработки)
> **Ветка:** `dev`

---

## 🎯 Цель
Создать единый модуль `EventTracker.js` — внутренний слой аналитики, который отправляет игровые события на Railway API и сохраняет их в БД для последующего анализа.

## 📐 Архитектура

```
Игровое событие → EventTracker.js → Railway API /events → PostgreSQL
                                   → LocalStorage (offline буфер)
```

## 📦 События для трекинга (первый приоритет)

### Жизненный цикл сессии
- `session_start` — старт игровой сессии (vk_user_id, platform, timestamp)
- `session_end` — конец сессии (duration_seconds)

### Экономика
- `cat_bought` — куплен котик (cost, total_cats_bought, coins_balance)
- `fill_all_triggered` — нажата кнопка «Заполнить» (count, cost, free_slots)
- `merge_manual` — ручное слияние двух котиков (level_from, level_to)
- `merge_auto_triggered` — нажата кнопка «Соединить» (gems_spent, merges_count)

### Монетизация
- `ad_requested` — запрошена реклама (ad_type: 'fill_free' | 'auto_merge' | 'offline_bonus')
- `ad_shown` — реклама показана (ad_type, is_test_ad)
- `ad_completed` — реклама досмотрена (ad_type, reward_gems)
- `ad_failed` — реклама не показалась (ad_type, error_reason)
- `ad_skipped` — пользователь закрыл рекламу до конца

### Прогресс
- `max_cat_level_reached` — новый максимальный уровень котика (level)
- `offline_bonus_claimed` — получен офлайн-бонус (coins, multiplier, offline_seconds)
- `share_triggered` — нажата кнопка «Поделиться» (type: 'link' | 'wall_post')

## 🛠 Реализация

### `src/analytics/EventTracker.js`
```javascript
export class EventTracker {
  constructor(userId, platform) {
    this.userId = userId;
    this.platform = platform;
    this.sessionId = crypto.randomUUID();
    this.queue = [];
    this._flushInterval = setInterval(() => this.flush(), 10000);
  }

  track(eventName, props = {}) {
    const event = {
      event: eventName,
      user_id: this.userId,
      session_id: this.sessionId,
      platform: this.platform,
      timestamp: Date.now(),
      ...props
    };
    this.queue.push(event);
    if (this.queue.length >= 10) this.flush();
  }

  async flush() {
    if (!this.queue.length) return;
    const batch = [...this.queue];
    this.queue = [];
    try {
      await fetch(`${API_BASE}/events/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch })
      });
    } catch (e) {
      // Офлайн: вернуть в очередь
      this.queue = [...batch, ...this.queue];
    }
  }
}
```

### Railway API: `POST /events/batch`
Принимает массив событий, пишет в таблицу `analytics_events`.

### Схема таблицы PostgreSQL
```sql
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event VARCHAR(64) NOT NULL,
  user_id VARCHAR(64),
  session_id VARCHAR(64),
  platform VARCHAR(16),
  props JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_analytics_event ON analytics_events(event);
CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);
```

## ✅ Критерии приёмки
- [ ] EventTracker.js создан и подключён в Game.js
- [ ] Все события из списка выше трекаются при каждом действии игрока
- [ ] Батчевая отправка каждые 10 секунд или при 10+ событиях в очереди
- [ ] Офлайн-буфер: если сеть недоступна, события копятся в очереди
- [ ] Railway API принимает `/events/batch` и пишет в PostgreSQL
- [ ] Таблица с индексами создана через миграцию
