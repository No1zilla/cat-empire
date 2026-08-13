// src/ui/DesktopRewardModal.js
// TASK-073: Модальное окно награды за виральный пост на стену VK с Зеленоглазой Кошечкой (Десктоп VK Fallback)

import { Container, Graphics, Text, TextStyle, Sprite, Assets } from 'pixi.js';
import { CONFIG } from '../config.js';
import { UIUtils } from '../utils/UIUtils.js';
import { saveProgress } from '../api/client.js';
import { eventTracker } from '../analytics/EventTracker.js';
import VKService from '../vk/VKBridge.js';

export class DesktopRewardModal extends Container {
  constructor(app, economy, onRewardGranted, rewardGems = 5) {
    super();
    this.app = app;
    this.economy = economy;
    this.onRewardGranted = onRewardGranted || (() => {});
    this.rewardGems = rewardGems;
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

    // 3. Заголовок
    const titleStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#ffd700',
      align: 'center',
      dropShadow: { color: '#000000', alpha: 0.8, blur: 4, distance: 2 }
    });

    const titleText = new Text({ text: 'Закончились рубины? 💎', style: titleStyle });
    titleText.anchor.set(0.5, 0);
    titleText.position.set(W / 2, modalY + 16);
    titleText.zIndex = 5;
    this.addChild(titleText);

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

    // 5. Описание акции
    const descStyle = new TextStyle({
      fontFamily: CONFIG.FONT_FAMILY || 'Fredoka, sans-serif',
      fontSize: 12,
      fill: '#dcdde1',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 290
    });

    const descText = new Text({
      text: 'Опубликуй открытку с загадочной Зеленоглазой Кошечкой у себя на стене VK и получи +5 💎 БЕСПЛАТНО!',
      style: descStyle
    });
    descText.anchor.set(0.5, 0);
    descText.position.set(W / 2, modalY + 242);
    descText.zIndex = 5;
    this.addChild(descText);

    // 6. Сочная 3D кнопка «📢 Опубликовать на стене VK (+5 💎)»
    const btnW = 280;
    const btnH = 46;
    const btnX = (W - btnW) / 2;
    const btnY = modalY + 322;

    const postBtn = UIUtils.createButton(
      btnX,
      btnY,
      btnW,
      btnH,
      `📢 Опубликовать пост (+${this.rewardGems} 💎)`,
      0x2ecc71,
      async () => {
        await this._handlePostAndReward();
      }
    );
    postBtn.zIndex = 10;
    this.addChild(postBtn);

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

  async _handlePostAndReward() {
    if (this._isPosting) return;
    this._isPosting = true;

    try {
      const shareRes = await this.vkService.sharePost(
        '👀 Посмотрите на эту загадочную Зеленоглазую Кошечку в «Империи Котиков»! Присоединяйтесь к игре!'
      );

      if (shareRes && shareRes.success) {
        console.log('✅ Виральный пост с Зеленоглазой Кошечкой успешно выложен!');
        eventTracker.track('wall_post_reward_granted', { reward_gems: this.rewardGems });

        if (this.economy && this.rewardGems > 0) {
          this.economy.addGems(this.rewardGems);
          try { await saveProgress({ gems: this.economy.gems }); } catch (err) {}
        }

        const stage = (this.app && this.app.stage) ? this.app.stage : this.parent;
        if (stage) {
          UIUtils.showToast(stage, `🎉 Пост выложен! Начислено +${this.rewardGems} 💎`);
        }

        this._close();
        if (typeof this.onRewardGranted === 'function') {
          this.onRewardGranted();
        }
      } else {
        this._isPosting = false;
        const stage = (this.app && this.app.stage) ? this.app.stage : this.parent;
        if (stage) {
          UIUtils.showToast(stage, '⚠️ Публикация отменена');
        }
      }
    } catch (e) {
      console.error('Ошибка публикации поста:', e);
      this._isPosting = false;
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
