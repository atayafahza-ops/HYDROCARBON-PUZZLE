import { navigate } from '../ui/router.js';
import { icon, moleculeMark } from '../ui/icons.js';
import { starsHTML, pad2 } from '../ui/helpers.js';
import {
  confirmNewGame,
  openCreditsModal,
  openSettingsModal,
} from '../ui/dialogs.js';
import {
  getCompletedCount,
  getContinueLevelId,
  getLevelCount,
  getMaxStars,
  getSave,
  getTotalStars,
  getTotalXp,
  resetProgress,
} from '../systems/save.js';
import { getLevel } from '../data/levels.js';
import { getSettings } from '../systems/save.js';

const DIALOGUES = [
  'Selamat datang di Laboratorium Carbon Code. Tugasmu adalah memulihkan arsip molekul yang rusak.',
  'Setiap puzzle menghubungkan struktur, rumus, dan nama senyawa. Ikuti petunjukku jika kamu buntu.',
  'Tidak ada batas percobaan di sini. Eksperimen, periksa, dan pelajari kesalahannya.',
];

export function mountMenu(root) {
  const totalStars = getTotalStars();
  const maxStars = getMaxStars();
  const totalXp = getTotalXp();
  const completed = getCompletedCount();
  const levelCount = getLevelCount();
  const save = getSave();
  const settings = getSettings();
  const continueLevel = getLevel(getContinueLevelId());
  const allComplete = completed === levelCount;
  const hasProgress = Object.keys(save.levels).length > 0;
  const progressPercent = levelCount ? Math.round((completed / levelCount) * 100) : 0;

  root.innerHTML = `
    <section class="screen menu-screen" aria-label="Menu utama Carbon Code">
      <div class="ambient-particles" aria-hidden="true">
        ${Array.from({ length: 9 }, (_, index) => `<span style="--x:${8 + index * 10}%;--y:${18 + (index % 4) * 17}%;--d:${index * 0.65}s"></span>`).join('')}
      </div>

      <header class="menu-header">
        <div class="brand-block">
          <div class="brand-kicker"><span class="status-dot"></span> LAB ARCHIVE SYSTEM <span class="slash">//</span> ONLINE</div>
          <div class="brand-lockup">
            <h1 class="logo-title">CARBON <span class="logo-code">CODE</span></h1>
            <div class="logo-molecule" aria-hidden="true">${moleculeMark(70)}</div>
          </div>
          <p class="logo-sub">THE HYDROCARBON MYSTERY</p>
        </div>
        <div class="header-side">
          <span class="badge badge--outline">${icon('spark', 13)} MVP v1.0</span>
          <span class="header-caption">PUZZLE EDUKASI KIMIA</span>
        </div>
      </header>

      <main class="menu-grid">
        <div class="mentor-column">
          <div class="mentor-art panel">
            <img src="${import.meta.env.BASE_URL}assets/img/dr-nova.png" alt="Dr. Nova di laboratorium Carbon Code" class="mentor-img" />
            <div class="mentor-scanlines" aria-hidden="true"></div>
            <div class="mentor-topline">
              <span>${icon('terminal', 14)} LIVE FEED</span>
              <span class="mentor-topline__right">LAB-01</span>
            </div>
            <div class="mentor-id-chip">
              <span class="mentor-id-chip__dot"></span>
              <div><strong>DR. NOVA</strong><span>MENTOR // KIMIA ORGANIK</span></div>
            </div>
            <div class="mentor-corner-note">${icon('atom', 16)} <span>VALENCE 4</span></div>
          </div>
          <div class="dialog-card panel">
            <div class="dialog-head">
              <span class="dialog-speaker">Dr. Nova</span>
              <span class="dialog-role">MENTOR</span>
              <span class="dialog-status">${icon('sound', 13)} AUDIO LOG</span>
            </div>
            <p class="dialog-text" data-dialog-text>${DIALOGUES[0]}</p>
            <button type="button" class="dialog-next" data-dialog-next aria-label="Lanjutkan dialog">
              <span data-dialog-index>01 / 03</span>${icon('chevron-right', 16)}
            </button>
          </div>
        </div>

        <aside class="menu-panel panel" aria-label="Navigasi utama">
          <div class="panel-head">
            <div>
              <span class="eyebrow">${icon('terminal', 14)} ARCHIVE CONSOLE</span>
              <h2 class="panel-title">MAIN MENU</h2>
            </div>
            <span class="panel-code">${icon('lock', 13)} SECURE</span>
          </div>

          <div class="menu-buttons">
            <button type="button" class="menu-btn menu-btn--green" data-action="new">
              <span class="menu-btn__icon">${icon('plus', 22)}</span>
              <span class="menu-btn__copy"><strong>New Game</strong><span>Mulai dari metana</span></span>
              ${icon('chevron-right', 17)}
            </button>
            <button type="button" class="menu-btn menu-btn--blue" data-action="continue">
              <span class="menu-btn__icon">${icon('play', 22)}</span>
              <span class="menu-btn__copy"><strong>Continue</strong><span>${allComplete ? 'Semua arsip pulih' : `Level ${pad2(continueLevel.id)} — ${continueLevel.title}`}</span></span>
              ${icon('chevron-right', 17)}
            </button>
            <button type="button" class="menu-btn menu-btn--violet" data-action="levels">
              <span class="menu-btn__icon">${icon('map', 22)}</span>
              <span class="menu-btn__copy"><strong>Level Select</strong><span>Peta lima laboratorium</span></span>
              ${icon('chevron-right', 17)}
            </button>
            <button type="button" class="menu-btn menu-btn--amber" data-action="codex">
              <span class="menu-btn__icon">${icon('book', 22)}</span>
              <span class="menu-btn__copy"><strong>Molecular Codex</strong><span>Ensiklopedia hidrokarbon</span></span>
              ${icon('chevron-right', 17)}
            </button>
            <div class="menu-row-split">
              <button type="button" class="menu-btn menu-btn--slate menu-btn--compact" data-action="settings">
                <span class="menu-btn__icon">${icon('gear', 20)}</span>
                <span class="menu-btn__copy"><strong>Settings</strong></span>
              </button>
              <button type="button" class="menu-btn menu-btn--slate menu-btn--compact" data-action="credits">
                <span class="menu-btn__icon">${icon('users', 20)}</span>
                <span class="menu-btn__copy"><strong>Credits</strong></span>
              </button>
            </div>
          </div>

          <div class="save-summary">
            <div class="save-summary__head">
              <span>${icon('database', 15)} PROGRESS ARSIP</span>
              <span>${completed}/${levelCount} LEVEL</span>
            </div>
            <div class="progress-track"><span style="width:${progressPercent}%"></span></div>
            <div class="save-summary__stats">
              <span class="stat-chip">${starsHTML(totalStars, { size: 13, label: `${totalStars} dari ${maxStars} bintang` })}<strong>${totalStars}<small>/${maxStars}</small></strong></span>
              <span class="stat-chip">${icon('spark', 14)}<strong>${totalXp}<small> XP</small></strong></span>
              <span class="stat-chip">${icon('flask', 14)}<strong>${progressPercent}%</strong></span>
            </div>
          </div>
        </aside>
      </main>

      <footer class="screen-footer menu-footer">
        <span>${icon('atom', 15)} BELAJAR KIMIA • SELESAIKAN TEKA-TEKI • TEMUKAN STRUKTUR</span>
        <span class="footer-version">CARBON CODE v1.0.0 <span class="slash">//</span> PHASER 3</span>
      </footer>
    </section>
  `;

  const abort = new AbortController();
  const { signal } = abort;
  const reduceMotion =
    settings.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let dialogIndex = 0;
  let typingTimer = null;
  let currentText = '';
  let isTyping = false;
  const dialogText = root.querySelector('[data-dialog-text]');
  const dialogIndexEl = root.querySelector('[data-dialog-index]');

  function finishTyping() {
    if (typingTimer) window.clearInterval(typingTimer);
    typingTimer = null;
    isTyping = false;
    dialogText.textContent = currentText;
    dialogText.classList.remove('is-typing');
  }

  function typeText(text) {
    currentText = text;
    if (typingTimer) window.clearInterval(typingTimer);
    if (reduceMotion) {
      dialogText.textContent = text;
      isTyping = false;
      return;
    }
    isTyping = true;
    dialogText.textContent = '';
    dialogText.classList.add('is-typing');
    let index = 0;
    typingTimer = window.setInterval(() => {
      index += 1;
      dialogText.textContent = text.slice(0, index);
      if (index >= text.length) {
        finishTyping();
      }
    }, 18);
  }

  function setDialog(index) {
    dialogIndex = index % DIALOGUES.length;
    dialogIndexEl.textContent = `${pad2(dialogIndex + 1)} / ${pad2(DIALOGUES.length)}`;
    typeText(DIALOGUES[dialogIndex]);
  }

  typeText(DIALOGUES[0]);

  root.querySelector('[data-dialog-next]')?.addEventListener(
    'click',
    () => {
      if (isTyping) {
        finishTyping();
        return;
      }
      setDialog(dialogIndex + 1);
    },
    { signal },
  );
  dialogText?.addEventListener(
    'click',
    () => {
      if (isTyping) finishTyping();
      else setDialog(dialogIndex + 1);
    },
    { signal },
  );

  root.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const action = button.dataset.action;
        if (action === 'new') {
          if (!hasProgress) {
            resetProgress();
            navigate('level', { levelId: 1 });
          } else {
            confirmNewGame({
              onConfirm: () => {
                resetProgress();
                navigate('level', { levelId: 1 });
              },
            });
          }
        } else if (action === 'continue') {
          if (allComplete) {
            navigate('levels');
          } else {
            navigate('level', { levelId: continueLevel.id });
          }
        } else if (action === 'levels') {
          navigate('levels');
        } else if (action === 'codex') {
          navigate('codex');
        } else if (action === 'settings') {
          openSettingsModal({ onReset: () => navigate('menu') });
        } else if (action === 'credits') {
          openCreditsModal();
        }
      },
      { signal },
    );
  });

  return () => {
    abort.abort();
    if (typingTimer) window.clearInterval(typingTimer);
  };
}
