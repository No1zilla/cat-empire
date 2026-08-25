# 📌 TASK-097: Вернуть connectivity-телеметрию — без неё нельзя проверить, доступен ли Railway из РФ

> **Статус:** ✅ Исправлено
> **Приоритет:** P0 — блокирует [TASK-098](../TASK-098/TASK-098.md), самую дорогую по деньгам гипотезу сейчас
> **Зависимости:** нет

---

## Зачем

Наша собственная БД видит **32 пользователя за всю историю**, официальный дашборд VK — **403 уникальных за 30 дней**. Это не про retention — про то, что 90%+ реальных запусков вообще не долетают до бэкенда ни одним событием.

Гипотеза: часть игроков из РФ технически не может достучаться до Railway (`api.cat-empire-production.up.railway.app`), хотя сам фронтенд грузится нормально. Проверить это нечем — единственный канал, который у нас есть для связи с игроком, это сам Railway, а мы проверяем именно его доступность. Замкнутый круг: нужен канал, независимый от бэкенда.

## Решение

`VKWebAppTrackEvent` — идёт через инфраструктуру VK, не через Railway. Это уже было написано в начале сегодняшней сессии в `src/api/client.js`, но стёрто `git reset --hard origin/main` (локальная ветка отстала на 238 коммитов, откат снёс всё, что было поверх, включая эту телеметрию). Восстановить с нуля.

```js
// src/api/client.js — обёртка вокруг apiRequest()
let reportedOkThisSession = false;

function trackAccessEvent(eventName) {
  try {
    bridge.send('VKWebAppTrackEvent', { event_name: eventName }).catch(() => {});
  } catch (e) {}
}

// В catch сетевой ошибки apiRequest():
trackAccessEvent('backend_api_unreachable');

// При первом успешном HTTP-ответе за сессию (любом, не только 200):
if (!reportedOkThisSession) {
  reportedOkThisSession = true;
  trackAccessEvent('backend_api_reachable');
}
```

Данные смотреть в **статистике самого VK Mini App** (кабинет разработчика → аналитика → пользовательские события), не в нашей БД — иначе снова замкнутый круг.

## Реализация

Вшито в саму точку `fetch()` внутри `attempt()` — не оборачивает `apiRequest()` снаружи, а именно различает «fetch бросил исключение» (сеть не работает) от «получили HTTP-ответ, пусть и не ok» (сеть работает, сервер ответил хоть чем-то):

```js
try {
  response = await fetch(url, {...});
} catch (netErr) {
  trackAccessEvent('backend_api_unreachable');
  throw netErr;
}
if (!reportedReachableThisSession) {
  reportedReachableThisSession = true;
  trackAccessEvent('backend_api_reachable');
}
```

`bridge` импортирован напрямую (`import bridge from '@vkontakte/vk-bridge'`), не через `window.vkBridge` — тот глобал нигде реально не присваивается (отдельный баг, не в этом патче).

## Критерии

- [x] `backend_api_reachable` / `backend_api_unreachable` шлются через `VKWebAppTrackEvent`
- [x] Не более одного `reachable` за сессию (не спамить)
- [x] Каждая сетевая ошибка внутри `apiRequest()` даёт `unreachable`
- [x] Проверено вживую в дев-сервере: `ERR_CONNECTION_REFUSED` корректно ловится, игра не падает
- [ ] Проверено, что событие реально долетает до статистики VK (нужен реальный VK-запуск)
- [x] `npm test` и `build:vk` зелёные
