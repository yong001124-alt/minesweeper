import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.argv[2] || 'https://yong001124-alt.github.io/minesweeper/?phase=game&lv=0';

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: 'new',
  args: ['--window-size=470,705', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 470, height: 705 },
});
const page = await browser.newPage();

const sndReqs = [];
page.on('response', r => { if (r.url().includes('sounds/')) sndReqs.push(r.status() + ' ' + r.url()); });
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.evaluateOnNewDocument(() => {
  window.__audio = { ctxs: 0, starts: 0, states: [] };
  const AC = window.AudioContext;
  window.AudioContext = class extends AC {
    constructor(...a) { super(...a); window.__audio.ctxs++; window.__audio.states.push(this); }
  };
  const origStart = AudioScheduledSourceNode.prototype.start;
  AudioScheduledSourceNode.prototype.start = function (...a) { window.__audio.starts++; return origStart.apply(this, a); };
});

await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));

// 找棋盘并点几个格子（触发 initAudio + playReveal/playClick）
await page.evaluate(() => {
  for (const d of document.querySelectorAll('div')) {
    if (d.children.length === 5 && [...d.children].every(ch => ch.children.length === 5) &&
        getComputedStyle(d).flexDirection === 'column') { d.setAttribute('data-b', '1'); return; }
  }
});
for (const [r, c] of [[0, 0], [4, 4], [0, 4], [4, 0]]) {
  await page.click(`[data-b] > div:nth-child(${r + 1}) > div:nth-child(${c + 1})`).catch(() => {});
  await new Promise(r2 => setTimeout(r2, 400));
}
await new Promise(r => setTimeout(r, 1500));

const audio = await page.evaluate(() => ({
  ctxs: window.__audio.ctxs,
  starts: window.__audio.starts,
  states: window.__audio.states.map(c => c.state),
}));
console.log('URL:', URL);
console.log('AudioContext created:', audio.ctxs, '| state:', JSON.stringify(audio.states));
console.log('sound nodes started:', audio.starts);
console.log('mp3 requests:', sndReqs.length ? sndReqs.join('\n  ') : '(none)');
console.log('page errors:', errors.length ? errors.join(' | ') : '(none)');
await browser.close();
