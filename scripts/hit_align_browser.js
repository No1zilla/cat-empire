import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const OUT = process.env.HIT_ALIGN_OUT || '/tmp/hit-align';
fs.mkdirSync(OUT, { recursive: true });

const CASES = [
  { name: 'field-410', viewport: { width: 410, height: 700 }, dpr: 1 },
  { name: 'retina-410', viewport: { width: 410, height: 700 }, dpr: 2 },
  { name: 'vk-desktop-wide', viewport: { width: 1000, height: 700 }, dpr: 1 },
  { name: 'vk-desktop-tall', viewport: { width: 1000, height: 800 }, dpr: 1 },
  { name: 'vk-desktop-resized', viewport: { width: 600, height: 800 }, dpr: 1 },
  { name: 'phone-narrow', viewport: { width: 360, height: 800 }, dpr: 3 }
];

const NAMES = ['buy', 'fill', 'merge'];

function walkName(obj, game) {
  let n = obj;
  while (n) {
    if (n === game.spawnSystem) return 'buy';
    if (n === game.fillAllButton) return 'fill';
    if (n === game.autoMergeButton) return 'merge';
    n = n.parent;
  }
  return (obj && obj.constructor && obj.constructor.name) || 'other';
}

async function dismissOverlays(page) {
  await page.evaluate(() => {
    const g = window.game;
    if (!g || !g.app) return;
    const kill = (c) => {
      const name = c && c.constructor && c.constructor.name;
      if (!name || !/Modal|Tutorial|Overlay|MainMenu/.test(name)) return;
      c.visible = false;
      c.eventMode = 'none';
      c.interactiveChildren = false;
    };
    [...g.app.stage.children].forEach(kill);
    if (g.gameContainer) [...g.gameContainer.children].forEach(kill);
  });
  await page.waitForTimeout(200);
}

async function waitForGame(page) {
  await page.waitForFunction(() => {
    const g = window.game;
    return !!(g && g.app && g.spawnSystem && g.fillAllButton && g.autoMergeButton && g.actionRow);
  }, { timeout: 25000 });
  await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 25000 }).catch(() => {});
  await page.evaluate(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
  });
  await page.waitForTimeout(400);
}

async function probe(page) {
  return page.evaluate(() => {
    const g = window.game;
    const canvas = g.app.canvas;
    const rect = canvas.getBoundingClientRect();
    const screenW = g.app.screen.width;
    const screenH = g.app.screen.height;
    const names = ['buy', 'fill', 'merge'];
    const btns = [g.spawnSystem, g.fillAllButton, g.autoMergeButton];
    const toCss = (world) => ({
      x: rect.left + (world.x / screenW) * rect.width,
      y: rect.top + (world.y / screenH) * rect.height
    });
    const buttons = btns.map((btn, i) => {
      const tl = btn.toGlobal({ x: 0, y: 0 });
      const center = btn.toGlobal({ x: 126 / 2, y: 50 / 2 });
      const right = btn.toGlobal({ x: 126 - 6, y: 25 });
      const left = btn.toGlobal({ x: 6, y: 25 });
      return {
        name: names[i],
        x: btn.x,
        y: btn.y,
        rowY: g.actionRow.y,
        containerX: g.gameContainer.x,
        worldCenter: { x: center.x, y: center.y },
        cssCenter: toCss(center),
        cssLeft: toCss(left),
        cssRight: toCss(right),
        cssTl: toCss(tl)
      };
    });
    const hits = {};
    const boundary = g.app.renderer.events && g.app.renderer.events.rootBoundary;
    const walk = (obj) => {
      let n = obj;
      while (n) {
        if (n === g.spawnSystem) return 'buy';
        if (n === g.fillAllButton) return 'fill';
        if (n === g.autoMergeButton) return 'merge';
        n = n.parent;
      }
      return (obj && obj.constructor && obj.constructor.name) || 'none';
    };
    buttons.forEach((b) => {
      try {
        const target = boundary ? boundary.hitTest(b.worldCenter.x, b.worldCenter.y) : null;
        hits[b.name] = walk(target);
      } catch (e) {
        hits[b.name] = 'error:' + e.message;
      }
    });
    return {
      canvas: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      screen: { w: screenW, h: screenH },
      renderer: { w: g.app.renderer.width, h: g.app.renderer.height, res: g.app.renderer.resolution },
      gameContainerX: g.gameContainer.x,
      buttonRowY: g._buttonRowY,
      buttons,
      hits
    };
  });
}

async function clickAndSee(page, x, y) {
  await page.evaluate(() => {
    window.__lastAction = null;
    const g = window.game;
    if (!g.__hitWrapped) {
      g.__hitWrapped = true;
      const arm = (obj, name) => {
        if (!obj || typeof obj.on !== 'function') return;
        obj.on('pointerdown', () => { window.__lastAction = name; });
      };
      arm(g.spawnSystem, 'buy');
      arm(g.fillAllButton, 'fill');
      arm(g.autoMergeButton, 'merge');
    }
  });
  await page.mouse.click(x, y);
  await page.waitForTimeout(80);
  const fired = await page.evaluate(() => window.__lastAction);
  await dismissOverlays(page);
  return fired;
}

