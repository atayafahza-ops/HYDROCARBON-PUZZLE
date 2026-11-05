// Drives the real app in Chromium to check the 100-level progression shell.
// Start the dev server first: `npm run dev`, then `npm run verify:ui`.
// Override the target with BASE_URL and the screenshot folder with SHOT_DIR.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const APP_URL = process.env.BASE_URL ?? 'http://localhost:5173/HYDROCARBON-PUZZLE/';
const SHOTS = process.env.SHOT_DIR ?? '/tmp/shots';
const KEY = 'carbon-code-save-v1';

mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (label, actual, wanted) => {
  const ok = actual === wanted;
  results.push({ ok, label, actual, wanted });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(44)} got=${JSON.stringify(actual)} want=${JSON.stringify(wanted)}`);
};

function seedSave(through) {
  const levels = {};
  for (let id = 1; id <= through; id += 1) {
    levels[id] = { stars: 3, xp: 200, attempts: 1, hintsUsed: 0, completedAt: 'x', lastPlayedAt: 'x' };
  }
  return JSON.stringify({ version: 1, levels, lastLevel: 1, introSeen: true, settings: {} });
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];

async function open(seedThrough, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.addInitScript(({ key, payload }) => {
    if (payload) localStorage.setItem(key, payload);
  }, { key: KEY, payload: seedThrough ? seedSave(seedThrough) : null });
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await dismissIntro(page);
  return { context, page };
}

async function dismissIntro(page) {
  for (let i = 0; i < 4; i += 1) {
    const next = await page.$('.dialog-next');
    if (!next) return;
    await next.click().catch(() => {});
    await page.waitForTimeout(350);
  }
}

async function openLevel(page, zone, levelId) {
  await page.click('[data-action="levels"]');
  await page.waitForTimeout(600);
  await page.click(`.zone-tab[data-zone="${zone}"]`);
  await page.waitForTimeout(500);
  await page.click(`.level-node[data-level-id="${levelId}"]`);
  await page.waitForTimeout(1600);
}

const levelRecorded = (page, levelId) =>
  page.evaluate(({ key, id }) => {
    const state = JSON.parse(localStorage.getItem(key) ?? '{}');
    return (state.levels?.[id]?.stars ?? 0) > 0;
  }, { key: KEY, id: levelId });

const buildChain = (page, atoms) =>
  page.evaluate((count) => {
    const { scene } = window.__builderDebug;
    for (let i = 0; i < count; i += 1) scene.addCarbon();
    const ids = scene.molecule.nodes.map((node) => node.id);
    scene.setBondOrder(1);
    for (let k = 0; k < ids.length - 1; k += 1) {
      scene.selectedId = ids[k];
      scene.handleAtomClick(ids[k + 1]);
    }
    scene.clearSelection();
    return { atoms: scene.molecule.nodes.length, bonds: scene.molecule.edges.length };
  }, atoms);

// ---------- fresh save: menu copy + sequential gating ----------
try {
  const { context, page } = await open(0);
  const copy = (await page.locator('.menu-btn--violet').innerText()).replace(/\s+/g, ' ');
  check('menu advertises 10 labs', copy.includes('Peta 10 laboratorium'), true);

  await page.click('[data-action="levels"]');
  await page.waitForTimeout(700);
  check('zone tabs', await page.locator('.zone-tab').count(), 10);
  check('zone 1 nodes', await page.locator('.level-node').count(), 10);
  check('zone 1 locked nodes', await page.locator('.level-node.is-locked').count(), 9);
  check('locked zone tabs', await page.locator('.zone-tab.is-locked').count(), 9);
  await page.screenshot({ path: `${SHOTS}/01-levels-fresh.png` });

  const locked = page.locator('.level-node[data-level-id="5"]');
  check('locked node is inert', await locked.evaluate((el) => el.disabled), true);
  await locked.evaluate((el) => el.removeAttribute('disabled'));
  await locked.click({ force: true });
  await page.waitForTimeout(500);
  check('locked level refuses to open', await page.$eval('#app', (el) => el.dataset.route), 'levels');
  await context.close();
} catch (error) { check('zone gating block crashed', String(error).slice(0, 90), 'none'); }

// ---------- deep zone: straight C10 build ----------
try {
  const { context, page } = await open(53);
  await openLevel(page, 'heavy-chain', 54);
  check('route is level', await page.$eval('#app', (el) => el.dataset.route), 'level');

  const built = await buildChain(page, 10);
  check('atoms placed', built.atoms, 10);
  check('bonds formed', built.bonds, 9);
  const readout = (await page.locator('#app').innerText()).replace(/\s+/g, ' ');
  check('inspector reads C10H22', /C\s*10\s*H\s*22/.test(readout), true);
  await page.screenshot({ path: `${SHOTS}/03-stage-c10.png` });

  await page.click('[data-action="check"]');
  await page.waitForTimeout(1600);
  check('L54 straight C10 accepted', await levelRecorded(page, 54), true);
  await page.screenshot({ path: `${SHOTS}/04-result-c10.png` });
  await context.close();
} catch (error) { check('C10 build block crashed', String(error).slice(0, 90), 'none'); }

// ---------- board capacity ----------
try {
  const { context, page } = await open(53);
  await openLevel(page, 'heavy-chain', 54);
  const cap = await page.evaluate(() => {
    const { scene } = window.__builderDebug;
    let toasts = 0;
    const before = scene.hooks.onToast;
    scene.hooks.onToast = (message) => { if (/maksimum/i.test(message)) toasts += 1; before?.(message); };
    for (let i = 0; i < 16; i += 1) scene.addCarbon();
    return { atoms: scene.molecule.nodes.length, toasts };
  });
  check('board fills to MAX_ATOMS', cap.atoms, 12);
  check('cap warns the player', cap.toasts > 0, true);
  await page.screenshot({ path: `${SHOTS}/10-stage-12-atoms.png` });
  await context.close();
} catch (error) { check('board capacity block crashed', String(error).slice(0, 90), 'none'); }

// ---------- grouped-locant name decoder ----------
try {
  const { context, page } = await open(74);
  await openLevel(page, 'isomer-lab', 75);
  const bank = await page.$$eval('[data-token-id]', (els) => els
    .filter((el) => !el.disabled)
    .map((el) => ({ id: el.dataset.tokenId, text: el.innerText.trim() })));

  for (const want of ['2,3,4,5', 'tetrametil', 'heks', '-ana']) {
    const hit = bank.find((token) => token.text === want);
    if (!hit) { check(`bank holds "${want}"`, 'missing', 'present'); continue; }
    await page.click(`[data-token-id="${hit.id}"]`);
    await page.waitForTimeout(150);
  }
  const assembled = (await page.locator('#app').innerText()).replace(/\s+/g, ' ');
  check('slots assemble the grouped locant name', assembled.includes('2,3,4,5-tetrametilheksana'), true);
  await page.screenshot({ path: `${SHOTS}/05-name-decoder.png` });
  await page.click('[data-action="check"]');
  await page.waitForTimeout(1500);
  check('L75 grouped locant accepted', await levelRecorded(page, 75), true);
  await page.screenshot({ path: `${SHOTS}/06-name-result.png` });
  await context.close();
} catch (error) { check('name decoder block crashed', String(error).slice(0, 90), 'none'); }

// ---------- 12-carbon display structure ----------
try {
  const { context, page } = await open(94);
  await openLevel(page, 'master-archive', 95);
  const body = (await page.locator('#app').innerText()).replace(/\s+/g, ' ');
  check('L95 title fixed to C12', body.includes('Cabang Banyak pada C12'), true);
  check('structure svg draws all 12 carbons', await page.$$eval('.structure-svg text', (els) => els.length), 12);
  await page.screenshot({ path: `${SHOTS}/11-level95.png` });
  await context.close();
} catch (error) { check('C12 structure block crashed', String(error).slice(0, 90), 'none'); }

// ---------- mobile shell ----------
try {
  const { context, page } = await open(100, { width: 390, height: 844 });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  await page.click('[data-action="levels"]');
  await page.waitForTimeout(700);
  check('mobile levels fits width', await overflow() <= 1, true);

  const indexState = await page.evaluate(() => {
    const list = document.querySelector('.zone-list');
    const active = document.querySelector('.zone-tab.is-active');
    const lb = list.getBoundingClientRect();
    const ab = active.getBoundingClientRect();
    const peeking = [...document.querySelectorAll('.zone-tab')].filter((tab) => {
      const r = tab.getBoundingClientRect();
      return r.right > lb.left + 4 && r.left < lb.right - 4;
    }).length;
    return {
      activeInView: ab.left >= lb.left - 1 && ab.right <= lb.right + 1,
      peeking,
      tabWidth: Math.round(ab.width),
    };
  });
  check('mobile index scrolls to the active zone', indexState.activeInView, true);
  check('mobile index shows neighbouring zones', indexState.peeking >= 2, true);
  await page.screenshot({ path: `${SHOTS}/07-mobile-levels.png` });

  await page.click('.zone-tab[data-zone="bond-spectrum"]');
  await page.waitForTimeout(600);
  await page.click('.level-node[data-level-id="89"]');
  await page.waitForTimeout(1600);
  check('mobile reaches a deep level', await page.$eval('#app', (el) => el.dataset.route), 'level');
  check('mobile level fits width', await overflow() <= 1, true);

  const tight = await page.evaluate(() => {
    const { scene } = window.__builderDebug;
    for (let i = 0; i < 12; i += 1) scene.addCarbon();
    const nodes = scene.molecule.nodes;
    let closest = Infinity;
    for (let a = 0; a < nodes.length; a += 1) {
      for (let b = a + 1; b < nodes.length; b += 1) {
        closest = Math.min(closest, Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y));
      }
    }
    const inside = nodes.every((n) => n.x > 0 && n.y > 0 && n.x < scene.width && n.y < scene.height);
    return { atoms: nodes.length, closest: Math.round(closest), inside };
  });
  check('mobile board holds 12 atoms', tight.atoms, 12);
  check('mobile atoms stay on canvas', tight.inside, true);
  check('mobile atoms never overlap', tight.closest >= 44, true);
  await page.screenshot({ path: `${SHOTS}/08-mobile-level.png` });

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await dismissIntro(page);
  await page.click('[data-action="codex"]');
  await page.waitForTimeout(800);
  check('mobile codex fits width', await overflow() <= 1, true);
  await page.screenshot({ path: `${SHOTS}/09-mobile-codex.png` });
  await context.close();
} catch (error) { check('mobile block crashed', String(error).slice(0, 90), 'none'); }

console.log(`\nconsole errors: ${errors.length}`);
for (const error of errors.slice(0, 6)) console.log('  ' + error.slice(0, 150));
const failed = results.filter((entry) => !entry.ok).length;
console.log(`checks=${results.length} failures=${failed}`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
