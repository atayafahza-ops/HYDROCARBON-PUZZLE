// Drives the real app in Chromium to verify the Addition Lab mode end to end.
// Start the dev server first: `npm run dev`, then `node scripts/verify-addition-ui.mjs`.
// Override the target with BASE_URL, the screenshot folder with SHOT_DIR,
// and the browser binary with CHROME_PATH (falls back to installed Chrome/Edge).
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const APP_URL = process.env.BASE_URL ?? 'http://localhost:5173/HYDROCARBON-PUZZLE/';
const SHOTS = process.env.SHOT_DIR ?? '/tmp/shots-addition';
const KEY = 'carbon-code-save-v1';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const executablePath = CANDIDATES.find((path) => existsSync(path));

mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (label, actual, wanted) => {
  const ok = actual === wanted;
  results.push({ ok, label, actual, wanted });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(48)} got=${JSON.stringify(actual)} want=${JSON.stringify(wanted)}`);
};

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];

async function open(viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  for (let i = 0; i < 4; i += 1) {
    const next = await page.$('.dialog-next');
    if (!next) break;
    await next.click().catch(() => {});
    await page.waitForTimeout(350);
  }
  return { context, page };
}

const route = (page) => page.$eval('#app', (el) => el.dataset.route);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const visible = (page, selector) => page.locator(`${selector}:visible`).first();

async function gotoExperiment(page, experimentId) {
  await page.click('[data-action="addition"]');
  await page.waitForTimeout(500);
  await page.click('[data-action="map"]');
  await page.waitForTimeout(500);
  await page.click(`.level-node[data-experiment-id="${experimentId}"]`);
  await page.waitForTimeout(600);
  await page.click('[data-start]');
  await page.waitForFunction(() => window.__builderDebug?.scene?.ready === true, null, { timeout: 15000 });
  await page.waitForTimeout(400);
}

const saveState = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), KEY);

// ---------- desktop: mode entry, map gating, briefing ----------
try {
  const { context, page } = await open();
  check('menu has Addition Lab entry', await page.locator('[data-action="addition"]').count(), 1);
  const badge = (await page.locator('[data-action="addition"]').innerText()).replace(/\s+/g, ' ');
  check('entry is marked new', badge.includes('BARU'), true);

  await page.click('[data-action="addition"]');
  await page.waitForTimeout(600);
  check('addition menu route', await route(page), 'addition');
  const hero = (await page.locator('.addition-screen').innerText()).replace(/\s+/g, ' ');
  check('hero names the mode', /Addition Lab/i.test(hero) && /Reaction Protocol/i.test(hero), true);
  check('rank chip starts junior', (await page.locator('.rank-chip').innerText()).includes('Junior'), true);
  await page.screenshot({ path: `${SHOTS}/01-addition-menu.png` });

  await page.click('[data-action="map"]');
  await page.waitForTimeout(600);
  check('map route', await route(page), 'addition-map');
  check('eight zones', await page.locator('.zone-tab').count(), 8);
  check('five experiments per zone', await page.locator('.level-node').count(), 5);
  check('AL-02 locked on fresh save', await page.locator('.level-node[data-experiment-id="AL-02"]').evaluate((el) => el.disabled), true);
  check('seven zones locked', await page.locator('.zone-tab.is-locked').count(), 7);
  await page.screenshot({ path: `${SHOTS}/02-addition-map.png` });

  await page.click('.level-node[data-experiment-id="AL-01"]');
  await page.waitForTimeout(600);
  check('briefing route', await route(page), 'addition-briefing');
  check('briefing draws reactant svg', await page.locator('.briefing-mol .structure-svg').count() >= 2, true);
  await page.screenshot({ path: `${SHOTS}/03-addition-briefing.png` });
  await context.close();
} catch (error) { check('desktop entry block crashed', String(error).slice(0, 120), 'none'); }

// ---------- desktop: AL-01 hydrogenation full loop ----------
try {
  const { context, page } = await open();
  await gotoExperiment(page, 'AL-01');
  check('workspace route', await route(page), 'addition-lab');

  const reactant = await page.evaluate(() => {
    const { scene } = window.__builderDebug;
    return { atoms: scene.molecule.nodes.length, order: scene.molecule.edges[0]?.order };
  });
  check('reactant ethene loaded', reactant.atoms, 2);
  check('reactant has C=C', reactant.order, 2);

  await page.click('[data-action="check"]');
  await page.waitForTimeout(400);
  check('check before reaction is refused', await route(page), 'addition-lab');

  await visible(page, '[data-reagent="H2"]').click();
  await visible(page, '[data-catalyst="Ni"]').click();
  await visible(page, '[data-action="run"]').click();
  await page.waitForTimeout(500);
  check('run button locks after reaction', await visible(page, '[data-action="run"]').evaluate((el) => el.disabled), true);
  const feedback = (await page.locator('[data-intel]').innerText()).replace(/\s+/g, ' ');
  check('reaction feedback is positive', /Reaksi siap/.test(feedback), true);
  await page.screenshot({ path: `${SHOTS}/04-addition-workspace.png` });

  const built = await page.evaluate(() => {
    const { scene } = window.__builderDebug;
    scene.setBondOrder(1);
    scene.selectedId = scene.molecule.nodes[0].id;
    scene.handleAtomClick(scene.molecule.nodes[1].id);
    scene.clearSelection();
    return { order: scene.molecule.edges[0]?.order, formula: scene.getAnalysis().formula };
  });
  check('product reduced to C-C', built.order, 1);
  check('inspector reads C2H6', built.formula, 'C2H6');

  await page.click('[data-action="check"]');
  await page.waitForTimeout(700);
  check('success CTA appears', await page.locator('[data-action="view-result"]').count(), 1);
  const state = await saveState(page);
  check('AL-01 recorded in save', state.additionLab?.results?.['AL-01']?.stars, 3);
  check('perfect score recorded', state.additionLab?.results?.['AL-01']?.score, 100);
  check('campaign untouched by Addition Lab', Object.keys(state.levels ?? {}).length, 0);

  await page.click('[data-action="view-result"]');
  await page.waitForTimeout(700);
  check('result route', await route(page), 'addition-result');
  const report = (await page.locator('#app').innerText()).replace(/\s+/g, ' ');
  check('report shows breakdown', /reagen/i.test(report) && /struktur/i.test(report), true);
  check('report shows mechanism steps', await page.locator('.mechanism-list li').count() >= 2, true);
  await page.screenshot({ path: `${SHOTS}/05-addition-result.png` });

  await page.click('[data-action="next"]');
  await page.waitForTimeout(600);
  check('next experiment opens', await route(page), 'addition-briefing');
  check('AL-02 unlocked after AL-01', (await saveState(page)).additionLab.results['AL-01'].completed, true);
  await context.close();
} catch (error) { check('AL-01 loop block crashed', String(error).slice(0, 120), 'none'); }

// ---------- desktop: AL-02 heteroatom build (Br) ----------
try {
  const { context, page } = await open();
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({
      version: 1, levels: {}, lastLevel: 1, introSeen: true, settings: {},
      additionLab: { results: { 'AL-01': { completed: true, score: 100, stars: 3, xp: 165 } }, lastExperiment: 'AL-01', introSeen: true },
    }));
  }, KEY);
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await gotoExperiment(page, 'AL-02');

  await visible(page, '[data-reagent="Br2"]').click();
  await visible(page, '[data-action="run"]').click();
  await page.waitForTimeout(400);

  const built = await page.evaluate(() => {
    const { scene } = window.__builderDebug;
    const [c0, c1] = scene.molecule.nodes;
    scene.setBondOrder(1);
    scene.selectedId = c0.id;
    scene.handleAtomClick(c1.id);
    scene.clearSelection();
    scene.addAtom('Br');
    scene.handleAtomClick(c0.id);
    scene.clearSelection();
    scene.addAtom('Br');
    scene.handleAtomClick(c1.id);
    scene.clearSelection();
    const analysis = scene.getAnalysis();
    return { atoms: scene.molecule.nodes.length, formula: analysis.formula, bromine: analysis.elementCounts.Br ?? 0 };
  });
  check('two Br atoms placed', built.bromine, 2);
  check('inspector reads C2H4Br2', built.formula, 'C2H4Br2');
  const inspectorText = (await page.locator('[data-inspector]').innerText()).replace(/\s+/g, ' ');
  check('inspector shows Br count cell', /Br\s*2/.test(inspectorText), true);

  await page.click('[data-action="check"]');
  await page.waitForTimeout(700);
  check('dibromide accepted', await page.locator('[data-action="view-result"]').count(), 1);
  check('AL-02 recorded', (await saveState(page)).additionLab?.results?.['AL-02']?.completed, true);
  await page.screenshot({ path: `${SHOTS}/06-addition-bromine.png` });
  await context.close();
} catch (error) { check('AL-02 heteroatom block crashed', String(error).slice(0, 120), 'none'); }

// ---------- desktop: wrong product gets an educational rejection ----------
try {
  const { context, page } = await open();
  await gotoExperiment(page, 'AL-01');
  await visible(page, '[data-reagent="H2"]').click();
  await visible(page, '[data-catalyst="Ni"]').click();
  await visible(page, '[data-action="run"]').click();
  await page.waitForTimeout(400);
  // Leave the C=C intact: atom balance fails (C2H4 instead of C2H6).
  await page.click('[data-action="check"]');
  await page.waitForTimeout(500);
  const feedback = (await page.locator('[data-intel]').innerText()).replace(/\s+/g, ' ');
  check('wrong product rejected', /belum valid/i.test(feedback), true);
  check('atom balance explained', /Neraca atom/.test(feedback), true);
  check('no save written on failure', (await saveState(page)).additionLab?.results?.['AL-01'] ?? null, null);
  await page.screenshot({ path: `${SHOTS}/07-addition-rejection.png` });
  await context.close();
} catch (error) { check('rejection block crashed', String(error).slice(0, 120), 'none'); }

// ---------- desktop: codex and profile ----------
try {
  const { context, page } = await open();
  await page.click('[data-action="addition"]');
  await page.waitForTimeout(500);
  await page.click('[data-action="codex"]');
  await page.waitForTimeout(600);
  check('codex route', await route(page), 'addition-codex');
  check('six codex pages', await page.locator('[data-page-btn]').count(), 6);
  const firstTitle = await page.locator('.codex-page h2, .codex-page__title, .codex-page h1').first().innerText().catch(() => '');
  await page.click('[data-page-next]');
  await page.waitForTimeout(400);
  const secondTitle = await page.locator('.codex-page h2, .codex-page__title, .codex-page h1').first().innerText().catch(() => '');
  check('codex pager advances', firstTitle !== secondTitle && secondTitle.length > 0, true);
  await page.screenshot({ path: `${SHOTS}/08-addition-codex.png` });

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.click('[data-action="addition"]');
  await page.waitForTimeout(500);
  await page.click('[data-action="profile"]');
  await page.waitForTimeout(600);
  check('profile route', await route(page), 'addition-profile');
  check('rank ladder renders', await page.locator('.rank-step').count(), 5);
  check('achievements render', await page.locator('.achievement').count(), 7);
  await page.screenshot({ path: `${SHOTS}/09-addition-profile.png` });
  await context.close();
} catch (error) { check('codex/profile block crashed', String(error).slice(0, 120), 'none'); }

// ---------- mobile: bottom-sheet setup flow ----------
try {
  const { context, page } = await open({ width: 390, height: 844 });
  await page.click('[data-action="addition"]');
  await page.waitForTimeout(500);
  check('mobile menu fits width', await overflow(page) <= 1, true);
  await page.click('[data-action="map"]');
  await page.waitForTimeout(500);
  check('mobile map fits width', await overflow(page) <= 1, true);
  await page.click('.level-node[data-experiment-id="AL-01"]');
  await page.waitForTimeout(500);
  await page.click('[data-start]');
  await page.waitForFunction(() => window.__builderDebug?.scene?.ready === true, null, { timeout: 15000 });
  await page.waitForTimeout(500);

  check('mobile workspace route', await route(page), 'addition-lab');
  check('mobile workspace fits width', await overflow(page) <= 1, true);
  const shell = await page.evaluate(() => {
    const strip = document.querySelector('.mission-strip');
    const aside = document.querySelector('.addition-setup');
    const stack = document.querySelector('.side-stack');
    return {
      stripVisible: strip ? getComputedStyle(strip).display !== 'none' : false,
      asideHidden: aside ? getComputedStyle(aside).display === 'none' : false,
      sheetClosed: stack ? !stack.classList.contains('is-open') : false,
    };
  });
  check('mission strip replaces dossier', shell.stripVisible, true);
  check('setup dossier hidden on phone', shell.asideHidden, true);
  check('sheet starts closed', shell.sheetClosed, true);
  await page.screenshot({ path: `${SHOTS}/10-mobile-workspace.png` });

  await page.click('.mission-strip');
  await page.waitForTimeout(500);
  const sheet = await page.evaluate(() => {
    const stack = document.querySelector('.side-stack');
    const panel = stack?.querySelector('[data-sheet-panel="mission"]');
    return {
      open: stack?.classList.contains('is-open') ?? false,
      tab: stack?.dataset.sheetTab,
      panelVisible: panel ? getComputedStyle(panel).display !== 'none' : false,
      reagents: panel?.querySelectorAll('[data-reagent]').length ?? 0,
    };
  });
  check('sheet opens on mission tab', sheet.open && sheet.tab === 'mission', true);
  check('setup panel visible in sheet', sheet.panelVisible, true);
  check('reagent chips live in sheet', sheet.reagents, 7);
  await page.screenshot({ path: `${SHOTS}/11-mobile-sheet-setup.png` });

  await visible(page, '[data-reagent="H2"]').click();
  await visible(page, '[data-catalyst="Ni"]').click();
  await visible(page, '[data-action="run"]').click();
  await page.waitForTimeout(600);
  check('sheet closes after successful run', await page.locator('.side-stack').evaluate((el) => el.classList.contains('is-open')), false);

  await page.evaluate(() => {
    const { scene } = window.__builderDebug;
    scene.setBondOrder(1);
    scene.selectedId = scene.molecule.nodes[0].id;
    scene.handleAtomClick(scene.molecule.nodes[1].id);
    scene.clearSelection();
  });
  await page.click('[data-action="check"]');
  await page.waitForTimeout(700);
  check('mobile check succeeds', await page.locator('[data-action="view-result"]').count(), 1);
  await page.click('[data-action="view-result"]');
  await page.waitForTimeout(700);
  check('mobile result route', await route(page), 'addition-result');
  check('mobile result fits width', await overflow(page) <= 1, true);
  check('mobile completion persisted', (await saveState(page)).additionLab?.results?.['AL-01']?.stars, 3);
  await page.screenshot({ path: `${SHOTS}/12-mobile-result.png` });
  await context.close();
} catch (error) { check('mobile block crashed', String(error).slice(0, 120), 'none'); }

console.log(`\nconsole errors: ${errors.length}`);
for (const error of errors.slice(0, 8)) console.log('  ' + error.slice(0, 180));
const failed = results.filter((entry) => !entry.ok).length;
console.log(`checks=${results.length} failures=${failed}`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);