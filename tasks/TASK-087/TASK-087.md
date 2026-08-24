# 📌 TASK-087: `npm test` не подключён — юнит-сюита запускается только вручную

> **Статус:** ✅ Исправлено
> **Приоритет:** P2
> **Зависимости:** нет

---

## Проблема

`tests/runAll.js` гоняет большую сюиту (баланс, EventBus, Grid, Merge, Sound, VkIdentity, StorageService, VK Bridge, SyncManager, анти-чит, ActionRow/Котопедия, офлайн-доход, магазин рубинов, отступы VK iPhone и др.), но в `package.json` не было скрипта `test` — только `node tests/runAll.js` руками. Ни CI, ни новый разработчик про неё не узнают.

## Что сделано

```json
"test": "node tests/runAll.js"
```

Прогнано — 100% зелёные.

## Почему серверные спеки не подключены

`server/src/test_unit.js`, `test_analytics_and_admin_spec.js`, `test_events_route_spec.js` бьют по живой PostgreSQL через `userService`/`pool` без моков. В дефолтный `npm test` их тащить нельзя — упадут без БД. Остаются ручными.

Визуальные и E2E-сценарии (`tests/test_visual_snapshots.js`, `test_visual_regression.js`, `test_e2e_multi_device.js`, `test_android_emulator.js`) требуют Playwright-браузеров и тоже намеренно вне `npm test` — они описаны в `GEMINI.md` → «Автоматизированное тестирование».

## Критерии

- [x] `npm test` гоняет клиентскую юнит-сюиту
- [x] Все тесты зелёные
- [x] Серверные и браузерные спеки не тянутся в дефолтный прогон
