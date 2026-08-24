# 📌 TASK-084: `npm run build:vk` не собирается на macOS — коллизия имён ActionRow.js / actionRow.js

> **Статус:** ✅ Исправлено — `actionRow.js` → `actionRowLayout.js`
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

## Как починено

Layout-модуль переименован `actionRow.js` → **`actionRowLayout.js`**.

Это не новая выдумка, а уже принятая в проекте конвенция — рядом ровно такая же пара, и она не конфликтует:

| Компонент (pixi) | Чистый layout | Коллизия? |
|---|---|---|
| `CatDeck.js` | `catDeckLayout.js` | нет |
| `ActionRow.js` | ~~`actionRow.js`~~ → `actionRowLayout.js` | больше нет |

То есть `ActionRow` был единственным, кто выбивался из общего правила — фикс просто вернул его в строй.

Обновлены все 7 импортов:

- `src/ui/ActionRow.js:2`
- `src/ui/AutoMergeButton.js:7`
- `src/ui/FillAllButton.js:5`
- `src/ui/LiveOpsRow.js:3`
- `src/game/Game.js:22`
- `src/game/SpawnSystem.js:7`
- `tests/unit/actionRow.test.js:23`

### Рассмотренные альтернативы (отклонены)

- **Слить layout прямо в `ActionRow.js`.** Затащило бы `pixi.js` в `tests/unit/actionRow.test.js`, который сейчас проверяет 12 чистых функций вообще без pixi. Тест стал бы тяжелее и завязан на рендер — хуже.
- **Переименовать класс (`ActionRow.js` → `ActionRowView.js`).** На две правки меньше, но ломает конвенцию PascalCase-компонентов в `src/ui/` (`AdModal.js`, `CatDeck.js`, `HUD.js`, `NewCatModal.js`). Экономия не стоит несогласованности.

### ⚠️ Нюанс при повторении на Mac

Обычный `git rm src/ui/actionRow.js` на case-insensitive ФС **удалил бы и `ActionRow.js`** — это физически один и тот же файл. Правильно: записать layout по новому пути, затем `git rm --cached` только для старого пути (индекс, не диск), затем `git checkout -- src/ui/ActionRow.js`.

## Критерии

- [x] В `src/ui/` нет двух файлов, отличающихся только регистром (`ls src/ui | sort -f | uniq -di` пусто)
- [x] `npm run build:vk` собирается на macOS без ошибок
- [x] `git status` чистый — вечный `M ActionRow.js` пропал
- [x] `node tests/runAll.js` остаётся 100% зелёным
- [ ] Проверить, что Linux CI-сборка тоже не сломалась после переименования (проверяется после пуша)

Разблокирует критерий «`npm run build:vk` собирается без ошибок» в [TASK-082](../TASK-082/TASK-082.md), который на Mac до этого проверить было невозможно.

## Побочная находка (в этот фикс не входит)

Закоммиченный `dist/` протух: `public/assets/cats/cat_12.png` (71993 б) не совпадает с `dist/assets/cats/cat_12.png` в git (74875 б) — арт кота 12 уровня обновили, а собранную версию в репозиторий не переложили. Локальный `npm run build:vk` это подтягивает, но если что-то раздаёт закоммиченный `dist/` напрямую вместо своей сборки, игроки видят старую картинку. Само по себе это ещё один довод перестать держать `dist/` в git (он уже перечислен в `.gitignore`, но 32 файла остались в индексе с тех пор, как правило добавили задним числом).
