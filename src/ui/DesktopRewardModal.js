// src/ui/DesktopRewardModal.js
// Фолбэк, когда реклама VK недоступна: приглашение друзей вместо поста на стену.

import { Container, Graphics, Text, TextStyle, Sprite, Assets } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { saveProgress } from '../api/client.js';
import { eventTracker } from '../analytics/EventTracker.js';
import VKService from '../vk/VKBridge.js';

export const INVITE_FALLBACK_GEMS = 15;

export class DesktopRewardModal extends Container {
  constructor(app, economy, onRewardGranted, rewardGems = 5) {
    super();
    this.app = app;
    this.economy = economy;
    this.onRewardGranted = onRewardGranted || (() => {});
    this.rewardGems = Math.max(Number(rewardGems) || 0, INVITE_FALLBACK_GEMS);
    this.vkService = new VKService();
    this._isClosed = false;

    this.eventMode = 'static';
    this.sortableChildren = true;

    this._draw();
  }

  async _draw() {
    this.removeChildren();

    const W = CONFIG.GAME_WIDTH || 375;
    const H = CONFIG.GAME_HEIGHT || 667;

    // 1. Защитный экранирующий полупрозрачный щит
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x07040d, alpha: 0.90 });
    overlay.eventMode = 'static';
    overlay.zIndex = 1;
    this.addChild(overlay);

    // 2. Окно модалки
    const modalW = 330;
    const modalH = 390;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2 - 10;

    const bg = new Graphics();
    bg.roundRect(modalX, modalY, modalW, modalH, 20);
    bg.fill(0x15102a);
    bg.stroke({ color: 0xffd700, width: 2.5 });
    bg.zIndex = 2;
    this.addChild(bg);

    // 3. Заголовок с розовым 3D рубиновым гемом
    const titleContainer = new Container();
    titleContainer.zIndex = 5;

    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#ffd700',
      dropShadow: { color: '#000000', alpha: 0.8, blur: 4, distance: 2 }
    });

    const titleText = new Text({ text: 'Закончились рубины? ', style: titleStyle });
    titleText.position.set(0, 0);

    const titleGem = UIUtils.createGemIcon(11);
    titleGem.position.set(titleText.width + 10, 11);

    titleContainer.addChild(titleText);
    titleContainer.addChild(titleGem);

    const totalTitleWidth = titleText.width + 22;
    titleContainer.pivot.set(totalTitleWidth / 2, 0);
    titleContainer.position.set(W / 2, modalY + 16);
    this.addChild(titleContainer);

    // 4. Фотореалистичный арт Зеленоглазой Кошечки (180x180px)
    const imgContainer = new Container();
    imgContainer.position.set(W / 2, modalY + 145);
    imgContainer.zIndex = 5;
    this.addChild(imgContainer);

    try {
      const base = (import.meta.env ? import.meta.env.BASE_URL : '/').replace(/\/?$/, '/');
      const texture = await Assets.load(`${base}assets/cats/green_eyes_gift.jpg`);
      if (texture && !this._isClosed) {
        const sprite = new Sprite(texture);
        sprite.width = 170;
        sprite.height = 170;
        sprite.anchor.set(0.5, 0.5);

        // Рамка вокруг картинки
        const imgBorder = new Graphics();
        imgBorder.roundRect(-88, -88, 176, 176, 16);
        imgBorder.fill(0x0a0718);
        imgBorder.stroke({ color: 0x2ecc71, width: 2.5 });

        imgContainer.addChild(imgBorder);
        imgContainer.addChild(sprite);
      }
    } catch (e) {
      console.warn('⚠️ Ошибка загрузки арта green_eyes_gift.jpg:', e);
      const fallbackText = new Text({ text: '👀🐱', style: new TextStyle({ fontSize: 64 }) });
      fallbackText.anchor.set(0.5, 0.5);
      imgContainer.addChild(fallbackText);
    }

    // 5. Двухстрочное аккуратное центрированное описание акции
    const descGroup = new Container();
    descGroup.zIndex = 5;

    const descStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#dcdde1',
      align: 'center'
    });

    const line1 = new Text({ text: 'Пригласи друзей в Империю Котиков', style: descStyle });
    line1.anchor.set(0.5, 0);
    line1.position.set(0, 0);
    descGroup.addChild(line1);

    const line2Container = new Container();
    const t1 = new Text({ text: `и получи +${this.rewardGems} `, style: descStyle });
    t1.position.set(0, 0);

    const descGem = UIUtils.createGemIcon(9);
    descGem.position.set(t1.width + 9, 8);

    const highlightStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#ffd700'
    });
    const t2 = new Text({ text: ' БЕСПЛАТНО!', style: highlightStyle });
    t2.position.set(t1.width + 20, 0);

    line2Container.addChild(t1);
    line2Container.addChild(descGem);
    line2Container.addChild(t2);

    const line2Width = t1.width + 20 + t2.width;
    line2Container.pivot.set(line2Width / 2, 0);
    line2Container.position.set(0, 20);
    descGroup.addChild(line2Container);

    descGroup.position.set(W / 2, modalY + 238);
    this.addChild(descGroup);

    const btnW = 280;
    const btnH = 46;
    const btnX = (W - btnW) / 2;
    const btnY = modalY + 322;

    const inviteBtn = UIUtils.createButton(
      btnX,
      btnY,
      btnW,
      btnH,
      `🤝 Пригласить друзей (+${this.rewardGems}) `,
      0x0077FF,
      async () => {
        await this._handleInviteAndReward();
      }
    );

    const btnGem = UIUtils.createGemIcon(10);
    btnGem.position.set(btnW - 22, btnH / 2);
    inviteBtn.addChild(btnGem);

    inviteBtn.zIndex = 10;
    this.addChild(inviteBtn);

    // 7. Кнопка «Закрыть ✕»
    const closeBtnContainer = new Container();
    closeBtnContainer.position.set(modalX + modalW - 14, modalY + 14);
    closeBtnContainer.eventMode = 'static';
    closeBtnContainer.cursor = 'pointer';
    closeBtnContainer.zIndex = 99;

    const closeBg = new Graphics();
    closeBg.circle(0, 0, 16);
    closeBg.fill(0xe74c3c);
    closeBg.stroke({ color: '#ffffff', alpha: 0.9, width: 2 });
    closeBtnContainer.addChild(closeBg);

    const closeText = new Text({ text: '✕', style: new TextStyle({ fontFamily: 'sans-serif', fontSize: 14, fill: '#ffffff', fontWeight: 'bold' }) });
    closeText.anchor.set(0.5, 0.5);
    closeBtnContainer.addChild(closeText);

    closeBtnContainer.on('pointertap', (e) => {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      this._close();
    });

    this.addChild(closeBtnContainer);
  }

  async _handleInviteAndReward() {
    if (this._isInviting) return;
    this._isInviting = true;

    try {
      const inviteRes = await this.vkService.showInviteBox();

      if (inviteRes && inviteRes.success && !inviteRes.simulated) {
        console.log('✅ Приглашение друзей отправлено, начисляем рубины');
        eventTracker.track('invite_reward_granted', { reward_gems: this.rewardGems, source: 'ad_fallback' });

        if (this.economy && this.rewardGems > 0) {
          this.economy.addGems(this.rewardGems);
          try { await saveProgress({ gems: this.economy.gems }); } catch (err) {}
        }

        const stage = (this.app && this.app.stage) ? this.app.stage : this.parent;
        if (stage) {
          UIUtils.showToast(stage, `🤝 Друзья приглашены! +${this.rewardGems} 💎`);
        }

        this._close();
        if (typeof this.onRewardGranted === 'function') {
          this.onRewardGranted();
        }
      } else {
        this._isInviting = false;
        const stage = (this.app && this.app.stage) ? this.app.stage : this.parent;
        if (stage) {
          const msg = inviteRes && inviteRes.simulated
            ? '🤝 Приглашения доступны внутри VK'
            : 'Приглашение отменено';
          UIUtils.showToast(stage, msg);
        }
      }
    } catch (e) {
      console.error('Ошибка приглашения друзей:', e);
      this._isInviting = false;
    }
  }

  _close() {
    if (this._isClosed) return;
    this._isClosed = true;
    if (this.parent) {
      this.parent.removeChild(this);
    }
    this.destroy({ children: true });
  }
}
