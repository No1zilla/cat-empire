import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const OUT = process.env.UI_AUDIT_OUT || '/tmp/ui-audit';
fs.mkdirSync(OUT, { recursive: true });

async function waitForGame(page) {
  await page.waitForFunction(() => !!(window.game && window.game.app && window.game.hud && window.game.actionRow), {
    timeout: 25000
  });
  await page.evaluate(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
  });
  await page.waitForTimeout(500);
}

async function hideBootModals(page) {
  await page.evaluate(() => {
    const g = window.game;
    const hide = (c) => {
      const name = c && c.constructor && c.constructor.name;
      if (!name || !/Modal|Tutorial|Overlay|MainMenu/.test(name)) return;
      c.visible = false;
      c.eventMode = 'none';
      c.interactiveChildren = false;
      if (c.parent) c.parent.removeChild(c);
    };
    [...g.app.stage.children].forEach(hide);
    if (g.gameContainer) [...g.gameContainer.children].forEach(hide);
  });
}

async function overlays(page) {
  return page.evaluate(() => {
    const g = window.game;
    const names = [];
    const walk = (list) => {
      (list || []).forEach((c) => {
        if (!c || c.visible === false) return;
        const name = c.constructor && c.constructor.name;
        if (name && /Modal|Menu|Tutorial|Overlay/.test(name)) names.push(name);
      });
    };
    walk(g.app.stage.children);
    walk(g.gameContainer && g.gameContainer.children);
    return names;
  });
}

async function cssOf(page, fn) {
  return page.evaluate(fn);
}

function toCssExpr() {
  return `
    const g = window.game;
    const canvas = g.app.canvas.getBoundingClientRect();
    const sw = g.app.screen.width;
    const sh = g.app.screen.height;
    const css = (wx, wy) => ({
      x: canvas.left + (wx / sw) * canvas.width,
      y: canvas.top + (wy / sh) * canvas.height
    });
  `;
}

async function targets(page) {
  return page.evaluate(() => {
    const g = window.game;
    const canvas = g.app.canvas.getBoundingClientRect();
    const sw = g.app.screen.width;
    const sh = g.app.screen.height;
    const css = (pt) => ({
      x: canvas.left + (pt.x / sw) * canvas.width,
      y: canvas.top + (pt.y / sh) * canvas.height
    });
    const centerOf = (obj, w, h) => {
      const tl = obj.toGlobal({ x: 0, y: 0 });
      return css({ x: tl.x + w / 2, y: tl.y + h / 2 });
    };
    const list = [];
    list.push({ id: 'hud-gems', ...css({ x: 120 + 31, y: 10 + 17 }), expect: 'RubyShopModal' });
    list.push({ id: 'hud-plus5', ...css({ x: 188 + 22, y: 10 + 17 }), expect: 'AdModal' });
    list.push({ id: 'hud-menu', ...css({ x: 340 + 32, y: 10 + 17 }), expect: 'MainMenu' });
    if (g.catDeck) {
      const deck = g.catDeck.toGlobal({ x: 0, y: 0 });
      list.push({
        id: 'deck-card1',
        ...css({
          x: deck.x + (g.catDeck._cardHit ? g.catDeck._cardHit.startX : 52) + 27 + (g.catDeck._cardsContainer ? g.catDeck._cardsContainer.x : 0),
          y: deck.y + (g.catDeck._cardY || 30) + 39
        }),
        expect: 'CatDetailModal'
      });
      list.push({ id: 'deck-left', ...css({ x: deck.x + 12 + 14, y: deck.y + (g.catDeck._cardY || 30) + 39 }), expect: 'scroll' });
      list.push({ id: 'deck-right', ...css({ x: deck.x + 410 - 40 + 14, y: deck.y + (g.catDeck._cardY || 30) + 39 }), expect: 'scroll' });
      list.push({ id: 'deck-tutorial', ...css({ x: deck.x + 410 - 70, y: deck.y + 18 }), expect: 'Tutorial' });
    }
    list.push({ id: 'buy', ...centerOf(g.spawnSystem, 126, 50), expect: 'buy' });
    list.push({ id: 'fill', ...centerOf(g.fillAllButton, 126, 50), expect: 'fill' });
    list.push({ id: 'merge', ...centerOf(g.autoMergeButton, 126, 50), expect: 'merge' });
    const cat = g.grid && g.grid.slots && g.grid.slots[0];
    if (cat) {
      const gp = g.grid.toGlobal({ x: 0, y: 0 });
      const pos = g.grid.getSlotPosition(0);
      list.push({ id: 'grid-cat0', ...css({ x: gp.x + pos.x + 38, y: gp.y + pos.y + 38 }), expect: 'cat' });
    }
    return list;
  });
}

