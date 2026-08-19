import assert from 'node:assert';
import { Text } from 'pixi.js';
import { mountPackCaption, RUBY_PACK_BTN_H, RUBY_PACK_BTN_GAP } from '../../src/ui/RubyShopModal.js';
import { RUBY_PACKS } from '../../src/config/rubyShop.js';

export function runRubyShopHitsTests() {
  console.log('🧪 Тестирование тапов в магазине рубинов...');

  assert.strictEqual(RUBY_PACKS.length, 3);
  assert.ok(RUBY_PACK_BTN_H >= 70, 'Паки достаточно высокие под палец');
  assert.strictEqual(RUBY_PACK_BTN_H + RUBY_PACK_BTN_GAP, 84, 'Шаг паков как на экране, без наезда');

  const empty = new Text({ text: '' });
  empty.visible = true;
  const host = { children: [empty], addChild(child) { this.children.push(child); } };

  mountPackCaption(host, 296, 'Старт  ·  10 рубинов', '1 голос VK  ·  2 авто-слияния', 'Fredoka, sans-serif');

  assert.strictEqual(empty.visible, false, 'Пустая подпись кнопки не перекрывает пак');
  const labels = host.children.filter((c) => c instanceof Text && c.visible);
  assert.strictEqual(labels.length, 2);
  assert.ok(labels.every((c) => c.eventMode === 'none'), 'Текст пака не должен есть pointer');
  assert.ok(labels[0].text.includes('Старт'));
  assert.ok(labels[1].text.includes('голос'));

  console.log('  ✅ Подписи паков сидят на кнопке и не перехватывают тап!');
}
