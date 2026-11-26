// Takes a phone-sized screenshot of every screen by clicking through the app like a user.
// Needs the dev server running (npm run dev) and Chrome or Edge installed.
// Usage: npm run screenshots   (optional: APP_URL, BROWSER_PATH)
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '..', 'screenshots');
mkdirSync(out, { recursive: true });

const url = process.env.APP_URL ?? 'http://localhost:5173';
const candidates = [
  process.env.BROWSER_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) throw new Error('Chrome or Edge not found; set BROWSER_PATH.');

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--lang=en-GB'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const pause = (ms = 250) => new Promise((r) => setTimeout(r, ms));
let n = 0;
async function shot(name, fullPage = false) {
  n += 1;
  const file = path.join(out, `${String(n).padStart(2, '0')}-${name}.png`);
  // A full-page shot would draw the sticky bottom bar mid-page: put it at the end of the page instead.
  if (fullPage) await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.tabbar')?.style.setProperty('position', 'static'); });
  await pause(300);
  await page.screenshot({ path: file, fullPage });
  if (fullPage) await page.evaluate(() => document.querySelector('.tabbar')?.style.removeProperty('position'));
  console.log('saved', path.basename(file));
}
async function click(text, nth = 0) {
  const handles = await page.$$('button');
  const exact = [];
  const partial = [];
  for (const h of handles) {
    const t = (await h.evaluate((el) => el.textContent ?? '')).trim();
    if (t === text) exact.push(h);
    else if (t.includes(text)) partial.push(h);
  }
  const matches = exact.length ? exact : partial;
  if (!matches[nth]) throw new Error(`No button "${text}"`);
  await matches[nth].evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await matches[nth].click();
  await pause();
}
async function type(selector, text) {
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, text);
}
async function login(pin) {
  for (const d of pin) await click(d);
  await pause(400);
}
const top = () => page.evaluate(() => window.scrollTo(0, 0));

// Fresh demo data
await page.goto(url, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });

await shot('login');
await login('1234');
await shot('director-home', true);

// FR-08: switch House 2's light
await click('Turn on');
await pause(1000);
await top();
await shot('light-switched');

// FR-01: log a death twice → duplicate warning
await click('Log death');
await click('Save');
await shot('log-death-saved');
await click('Save');
await shot('log-death-duplicate', true);
await click('Edit');
await shot('log-death-edit', true);
await click('Cancel');
await click('‹ Back');

// FR-02: feed delivery with cost
await click('Feed delivery');
await click('House 2');
await click('Demo Feed Factory A');
await type('#kg', '1500');
await type('#cost', '9750000');
await click('Save delivery');
await shot('feed-delivery', true);
await click('‹ Back');

// FR-04 / NFR-04: Slaughter section — new session, head count → pay, correction with note
await click('Slaughter');
await click("Start tonight's session");
await type('#count', '1100');
await click('Record count');
await shot('slaughter-payment');
await type('input[aria-label="New count"]', '1080');
await type('input[aria-label="Note"]', 'Recount at dawn: 20 birds counted twice');
await click('Save correction');
await shot('slaughter-correction', true);

// FR-05: cross-check for that session
await click('Bazaar weights cross-check');
await type('#agent', '2376');
await click('Save');
await top();
await shot('crosscheck-pending', true);
await type('#rep', '2350');
await click('Save');
await top();
await shot('crosscheck-mismatch');
await type('#rep', '2376');
await click('Replace', 1);
await top();
await shot('crosscheck-match', true);
await click('Record sale');
await shot('crosscheck-sold', true);

// FR-03 / FR-06: Expenses section — typed form, voice helper fills it, unsure fields amber
await click('Expenses');
await shot('expense-entry', true);
await click('Fill the form by voice');
await click('Kecha veterinarga 150 ming');
await shot('expense-voice-filled', true);
await click('Bir narsa oldim');
await shot('expense-voice-unsure', true);

// FR-03: Sales section — direct sale (shop, Nurata seller, client), then the latest sales
await click('Sales');
await click('Direct sale');
await type('#kg', '150');
await click('Save sale');
await shot('direct-sale', true);
await click('‹ Back');
await shot('sales', true);

// FR-03: batch profit, both houses (Main section)
await click('Main');
await click('Batch profit');
await shot('profit-house-1', true);
await click('House 2');
await top();
await shot('profit-house-2', true);

// NFR-05 / FR-07: Profile section — settings grouped like a phone's settings
await click('Profile');
await shot('profile', true);
await click('Houses');
await shot('settings-houses', true);
await click('House 2');
await shot('settings-house', true);
await click('‹ Back');
await click('Add a house');
await shot('settings-add-house', true);
await click('‹ Back');
await click('‹ Back');
await click('Partners');
await shot('settings-partners', true);
await click('Add a partner');
await shot('settings-partner-new', true);
await click('‹ Back');
await click('Nurata seller');
await shot('settings-partner', true);
await click('‹ Back');
await click('‹ Back');
await click('Expense categories');
await type('input[aria-label="Category name"]', 'Electricity');
await click('Add category');
await shot('settings-expense-categories', true);
await click('‹ Back');

// NFR-03: worker sees no money and only the Main and Profile sections
await click('Log out');
await login('1111');
await shot('worker-home', true);
await click('Feed delivery');
await shot('worker-feed-no-cost', true);
await click('Profile');
await shot('worker-profile', true);

await browser.close();
if (errors.length) {
  console.error('Browser errors:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`Done: ${n} screenshots in ${out}`);
