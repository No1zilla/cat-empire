import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const OUT = process.env.LB_BROWSER_OUT || '/opt/cursor/artifacts';
fs.mkdirSync(OUT, { recursive: true });

function collectTexts(root) {
  const texts = [];
  const walk = (c) => {
    if (!c) return;
    if (c.text != null && String(c.text).trim()) texts.push(String(c.text));
    (c.children || []).forEach(walk);
  };
  walk(root);
  return texts;
}

async function main() {
  const url = process.argv[2] || 'http://127.0.0.1:5173/';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 760 } });
  const failed = [];
  page.on('requestfailed', (req) => {
    if (req.url().includes('leaderboard')) {
      failed.push({ url: req.url(), err: req.failure() && req.failure().errorText });
    }
  });
  const lbResps = [];
  page.on('response', async (res) => {
    if (!res.url().includes('leaderboard')) return;
    lbResps.push({ url: res.url(), status: res.status() });
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => !!(window.game && typeof window.game.showLeaderboard === 'function'), {
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
    g.showLeaderboard();
  });
  await page.waitForTimeout(2800);

  const info = await page.evaluate(() => {
    const texts = [];
    const walk = (c) => {
      if (!c) return;
      if (c.text != null && String(c.text).trim()) texts.push(String(c.text));
      (c.children || []).forEach(walk);
    };
    const g = window.game;
    let modalName = '';
    (g.app.stage.children || []).forEach((c) => {
      const name = c && c.constructor && c.constructor.name;
      if (name && /Leaderboard/.test(name)) {
        modalName = name;
        walk(c);
      }
    });
    if (!texts.length) {
      (g.app.stage.children || []).forEach(walk);
    }
    return { modalName, texts };
  });

  const shot = path.join(OUT, 'leaderboard-browser.png');
  await page.screenshot({ path: shot, fullPage: true });
  await browser.close();

  const joined = info.texts.join('\n');
  const hasError = /Топ не загрузился/.test(joined);
  const names = info.texts.filter((t) => /ур\./.test(t));
  const report = {
    url,
    modalName: info.modalName,
    texts: info.texts,
    lbResps,
    failed,
    hasError,
    levelRows: names.length,
    shot
  };
  fs.writeFileSync(path.join(OUT, 'leaderboard-browser.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (hasError) {
    console.error('FAIL: leaderboard still shows load error');
    process.exit(1);
  }
  if (names.length < 5) {
    console.error('FAIL: expected at least 5 leaderboard rows');
    process.exit(1);
  }
  console.log('PASS: leaderboard loaded in browser');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
