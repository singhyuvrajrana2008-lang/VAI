/**
 * Headless browser QA for RidgeWatch.
 *
 * Verifies, against a running dev server, the things static tests cannot:
 * runtime console/page errors, horizontal overflow at phone widths, page
 * titles, and an end-to-end assessment request. It also saves screenshots.
 *
 * Requirements: `npx playwright install chromium` and the `playwright` package
 * resolvable from the repository root — for example
 *   npm i --no-save playwright
 * (node_modules/ is git-ignored, so nothing is added to package.json). On a
 * minimal container the browser may also need its shared libraries and a
 * fontconfig file; see the README troubleshooting note.
 *
 * Usage:
 *   node scripts/browser_qa.mjs [baseUrl]
 * Exit code 0 = no defects found, 1 = at least one defect recorded.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const OUT = new URL('../artifacts/qa/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  '/',
  '/overview',
  '/catchments',
  '/catchments/demo-sector-a',
  '/rainfall',
  '/warnings?catchment=demo-sector-a',
  '/assessments',
  '/assessments/new',
  '/data-health',
  '/methodology',
  '/history',
  '/settings',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/no-such-route',
];

const SHOTS = ['/', '/overview', '/assessments', '/data-health', '/rainfall', '/warnings', '/methodology'];
const PHONE = { width: 360, height: 780 };
const DESKTOP = { width: 1440, height: 900 };

const defects = [];
const record = (route, kind, detail) => defects.push({ route, kind, detail });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: DESKTOP });
const page = await context.newPage();

let current = '';
page.on('console', (msg) => {
  if (msg.type() === 'error') record(current, 'console.error', msg.text().slice(0, 300));
});
page.on('pageerror', (err) => record(current, 'pageerror', String(err).slice(0, 300)));

const summary = [];

for (const route of ROUTES) {
  current = route;
  const response = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
  if (!response || response.status() >= 400) {
    record(route, 'http', `status ${response ? response.status() : 'none'}`);
  }
  const title = await page.title();
  const h1 = await page.locator('h1').first().textContent().catch(() => null);
  if (!title || title === 'RidgeWatch') record(route, 'title', `unexpected document title: "${title}"`);
  if (!(h1 || '').trim()) record(route, 'missing-h1', 'no <h1> on the rendered page');

  // Phone width: can the viewport actually scroll sideways? (scrollWidth alone
  // reports table content that is intentionally clipped inside .table-scroll.)
  await page.setViewportSize(PHONE);
  await page.waitForTimeout(250);
  const overflow = await page.evaluate(() => {
    window.scrollTo(600, 0);
    const scrolled = window.scrollX;
    window.scrollTo(0, 0);
    return {
      scrolled,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
  if (overflow.scrolled > 1) {
    record(
      route,
      'overflow-360',
      `viewport scrolled ${overflow.scrolled}px (scrollWidth ${overflow.scrollWidth} > ${overflow.innerWidth})`,
    );
  }
  await page.setViewportSize(DESKTOP);
  summary.push({ route, status: response ? response.status() : 0, title, h1: (h1 || '').trim().slice(0, 60) });
}

// End-to-end: request an assessment from the overview.
current = '/overview (assessment flow)';
try {
  await page.goto(BASE + '/overview', { waitUntil: 'networkidle' });
  const select = page.locator('#catchment-select');
  if (await select.count()) {
    const first = await select.locator('option').nth(0).getAttribute('value');
    if (first) await select.selectOption(first);
  }
  const btn = page
    .getByRole('button', { name: /run experimental assessment|request assessment/i })
    .first();
  await btn.click();
  await page.waitForSelector('.assessment-panel:not(.assessment-panel--empty)', { timeout: 15000 });
  const scoreText = await page.locator('.assessment-panel h2').first().textContent();
  summary.push({ route: 'assessment-flow', status: 200, title: 'assessment panel rendered', h1: (scoreText || '').trim() });

  // Follow the evidence link to the assessment detail page.
  const detailHref = await page
    .locator('.assessment-panel a[href^="/assessments/"]')
    .first()
    .getAttribute('href');
  if (detailHref) {
    await page.goto(BASE + detailHref, { waitUntil: 'networkidle' });
    const detailH1 = await page.locator('h1').first().textContent();
    const detailTitle = await page.title();
    summary.push({ route: detailHref, status: 200, title: detailTitle, h1: (detailH1 || '').trim().slice(0, 60) });
    if (detailTitle === 'RidgeWatch') record(detailHref, 'title', 'generic document title on the evidence report');
    if (!(detailH1 || '').trim()) record(detailHref, 'missing-h1', 'evidence report has no <h1>');
  } else {
    record('/overview (assessment flow)', 'flow', 'no evidence link on the assessment panel');
  }
} catch (error) {
  record('/overview (assessment flow)', 'flow', String(error).slice(0, 300));
}

// Keyboard focus must be visible on the first interactive control.
current = '/overview (keyboard focus)';
try {
  await page.goto(BASE + '/overview', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { tag: 'body' };
    const s = getComputedStyle(el);
    return { tag: el.tagName, outline: `${s.outlineStyle} ${s.outlineWidth}`, shadow: s.boxShadow };
  });
  if (focus.tag === 'body') {
    record('/overview (keyboard focus)', 'a11y', 'first Tab press did not move focus');
  } else if (focus.outline.startsWith('none') && (!focus.shadow || focus.shadow === 'none')) {
    record('/overview (keyboard focus)', 'a11y', `no visible focus indicator on ${focus.tag}`);
  }
  summary.push({ route: 'keyboard-focus', status: 200, title: 'focus indicator check', h1: JSON.stringify(focus) });
} catch (error) {
  record('/overview (keyboard focus)', 'flow', String(error).slice(0, 300));
}

// API failure must render a recoverable error panel, never a blank page.
async function checkApiFailure(kind, handler) {
  current = kind;
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const p = await ctx.newPage();
  p.on('pageerror', (err) => record(kind, 'pageerror', String(err).slice(0, 300)));
  await p.route('**/api/v1/**', handler);
  try {
    await p.goto(BASE + '/overview', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await p.waitForSelector('.state-panel--error', { timeout: 15000 });
    const text = (await p.locator('.state-panel--error').first().textContent()) || '';
    if (!/retry|again|unavailable|failed|try/i.test(text)) {
      record(kind, 'error-state', `error panel has no recovery action: ${text.slice(0, 80)}`);
    }
    summary.push({ route: kind, status: 200, title: 'error panel rendered', h1: text.trim().slice(0, 60) });
  } catch (error) {
    record(kind, 'flow', String(error).slice(0, 300));
  }
  await ctx.close();
}

await checkApiFailure('api-outage', (route) => route.abort());
await checkApiFailure('api-500', (route) =>
  route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: { message: 'Internal error', request_id: 'qa-simulated' } }),
  }),
);

// Screenshots at both widths.
for (const route of SHOTS) {
  current = route + ' (screenshot)';
  const name = route === '/' ? 'landing' : route.replace(/\//g, '_').replace(/^_/, '');
  await page.setViewportSize(DESKTOP);
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: false });
  await page.setViewportSize(PHONE);
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}${name}-360.png`, fullPage: false });
}

await browser.close();

fs.writeFileSync(`${OUT}report.json`, JSON.stringify({ summary, defects }, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log(`\ndefects: ${defects.length}`);
for (const d of defects) console.log(` - [${d.kind}] ${d.route}: ${d.detail}`);
process.exit(defects.length ? 1 : 0);
