import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';

export class VKAdNoticeModal extends Container {
  constructor(app, onGrantReward = () => {}) {
    super();
    this.app = app;
    this.onGrantReward = onGrantReward;

    const gameWidth = CONFIG.GAME_WIDTH || 410;
    const gameHeight = CONFIG.GAME_HEIGHT || 730;

    // Overlay background
    const overlay = new Graphics();
    overlay.rect(0, 0, gameWidth, gameHeight);
    overlay.fill({ color: 0x000000, alpha: 0.75 });
    overlay.eventMode = 'static';
    this.addChild(overlay);

    // Modal Card
    const modalW = 340;
    const modalH = 260;
    const modalX = (gameWidth - modalW) / 2;
    const modalY = (gameHeight - modalH) / 2;

    const card = new Container();
    card.position.set(modalX, modalY);

    const bg = new Graphics();
    bg.roundRect(0, 0, modalW, modalH, 20);
    bg.fill(0x1a1c23);
    bg.stroke({ color: 0xffd700, width: 2 });
    card.addChild(bg);

    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#ffd700',
      dropShadow: { color: '#000000', alpha: 0.8, blur: 3 }
    });

    const title = new Text({ text: '📢 Реклама ВКонтакте', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(modalW / 2, 16);
    card.addChild(title);

    const descStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 12,
      fill: '#e0e0e0',
      wordWrap: true,
      wordWrapWidth: modalW - 32,
      align: 'center'
    });

    const descText = "Платформа VK Ads в текущий момент не выдала коммерческий видеоролик.\n\n💡 Чтобы включить настоящую рекламу VK, активируйте раздел «Монетизация» в настройках приложения vk.com/apps?act=manage (App ID: 54702054).";
    const desc = new Text({ text: descText, style: descStyle });
    desc.anchor.set(0.5, 0);
    desc.position.set(modalW / 2, 55);
    card.addChild(desc);

    // Test Reward Button
    const btnW = 260;
    const btnH = 44;
    const btnX = (modalW - btnW) / 2;
    const btnY = modalH - 60;

    const btn = UIUtils.createButton(btnX, btnY, btnW, btnH, '🎁 Получить 5 💎 (Тест)', 0x2ecc71, () => {
      this.destroyModal();
      this.onGrantReward();
    });
    card.addChild(btn);

    // Close X button
    const closeBtn = new Graphics();
    closeBtn.circle(modalW - 16, 16, 12);
    closeBtn.fill(0xff4757);
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointertap', () => this.destroyModal());

    const xText = new Text({ text: '✕', style: { fontSize: 13, fill: '#ffffff', fontWeight: 'bold' } });
    xText.anchor.set(0.5);
    xText.position.set(modalW - 16, 16);
    card.addChild(closeBtn);
    card.addChild(xText);

    this.addChild(card);
  }

  destroyModal() {
    if (this.parent) this.parent.removeChild(this);
    this.destroy();
  }
}

export default VKAdNoticeModal;
