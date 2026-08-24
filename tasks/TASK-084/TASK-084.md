# 📌 TASK-084: `npm run build:vk` не собирается на macOS — коллизия имён ActionRow.js / actionRow.js

> **Статус:** 🔴 Не начато — баг найден, фикс не применён (нужно решение по имени файла)
> **Приоритет:** P0 для разработки на Mac — локально собрать VK-сборку невозможно
> **Зависимости:** нет

---

## Симптом

```
error during build:
src/game/Game.js (23:9): "ActionRow" is not exported by "src/ui/actionRow.js", imported by "src/game/Game.js".
```

`npm run build:vk` (и `npm run build`) падают на любой машине с case-insensitive файловой системой — то есть на **всех Mac по умолчанию** (APFS) и на Windows. В Linux CI сборка проходит, поэтому баг не виден на деплое и живёт в репозитории незамеченным.

## Причина

В `src/ui/` лежат **два разных файла, отличающихся только регистром первой буквы**:

| Файл | Блоб | Содержимое |
|---|---|---|
| `src/ui/ActionRow.js` | `c093f8a` | `export class ActionRow extends Container` |
| `src/ui/actionRow.js` | `1815580` | `export const ACTION_BTN_W / ACTION_BTN_H / ACTION_BTN_GAP / ACTION_ROW_MARGIN`, `actionButtonX()` |

Git хранит их как две отдельные записи, но macOS/Windows физически не могут держать оба — при `checkout` один перезаписывает другой. В итоге на диске остаётся только layout-модуль, класс `ActionRow` исчезает, и `Game.js:23` его не находит.

Побочный симптом: `git status` **всегда** показывает `M src/ui/ActionRow.js` сразу после чистого `git reset --hard`, потому что содержимое на диске никогда не совпадает с ожидаемым блобом. Рабочее дерево на Mac невозможно привести в чистое состояние.

Усугубляет `core.ignorecase=true` (значение по умолчанию для macOS) — git не сигналит о конфликте, просто молча берёт последний.

## Как чинить

Переименовать layout-модуль так, чтобы имена не отличались только регистром. Предлагаемый вариант — `actionRow.js` → `actionRowLayout.js` (по аналогии с уже существующим `catDeckLayout.js`, то есть в стиле проекта):

```bash
git mv src/ui/actionRow.js src/ui/actionRowLayout.js
```

Затем поправить импорты. Кто импортирует layout-модуль сейчас:

- `src/game/Game.js:22` — `import { ACTION_BTN_H, ACTION_ROW_MARGIN } from '../ui/actionRow.js'`
- `src/ui/ActionRow.js:2` — `import { ACTION_BTN_H, ACTION_BTN_W, actionButtonX } from './actionRow.js'`
- `tests/unit/actionRow.test.js` — проверить и поправить путь

⚠️ На Mac переименование только по регистру (`actionRow.js` → `ActionRowLayout.js`) через обычный `mv` не сработает — нужен именно `git mv` с промежуточным именем либо `git mv -f`. Поэтому предлагается имя, отличающееся не только регистром.

## Критерии

- [ ] В `src/ui/` нет двух файлов, отличающихся только регистром (`ls src/ui | sort -f | uniq -di` пусто)
- [ ] `npm run build:vk` собирается на macOS без ошибок
- [ ] `git status` чистый сразу после `git checkout` (не висит вечный `M ActionRow.js`)
- [ ] `node tests/runAll.js` остаётся 100% зелёным
- [ ] Проверено, что Linux CI-сборка тоже не сломалась после переименования

## Почему не пофикшено сразу

Переименование трогает импорты в нескольких файлах и меняет отслеживаемое git имя — хотелось согласовать целевое имя (`actionRowLayout.js` vs другой вариант), а не навязывать своё. Сам баг блокирует проверку критерия «`npm run build:vk` собирается без ошибок» в [TASK-082](../TASK-082/TASK-082.md) на Mac.
