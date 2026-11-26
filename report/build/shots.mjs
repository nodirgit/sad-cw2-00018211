// Phone-screen screenshots for the report (one screen each, framed on what the figure shows).
// Needs the prototype's dev server running (cd prototype; npm run dev) and Chrome or Edge.
// Usage (from D:\SAD_CW2):  node report/build/shots.mjs   → report/build/img/*.png
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../prototype/package.json'));
const puppeteer = require('puppeteer-core');
const out = path.resolve(here, 'img');
mkdirSync(out, { recursive: true });

const url = process.env.APP_URL ?? 'http://localhost:5173';
const exe = [process.env.BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--lang=en-GB'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const pause = (ms = 250) => new Promise((r) => setTimeout(r, ms));
async function click(text, nth = 0) {
  const hs = await page.$$('button');
  const exact = [], part = [];
  for (const h of hs) {
    const t = (await h.evaluate((el) => el.textContent ?? '')).trim();
    if (t === text) exact.push(h); else if (t.includes(text)) part.push(h);
  }
  const m = (exact.length ? exact : part)[nth];
  if (!m) throw new Error(`No button "${text}"`);
  await m.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await m.click();
  await pause();
}
async function type(sel, text) {
  await page.click(sel, { clickCount: 3 });
  await page.type(sel, text);
}
/** Scroll so the element matching the text sits in view (block: start | center | end), then shoot the screen. */
async function shot(name, focusText, block = 'center') {
  await page.evaluate(
    (t, b) => {
      window.scrollTo(0, 0);
      if (!t) return;
      const el = [...document.querySelectorAll('main *')].reverse().find((e) => e.childElementCount < 4 && (e.textContent ?? '').includes(t));
      el?.scrollIntoView({ block: b });
    },
    focusText ?? null,
    block,
  );
  await pause(350);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log('saved', name);
}

await page.goto(url, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });

for (const d of '1234') await click(d);
await pause(400);
await click('Turn on');
await pause(1000);
await shot('r1-main');

await click('Log death');
await click('Save');
await click('Save');
await shot('r2-duplicate', 'Possible duplicate', 'center');
await click('‹ Back');

await click('Feed delivery');
await click('House 2');
await click('Demo Feed Factory A');
await type('#kg', '1500');
await type('#cost', '9750000');
await click('Save delivery');
await shot('r3-feed', 'Feed per bird in this batch', 'center');
await click('‹ Back');

await click('Slaughter');
await click("Start tonight's session");
await type('#count', '1100');
await click('Record count');
await type('input[aria-label="New count"]', '1080');
await type('input[aria-label="Note"]', 'Recount at dawn: 20 birds counted twice');
await click('Save correction');
await shot('r4-slaughter', 'Count history', 'center');

await click('Bazaar weights cross-check');
await type('#agent', '2376');
await click('Save');
await shot('r5-pending', 'PENDING', 'center');
await type('#rep', '2376');
await click('Save');
await shot('r6-match', 'MATCH', 'center');

await click('Expenses');
await click('Fill the form by voice');
await click('Bir narsa oldim');
await shot('r7-voice', 'not sure', 'center');

await click('Main');
await click('Batch profit');
await shot('r8-profit');

await click('Profile');
await click('Houses');
await shot('r9-houses');
await click('‹ Back');
await click('Log out');
for (const d of '1111') await click(d);
await pause(400);
await click('Feed delivery');
await shot('r10-worker-feed', 'Quantity (kg)', 'center');

await browser.close();
if (errors.length) {
  console.error('Browser errors:\n' + errors.join('\n'));
  process.exit(1);
}
