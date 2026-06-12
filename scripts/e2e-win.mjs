// 回归脚本：自动通关第 1 关，验证「通关 → Splash + 烟花 → 自动进入下一关」全链路
// 用法：npm i --no-save puppeteer-core && node scripts/e2e-win.mjs [url]
// 输出：scripts/_e2e_splash.png（通关瞬间）/ scripts/_e2e_after.png（自动进下一关后）
import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.argv[2] || 'http://localhost:5199/?phase=game&lv=0';

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: 'new',
  args: ['--window-size=470,705'], defaultViewport: { width: 470, height: 705 },
});
const page = await browser.newPage();

const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.message + '\n' + (e.stack || '')));
page.on('console', m => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));

// 定位棋盘（boardRef div：列向 flex，5 行 × 5 格）
const found = await page.evaluate(() => {
  for (const d of document.querySelectorAll('div')) {
    if (d.children.length === 5 &&
        [...d.children].every(ch => ch.tagName === 'DIV' && ch.children.length === 5) &&
        getComputedStyle(d).flexDirection === 'column') {
      d.setAttribute('data-e2e-board', '1');
      return true;
    }
  }
  return false;
});
if (!found) { console.log('FAIL: board not found'); await browser.close(); process.exit(1); }
const cellAt = (r, c) => `[data-e2e-board] > div:nth-child(${r + 1}) > div:nth-child(${c + 1})`;

// 首铲（安全，触发布雷），随后从 React fiber 读出雷位
await page.click(cellAt(0, 0));
await new Promise(r => setTimeout(r, 600));
const mines = await page.evaluate(() => {
  const el = document.querySelector('[data-e2e-board]');
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
  let fiber = el && key ? el[key] : null;
  while (fiber) {
    for (const f of [fiber, fiber.alternate]) {
      let hook = f && f.memoizedState, guard = 0;
      while (hook && guard++ < 200) {
        const s = hook.memoizedState;
        if (Array.isArray(s) && Array.isArray(s[0]) && s[0][0] && typeof s[0][0].mine === 'boolean') {
          const out = [];
          s.forEach((row, r) => row.forEach((cell, c) => { if (cell.mine) out.push([r, c]); }));
          if (out.length > 0) return out;
        }
        hook = hook.next;
      }
    }
    fiber = fiber.return;
  }
  return null;
});
if (!mines) { console.log('FAIL: mines not found'); await browser.close(); process.exit(1); }
console.log('mines at:', JSON.stringify(mines));
const mineSet = new Set(mines.map(([r, c]) => r + ',' + c));

// 点开全部安全格 → 通关
for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
  if (!mineSet.has(r + ',' + c)) {
    await page.click(cellAt(r, c)).catch(() => {});
    await new Promise(r2 => setTimeout(r2, 60));
  }
}
await new Promise(r => setTimeout(r, 1100));
await page.screenshot({ path: 'scripts/_e2e_splash.png' });

await new Promise(r => setTimeout(r, 4000)); // 越过 2.8s 自动进下一关
await page.screenshot({ path: 'scripts/_e2e_after.png' });
const root = await page.evaluate(() => {
  const el = document.getElementById('root');
  return { mounted: !!(el && el.children.length), text: document.body.innerText.slice(0, 80) };
});
await browser.close();

console.log('after advance:', JSON.stringify(root));
if (!root.mounted) { console.log('FAIL: app unmounted (white screen)'); process.exit(1); }
if (errors.length) { console.log('FAIL: page errors\n' + errors.join('\n---\n')); process.exit(1); }
console.log('PASS');
