import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const OUT = process.env.RUBY_SHOP_OUT || '/opt/cursor/artifacts';
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const url = process.argv[2] || 'http://127.0.0.1:5173/';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 760 } });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => !!(window.game && typeof window.game.showRubyShop === 'function'), {
    timeout: 25000
  });
  await page.evaluate(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
    const g = window.game;
    [...(g.app.stage.children || [])].forEach((c) => {
      const name = c && c.constructor && c.constructor.name;
      if (name && /Modal|Tutorial|MainMenu/.test(name)) {
        c.visible = false;
        if (c.parent) c.parent.removeChild(c);
      }
    });
    window.__rubyClicks = [];
    g.showRubyShop();
  });
  await page.waitForTimeout(400);

  const primed = await page.evaluate(() => {
    const g = window.game;
    const modal = (g.app.stage.children || []).find((c) => {
      const name = c && c.constructor && c.constructor.name;
      return name === 'RubyShopModal';
    });
    if (!modal) return { error: 'no-modal' };
    modal.vkService.showOrderBox = async (id) => {
      window.__rubyClicks.push(String(id));
      return { cancelled: true };
    };
    const canvas = g.app.canvas.getBoundingClientRect();
    const sw = g.app.screen.width;
    const sh = g.app.screen.height;
    const packs = (modal.children || []).filter((c) => c.hitArea && c.hitArea.height >= 70);
    const css = (wx, wy) => ({
      x: canvas.left + (wx / sw) * canvas.width,
      y: canvas.top + (wy / sh) * canvas.height
    });
    return {
      packs: packs.length,
      warmup: css(205, 40),
      targets: packs.map((btn) => {
        const tl = btn.toGlobal({ x: 0, y: 0 });
        const w = 296;
        const h = 70;
        const center = css(tl.x + w / 2, tl.y + h / 2);
        return { x: center.x, y: center.y, w, h };
      })
    };
  });

  if (primed.warmup) {
    await page.mouse.click(primed.warmup.x, primed.warmup.y);
    await page.waitForTimeout(200);
  }

  const clicks = [];
  for (const t of primed.targets || []) {
    await page.mouse.click(t.x, t.y);
    await page.waitForTimeout(650);
    const ids = await page.evaluate(() => window.__rubyClicks.slice());
    clicks.push({ x: t.x, y: t.y, ids: ids.slice() });
  }

  await page.screenshot({ path: path.join(OUT, 'ruby-shop-hits.png'), fullPage: true });
  const texts = await page.evaluate(() => {
    const out = [];
    const walk = (c) => {
      if (!c) return;
      if (c.text != null && String(c.text).trim()) out.push(String(c.text));
      (c.children || []).forEach(walk);
    };
    const g = window.game;
    (g.app.stage.children || []).forEach((c) => {
      if (c && c.constructor && c.constructor.name === 'RubyShopModal') walk(c);
    });
    return out;
  });

  await browser.close();
  const ids = clicks.length ? clicks[clicks.length - 1].ids : [];
  const report = { url, primed, clicks, ids, texts, shot: path.join(OUT, 'ruby-shop-hits.png') };
  fs.writeFileSync(path.join(OUT, 'ruby-shop-hits.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (!primed.targets || primed.targets.length < 3) {
    console.error('FAIL: expected 3 pack buttons');
    process.exit(1);
  }
  if (ids.length < 3) {
    console.error('FAIL: center taps did not fire pack buys', ids);
    process.exit(1);
  }
  console.log('PASS: ruby pack centers are tappable');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
