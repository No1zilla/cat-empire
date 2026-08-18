import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { PlatformService } from '../services/PlatformService.js';
import { VKService } from '../vk/VKBridge.js';
import { storageService } from '../services/StorageService.js';
import { soundManager } from '../audio/SoundManager.js';

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
    overlay.eventMode = 'static';
    const stopEvt = (e) => { if (e && typeof e.stopPropagation === 'function') e.stopPropagation(); };
    overlay.on('pointerdown', stopEvt);
    overlay.on('pointerup', stopEvt);
    overlay.on('pointertap', stopEvt);
    overlay.on('tap', stopEvt);
    overlay.on('click', stopEvt);
    overlay.on('touchstart', stopEvt);
    this.addChild(overlay);

    // 2. Модальная плашка Glassmorphism
    const modalW = 310;
    const modalH = 430;
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
    let musicEnabled = localStorage.getItem('cat_empire_music_muted') !== '1';

    const soundContainer = new Container();
    soundContainer.position.set(modalX + 25, modalY + 78);

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
        soundManager.setEnabled(soundEnabled);
        this._draw();
      }
    );
    soundContainer.addChild(soundBtn);
    this.addChild(soundContainer);

    const musicContainer = new Container();
    musicContainer.position.set(modalX + 25, modalY + 126);
    const musicLabel = new Text({
      text: 'Музыка:',
      style: new TextStyle({ fontFamily: font, fontSize: 15, fill: '#ecf0f1' })
    });
    musicContainer.addChild(musicLabel);
    const musicBtn = UIUtils.createButton(
      170, -6, 90, 36,
      musicEnabled ? '🎵 ВКЛ' : '🎵 ВЫКЛ',
      musicEnabled ? 0x2ecc71 : 0xe74c3c,
      () => {
        musicEnabled = !musicEnabled;
        soundManager.setMusicEnabled(musicEnabled);
        this._draw();
      }
    );
    musicContainer.addChild(musicBtn);
    this.addChild(musicContainer);

    // 5. Статус Синхронизации
    const syncContainer = new Container();
    syncContainer.position.set(modalX + 25, modalY + 180);

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

    // 6. Кнопки Социального Расшаривания VK
    const vkService = new VKService();
    const shareBtn = UIUtils.createButton(
      modalX + 25,
      modalY + 238,
      (modalW - 60) / 2,
      36,
      '📢 ПОДЕЛИТЬСЯ',
      0x0077FF, // VK Brand Blue
      async () => {
        const appStage = (this.app && this.app.stage) ? this.app.stage : (window.game && window.game.app ? window.game.app.stage : this.parent);
        const res = await vkService.shareLink();
        if (!appStage) return;
        if (res && res.success && !res.simulated) UIUtils.showToast(appStage, 'Ссылка отправлена');
        else if (res && res.reason === 'user_cancelled') UIUtils.showToast(appStage, 'Отменено');
        else if (res && res.simulated) UIUtils.showToast(appStage, 'Поделиться можно внутри VK');
        else UIUtils.showToast(appStage, 'Не удалось поделиться');
      }
    );
    this.addChild(shareBtn);

    const wallBtn = UIUtils.createButton(
      modalX + 35 + (modalW - 60) / 2,
      modalY + 238,
      (modalW - 60) / 2,
      36,
      '📝 НА СТЕНУ',
      0x4A76A8, // VK Wall Post Blue
      async () => {
        const appStage = (this.app && this.app.stage) ? this.app.stage : (window.game && window.game.app ? window.game.app.stage : this.parent);
        const res = await vkService.sharePost('Моя Империя Котиков растёт. Заходи поиграть.');
        if (!appStage) return;
        if (res && res.success && !res.simulated) UIUtils.showToast(appStage, 'Пост на стене');
        else if (res && res.reason === 'user_cancelled') UIUtils.showToast(appStage, 'Пост отменён');
        else if (res && res.simulated) UIUtils.showToast(appStage, 'Стена открывается внутри VK');
        else UIUtils.showToast(appStage, 'Не удалось открыть стену');
      }
    );
    this.addChild(wallBtn);

    // 7. Кнопка «🗑️ Сбросить прогресс»
    const resetBtn = UIUtils.createButton(
      modalX + 25,
      modalY + 286,
      modalW - 50,
      34,
      '🗑️ СБРОСИТЬ ПРОГРЕСС',
      0xd63031,
      async () => {
        resetBtn.eventMode = 'none';
        const appStage = (this.app && this.app.stage) ? this.app.stage : (window.game && window.game.app ? window.game.app.stage : this.parent);
        if (appStage) {
          UIUtils.showToast(appStage, '🔄 Сброс прогресса... Перезагрузка');
        }
        await storageService.clearAllProgress();
        window.location.reload();
      }
    );
    this.addChild(resetBtn);

    // 8. Описание версии
    const verText = new Text({
      text: 'Империя Котиков v1.0.0 | ' + PlatformService.platform.toUpperCase(),
      style: new TextStyle({ fontFamily: font, fontSize: 11, fill: '#7f8c8d', align: 'center' })
    });
    verText.anchor.set(0.5);
    verText.position.set(width / 2, modalY + 332);
    this.addChild(verText);

    const closeBtn = UIUtils.createButton(
      modalX + (modalW - 140) / 2,
      modalY + modalH - 38,
      140,
      34,
      'ЗАКРЫТЬ',
      0xFF6B6B,
      () => {
        this.onClose();
        if (this.parent) this.parent.removeChild(this);
      }
    );
    this.addChild(closeBtn);
  }
}