async function clickTarget(page, t) {
  await page.evaluate(() => { window.__lastAction = null; });
  await page.mouse.click(t.x, t.y);
  await page.waitForTimeout(450);
  const open = await overlays(page);
  const last = await page.evaluate(() => window.__lastAction);
  return { open, last };
}

async function closeTop(page) {
  await page.evaluate(() => {
    const g = window.game;
    const kill = (c) => {
      const name = c && c.constructor && c.constructor.name;
      if (!name || !/Modal|Tutorial|Overlay/.test(name)) return;
      if (name === 'MainMenu') return;
      c.visible = false;
      c.eventMode = 'none';
      c.interactiveChildren = false;
    };
    [...g.app.stage.children].forEach(kill);
    if (g.gameContainer) [...g.gameContainer.children].forEach(kill);
  });
  await page.waitForTimeout(150);
}

async function closeMenu(page) {
  await page.evaluate(() => {
    const g = window.game;
    if (g._mainMenuInstance) {
      g._mainMenuInstance.visible = false;
      g._mainMenuInstance.eventMode = 'none';
    }
  });
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const context = await browser.newContext({ viewport: { width: 410, height: 700 }, deviceScaleFactor: 1 });
await context.addInitScript(() => {
  try {
    localStorage.setItem('cat_empire_tutorial_done', '1');
    localStorage.setItem('cat_empire_last_timestamp', String(Date.now()));
  } catch (e) {}
});
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(process.argv[2] || 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await waitForGame(page);
await hideBootModals(page);

await page.evaluate(() => {
  const g = window.game;
  const arm = (obj, name) => {
    if (obj && typeof obj.on === 'function') obj.on('pointerdown', () => { window.__lastAction = name; });
  };
  arm(g.spawnSystem, 'buy');
  arm(g.fillAllButton, 'fill');
  arm(g.autoMergeButton, 'merge');
});

await page.screenshot({ path: path.join(OUT, '00-field.png'), fullPage: true });

const list = await targets(page);
const results = [];
for (const t of list) {
  await hideBootModals(page);
  await closeMenu(page);
  const before = await overlays(page);
  const { open, last } = await clickTarget(page, t);
  const shot = path.join(OUT, `${t.id}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  const row = { id: t.id, expect: t.expect, x: t.x, y: t.y, open, last, before };
  results.push(row);
  console.log(JSON.stringify(row));
  await closeTop(page);
  await closeMenu(page);
}

await hideBootModals(page);
const menuPt = list.find((t) => t.id === 'hud-menu');
if (menuPt) {
  await page.mouse.click(menuPt.x, menuPt.y);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'menu.png'), fullPage: true });
  const menuClicks = [
    { id: 'menu-play', x: 205, y: 303, expect: 'closed-or-play' },
    { id: 'menu-daily', x: 142, y: 362, expect: 'DailyRewardsModal' },
    { id: 'menu-quest', x: 268, y: 362, expect: 'DailyQuestsModal' },
    { id: 'menu-top', x: 142, y: 418, expect: 'LeaderboardModal' },
    { id: 'menu-friends', x: 268, y: 418, expect: 'toast-or-invite' },
    { id: 'menu-catopedia', x: 142, y: 474, expect: 'CollectionModal' },
    { id: 'menu-shop', x: 268, y: 474, expect: 'RubyShopModal' },
    { id: 'menu-court', x: 142, y: 530, expect: 'toast-or-court' },
    { id: 'menu-settings', x: 268, y: 530, expect: 'SettingsModal' }
  ];
  for (const t of menuClicks) {
    await page.evaluate(() => {
      const g = window.game;
      if (!g._mainMenuInstance || !g._mainMenuInstance.visible) g.showMainMenu();
    });
    await page.waitForTimeout(250);
    await page.mouse.click(t.x, t.y);
    await page.waitForTimeout(500);
    const open = await overlays(page);
    await page.screenshot({ path: path.join(OUT, `${t.id}.png`), fullPage: true });
    const row = { id: t.id, expect: t.expect, open };
    results.push(row);
    console.log(JSON.stringify(row));
    await closeTop(page);
  }
}

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
await browser.close();
console.log('wrote', path.join(OUT, 'report.json'));
