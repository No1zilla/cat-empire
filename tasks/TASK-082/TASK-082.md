# 📌 TASK-082: События онбординга и возвратов (tutorial + return_session)

> **Статус:** 🟡 Патч готов локально, не запушено — см. `cat-empire-tracking.patch`
> **Приоритет:** P0 — блокирует диагностику D1 (сейчас 13%, цель > 35%)
> **Зависимости:** нет

---

## Зачем

D1 retention низкий, но узнать причину было нечем: `Tutorial.js` писал `cat_empire_tutorial_done` в localStorage и звал `onComplete()` **одинаково** и при настоящем слиянии, и при нажатии «✕ Скип». В дашборде это неразличимо — воронка показывает только «дошли/не дошли», а не «поняли механику» vs «сбежали».

Плюс не было события старта сессии с привязкой к дню установки — D1/D7/D30 в `retention.js` считались отдельным запросом к `user_sessions`, без возможности перепроверить по сырым событиям.

## Что сделано

1. `EventTracker.js` — добавлены `trackTutorialStarted()`, `trackTutorialCompleted(elapsedMs)`, `trackTutorialSkipped(elapsedMs)`, `trackReturnSession()` (пишет `days_since_install` из `cat_empire_first_seen_at` в localStorage).
2. `Tutorial.js` — `_complete()` теперь принимает `reason` (`'merge'` | `'skip'`) и шлёт разные события; засекает `_startedAt` для `elapsed_ms`.
3. `admin.js` — новые события добавлены в `BUTTON_EVENTS`/`BUTTON_LABELS`, автоматически попадают в существующую секцию дашборда без новых SQL-запросов.
4. `return_session`, `tutorial_skipped`, `tutorial_completed` добавлены в `FLUSH_NOW` — не должны теряться при закрытии вкладки.

## Критерии

- [ ] Патч накатан на `/dev/`, `npm run build:vk` собирается без ошибок
- [ ] Вручную пройден туториал слиянием → в дашборде `tutorial_completed` +1
- [ ] Вручную нажат скип → `tutorial_skipped` +1, НЕ `tutorial_completed`
- [ ] Повторный заход на следующий день → `return_session` с `days_since_install: 1`
- [ ] События реально доезжают до `/api/events/batch` (проверить в Network, не только в консоли)
- [ ] Задеплоено в прод (`git push origin main`) после проверки в VK

## Не входит в этот патч

Отдельная карточка на дашборде именно под воронку «старт → туториал → первое слияние за N секунд» — сейчас данные есть в сырых событиях, но агрегирующего SQL-запроса под неё нет. Если нужно — отдельная задача.
