import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './styles/main.css';

import { initRouter } from './ui/router.js';
import { closeAllModals } from './ui/modal.js';
import { mountMenu } from './screens/menu.js';
import { mountLevels } from './screens/levels.js';
import { mountCodex } from './screens/codex.js';
import { mountLevel } from './screens/level.js';
import { mountResult } from './screens/result.js';
import { mountAdditionMenu } from './additionLab/screens/menu.js';
import { mountAdditionMap } from './additionLab/screens/map.js';
import { mountAdditionBriefing } from './additionLab/screens/briefing.js';
import { mountAdditionLab } from './additionLab/screens/workspace.js';
import { mountAdditionResult } from './additionLab/screens/result.js';
import { mountAdditionCodex } from './additionLab/screens/codex.js';
import { mountAdditionProfile } from './additionLab/screens/profile.js';
import { getLevel } from './data/levels.js';
import { applySettings } from './systems/settings.js';
import { sfx } from './systems/audio.js';
import { clearToasts } from './ui/toast.js';

const app = document.querySelector('#app');
const announcer = document.querySelector('#route-announcer');

const SCREENS = {
  menu: mountMenu,
  levels: mountLevels,
  codex: mountCodex,
  level: mountLevel,
  result: mountResult,
  addition: mountAdditionMenu,
  'addition-map': mountAdditionMap,
  'addition-briefing': mountAdditionBriefing,
  'addition-lab': mountAdditionLab,
  'addition-result': mountAdditionResult,
  'addition-codex': mountAdditionCodex,
  'addition-profile': mountAdditionProfile,
};

const TITLES = {
  menu: 'Menu',
  levels: 'Level Select',
  codex: 'Molecular Codex',
  level: 'Laboratorium',
  result: 'Hasil Misi',
  addition: 'Addition Lab',
  'addition-map': 'Peta Eksperimen — Addition Lab',
  'addition-briefing': 'Briefing Eksperimen — Addition Lab',
  'addition-lab': 'Reaction Workspace — Addition Lab',
  'addition-result': 'Laporan Eksperimen — Addition Lab',
  'addition-codex': 'Reaction Codex — Addition Lab',
  'addition-profile': 'Research Profile — Addition Lab',
};

let cleanup = null;
let currentRoute = null;

function announce(message) {
  if (!announcer) return;
  announcer.textContent = '';
  window.setTimeout(() => {
    announcer.textContent = message;
  }, 60);
}

function render(route, params = {}) {
  let targetRoute = SCREENS[route] ? route : 'menu';
  let routeParams = params;

  if (targetRoute === 'result' && !routeParams.molecule) {
    targetRoute = 'levels';
    routeParams = {};
  }

  if (cleanup) {
    try {
      cleanup();
    } catch (error) {
      console.error('Gagal membersihkan layar sebelumnya:', error);
    }
    cleanup = null;
  }
  closeAllModals('route');
  clearToasts();
  document.body.classList.remove('has-modal');

  app.innerHTML = '';
  app.dataset.route = targetRoute;
  window.scrollTo(0, 0);
  currentRoute = targetRoute;

  const mount = SCREENS[targetRoute];
  try {
    cleanup = mount(app, routeParams) ?? null;
  } catch (error) {
    console.error('Gagal memuat layar:', error);
    app.innerHTML = `
      <div class="fatal-screen">
        <span>SYSTEM ERROR</span>
        <h1>Arsip gagal dimuat</h1>
        <p>Terjadi kesalahan saat membuka layar ini. Coba kembali ke menu utama.</p>
        <button type="button" class="btn btn--primary" data-fatal-menu>Kembali ke Menu</button>
      </div>
    `;
    app.querySelector('[data-fatal-menu]')?.addEventListener('click', () => render('menu'));
    cleanup = null;
  }

  let title = TITLES[targetRoute] ?? 'Carbon Code';
  if (targetRoute === 'level') {
    const level = getLevel(routeParams.levelId);
    if (level) title = `Level ${String(level.id).padStart(2, '0')} — ${level.title}`;
  }
  document.title = `${title} • Carbon Code`;
  announce(`${title} dimuat.`);
}

initRouter(render);
applySettings();
render('menu');

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button && !button.disabled) sfx.play('click');
});

function unlockAudio() {
  sfx.ensureContext();
}
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

window.addEventListener('beforeunload', () => {
  if (cleanup) {
    try {
      cleanup();
    } catch {
      // The page is unloading; cleanup failures are not actionable.
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (cleanup) cleanup();
    cleanup = null;
  });
}

export { currentRoute, render };