async function markButtons(page, info) {
  await page.evaluate((payload) => {
    document.querySelectorAll('.hit-align-mark').forEach((n) => n.remove());
    payload.buttons.forEach((b) => {
      ['cssLeft', 'cssCenter', 'cssRight'].forEach((key) => {
        const p = b[key];
        const el = document.createElement('div');
        el.className = 'hit-align-mark';
        el.style.cssText = [
          'position:fixed',
          `left:${p.x - 4}px`,
          `top:${p.y - 4}px`,
          'width:8px',
          'height:8px',
          'border-radius:50%',
          'background:#ff2d55',
          'border:1px solid #fff',
          'z-index:999999',
          'pointer-events:none'
        ].join(';');
        document.body.appendChild(el);
      });
    });
  }, info);
}

async function runCase(browser, url, spec) {
  const context = await browser.newContext({
    viewport: spec.viewport,
    deviceScaleFactor: spec.dpr
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cat_empire_tutorial_done', '1');
      localStorage.setItem('cat_empire_last_timestamp', String(Date.now()));
    } catch (e) {}
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.log(`[${spec.name}] pageerror`, err.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForGame(page);
  await dismissOverlays(page);

  const info = await probe(page);
  const shot = path.join(OUT, `${spec.name}-field.png`);
  await page.screenshot({ path: shot, fullPage: true });
  const row = info.buttons[0];
  if (row) {
    const clipY = Math.max(0, Math.floor(row.cssTl.y - 12));
    const clipH = 74;
    await page.screenshot({
      path: path.join(OUT, `${spec.name}-row.png`),
      clip: {
        x: Math.max(0, Math.floor(info.canvas.x)),
        y: clipY,
        width: Math.min(spec.viewport.width, Math.ceil(info.canvas.w || spec.viewport.width)),
        height: clipH
      }
    }).catch(() => {});
  }
  for (const b of info.buttons) {
    const size = 48;
    await page.screenshot({
      path: path.join(OUT, `${spec.name}-${b.name}-center.png`),
      clip: {
        x: Math.max(0, Math.floor(b.cssCenter.x - size / 2)),
        y: Math.max(0, Math.floor(b.cssCenter.y - size / 2)),
        width: size,
        height: size
      }
    }).catch(() => {});
  }
  await markButtons(page, info);
  const marked = path.join(OUT, `${spec.name}-marks.png`);
  await page.screenshot({ path: marked, fullPage: true });

  const clicks = [];
  for (const b of info.buttons) {
    for (const [spot, pt] of [
      ['left', b.cssLeft],
      ['center', b.cssCenter],
      ['right', b.cssRight]
    ]) {
      const fired = await clickAndSee(page, pt.x, pt.y);
      clicks.push({ button: b.name, spot, fired, x: pt.x, y: pt.y });
      await page.waitForTimeout(80);
    }
  }

  const after = path.join(OUT, `${spec.name}-after-clicks.png`);
  await page.screenshot({ path: after, fullPage: true });

  await context.close();
  return { spec, info, clicks, shots: { shot, marked, after } };
}

function summarize(result) {
  const { spec, info, clicks } = result;
  const pixiHitsWrong = NAMES.some((n) => {
    const got = info.hits[n];
    return got && got !== n && !String(got).startsWith('error');
  });
  const clickFails = clicks.filter((c) => c.fired !== c.button);
  return {
    name: spec.name,
    viewport: spec.viewport,
    dpr: spec.dpr,
    canvas: info.canvas,
    screen: info.screen,
    renderer: info.renderer,
    gameContainerX: info.gameContainerX,
    pixiHits: info.hits,
    pixiHitsOk: !pixiHitsWrong,
    clickFails,
    clicksOk: clickFails.length === 0
  };
}

const url = process.argv[2] || 'http://127.0.0.1:5173/';

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const results = [];
for (const spec of CASES) {
  console.log(`\n=== ${spec.name} ${spec.viewport.width}x${spec.viewport.height} dpr=${spec.dpr} ===`);
  const result = await runCase(browser, url, spec);
  results.push(result);
  const sum = summarize(result);
  console.log(JSON.stringify(sum, null, 2));
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results.map(summarize), null, 2));
const failed = results.map(summarize).filter((s) => !s.pixiHitsOk || !s.clicksOk);
if (failed.length) {
  console.error('\nFAILED', failed.map((f) => f.name).join(', '));
  process.exit(1);
}
console.log('\nALL VIEWPORTS: center/edge taps match the drawn buttons');
