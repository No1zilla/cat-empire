import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { PlatformService } from '../services/PlatformService.js';

/**
 * Окно «⚙️ Настройки»
 */
export class SettingsModal extends Container {
  constructor(app, onClose) {
    super();
    this.app = app;
    this.onClose = onClose || (() => {});
    this._draw();
  }

  _draw() {
    this.removeChildren();
    const width = CONFIG.GAME_WIDTH || 375;
    const height = CONFIG.GAME_HEIGHT || 667;

    // 1. Полупрозрачный оверлей (единый тон с другими модальными окнами)
    const overlay = new Graphics();
    overlay.rect(0, 0, width, height);
    overlay.fill({ color: 0x07040d, alpha: 0.88 });
    overlay.interactive = true;
    this.addChild(overlay);

    // 2. Модальная плашка Glassmorphism
    const modalW = 310;
    const modalH = 340;
    const modalX = (width - modalW) / 2;
    const modalY = (height - modalH) / 2;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102A);  // TOKENS.panelBg — единый фон
    bg.stroke({ color: 0xA55EEA, width: 2 });  // TOKENS.btnMerge — фиолетовая рамка
    this.addChild(bg);

    const font = CONFIG.FONT_FAMILY || 'Fredoka, sans-serif';

    // 3. Заголовок
    const titleStyle = new TextStyle({
      fontFamily: font,
      fontSize: 22,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: { color: '#000000', alpha: 0.5, blur: 2 }
    });
    const title = new Text({ text: '⚙️ НАСТРОЙКИ', style: titleStyle });
    title.anchor.set(0.5);
    title.position.set(width / 2, modalY + 35);
    this.addChild(title);

    // 4. Переключатель Звука
    let soundEnabled = localStorage.getItem('cat_empire_sound_muted') !== '1';

    const soundContainer = new Container();
    soundContainer.position.set(modalX + 25, modalY + 80);

    const soundLabel = new Text({
      text: 'Звуковые эффекты:',
      style: new TextStyle({ fontFamily: font, fontSize: 15, fill: '#ecf0f1' })
    });
    soundContainer.addChild(soundLabel);

    const soundBtn = UIUtils.createButton(
      170, -6, 90, 36,
      soundEnabled ? '🔊 ВКЛ' : '🔇 ВЫКЛ',
      soundEnabled ? 0x2ecc71 : 0xe74c3c,
      () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('cat_empire_sound_muted', soundEnabled ? '0' : '1');
        this._draw();
      }
    );
    soundContainer.addChild(soundBtn);
    this.addChild(soundContainer);

    // 5. Статус Синхронизации
    const syncContainer = new Container();
    syncContainer.position.set(modalX + 25, modalY + 145);

    const syncTitle = new Text({
      text: 'Синхронизация:',
      style: new TextStyle({ fontFamily: font, fontSize: 15, fill: '#ecf0f1' })
    });
    syncContainer.addChild(syncTitle);

    const isVk = PlatformService.isVK();
    const syncDesc = new Text({
      text: isVk ? '☁️ VK Cloud Storage (Активно)' : '📱 Локальное хранилище',
      style: new TextStyle({ fontFamily: font, fontSize: 13, fill: '#2ecc71' })
    });
    syncDesc.position.set(0, 24);
    syncContainer.addChild(syncDesc);

    this.addChild(syncContainer);

    // 6. Описание версии
    const verText = new Text({
      text: 'Империя Котиков v1.0.0\nПлатформа: ' + PlatformService.platform.toUpperCase(),
      style: new TextStyle({ fontFamily: font, fontSize: 12, fill: '#7f8c8d', align: 'center' })
    });
    verText.anchor.set(0.5);
    verText.position.set(width / 2, modalY + 235);
    this.addChild(verText);

    const closeBtn = UIUtils.createButton(
      modalX + (modalW - 160) / 2,
      modalY + modalH - 55,
      160,
      40,
      'ЗАКРЫТЬ',
      0xFF6B6B,  // TOKENS.btnBuy — единый красный
      () => {
        this.onClose();
        if (this.parent) this.parent.removeChild(this);
      }
    );
    this.addChild(closeBtn);
  }
}
