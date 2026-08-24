# 📌 TASK-085: Удалить legacy-воркфлоу deploy.yml — два пайплайна дрались за прод

> **Статус:** ✅ Исправлено — `.github/workflows/deploy.yml` удалён
> **Приоритет:** P1 — латентный риск снести `/dev/` целиком
> **Зависимости:** нет

---

## Проблема

На `push` в `main` висели **два разных** воркфлоу, оба публикующие в GitHub Pages:

| Воркфлоу | Триггер | Механизм | Куда пишет |
|---|---|---|---|
| `deploy.yml` (legacy) | `main` | `actions/configure-pages` + `upload-pages-artifact` + `deploy-pages` | артефакт, **заменяет сайт целиком** |
| `deploy-prod.yml` | `main` | `peaceiris/actions-gh-pages@v4` | ветка `gh-pages`, корень, `keep_files: true` |
| `deploy-dev.yml` | `dev` | `peaceiris/actions-gh-pages@v4` | ветка `gh-pages`, папка `/dev/`, `keep_files: true` |

Пара dev/prod спроектирована согласованно: обе кладут в одну ветку `gh-pages` с `keep_files: true`, поэтому прод в корне и `/dev/` в подпапке живут рядом и не затирают друг друга (плюс редирект `/dev.html` в корне).

`deploy.yml` работал по **несовместимому** механизму — artifact-деплой не знает про `keep_files` и публикует только содержимое `dist`, то есть при выигрыше гонки **снёс бы всю подпапку `/dev/`**, которую поддерживает dev-пайплайн. Плюс сам источник Pages может быть настроен либо на ветку, либо на GitHub Actions — но не на оба сразу.

## Доказательство, что legacy именно `deploy.yml`

История ветки `gh-pages` состоит **только** из коммитов peaceiris-флоу:

```
52d6fc9 deploy: prod build from main 35d6457...
912862c deploy: dev build from dev branch bb59d31...
1e24aee deploy: prod build from main bb59d31...
4d37710 deploy: dev build from dev branch 904920d...
```

Ни одного коммита от artifact-механизма. В дереве `gh-pages` одновременно лежат `index.html` (прод) и `dev/` + `dev.html` — ровно то, что даёт `keep_files: true`. Значит Pages раздаётся из ветки `gh-pages`, а `deploy.yml` всё это время либо падал, либо игнорировался — жёг минуты CI впустую и оставался миной: любое переключение источника Pages на «GitHub Actions» стёрло бы `/dev/`.

## Что сделано

Удалён `.github/workflows/deploy.yml`. Остались два согласованных воркфлоу:

- `deploy-dev.yml` — ветка `dev` → `/dev/` (гейт из `GEMINI.md`: «Катить в `/dev/`, не в прод, пока не проверили в VK»)
- `deploy-prod.yml` — ветка `main` → корень

## Критерии

- [x] На `push` в `main` срабатывает ровно один прод-воркфлоу
- [x] Пара dev/prod не конфликтует за `gh-pages`
- [ ] После следующего пуша в `main` проверить, что `/dev/` на месте и прод обновился (Actions → один запуск, не два)

## Замечание по процессу

Коммиты [TASK-082](../TASK-082/TASK-082.md) и [TASK-084](../TASK-084/TASK-084.md) уехали прямо в `main`, минуя dev-гейт из `GEMINI.md` — доку нашли уже после пуша. Прод-выкатка прошла успешно (`52d6fc9`), решено оставить как есть, `origin/dev` перемотан на `main`. На будущее: сначала `dev`, проверка в VK, потом `main`.
