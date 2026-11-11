import { navigate } from '../../ui/router.js';
import { icon } from '../../ui/icons.js';
import { escapeHTML } from '../../ui/helpers.js';
import { analyzeMolecule, cloneMolecule } from '../../chemistry/graph.js';
import { renderStructureSVG } from '../../ui/structure.js';
import { mountMoleculeBuilder } from '../../game/builder.js';
import { showToast } from '../../ui/toast.js';
import { isModalOpen } from '../../ui/modal.js';
import { sfx } from '../../systems/audio.js';
import { getSettings } from '../../systems/save.js';
import {
  isExperimentUnlocked,
  recordExperimentCompletion,
  getAdditionTotalXp,
} from '../../systems/save.js';
import { getExperiment, getExperimentIndex, EXPERIMENTS } from '../data/experiments.js';
import { getMolecule, moleculeGraph, identifyMolecule } from '../data/molecules.js';
import { REAGENTS, catalystName } from '../data/reagents.js';
import { getReactionRule } from '../data/reactionRules.js';
import { runReaction } from '../engine/reactionEngine.js';
import {
  validateProduct,
  scoreExperiment,
  scoreProductChoice,
  scoreIdentify,
  experimentXp,
} from '../engine/reactionValidator.js';

const ATOM_TOOLS = [
  { element: 'C', label: 'C', key: 'A' },
  { element: 'O', label: 'O', key: 'O' },
  { element: 'Br', label: 'Br', key: 'B' },
  { element: 'Cl', label: 'Cl', key: 'C' },
  { element: 'I', label: 'I', key: 'I' },
];

// GDD v1.1 §11.3 — empat tingkat petunjuk.
const HINT_LEVELS = ['Konsep', 'Reaksi', 'Struktur', 'Solusi Terbimbing'];

const LEVEL_BADGES = {
  core: { label: 'INTI', cls: 'badge--green' },
  enrichment: { label: 'PENGAYAAN', cls: 'badge--purple' },
  advanced: { label: 'LANJUTAN', cls: 'badge--red' },
};

const DEFAULT_CONDITIONS = { catalyst: 'none', equivalents: 1, peroxide: false };

function levelBadgeMarkup(experiment) {
  const meta = LEVEL_BADGES[experiment.level] ?? LEVEL_BADGES.core;
  return `<span class="badge ${meta.cls}">${meta.label}</span>`;
}

function initConditions(controls, target) {
  const base = target ?? DEFAULT_CONDITIONS;
  return {
    catalyst: controls.catalyst ? controls.catalyst[0] : base.catalyst,
    equivalents: controls.equivalents ? controls.equivalents[0] : base.equivalents,
    peroxide: false,
  };
}

function failureTitle(code) {
  if (code === 'WRONG_REAGENT') return 'Reagen tidak tepat';
  if (code === 'WRONG_CONDITION') return 'Kondisi tidak tepat';
  if (code === 'WRONG_EQUIVALENT') return 'Ekuivalen tidak tepat';
  if (code === 'AMBIGUOUS') return 'Reaksi ambigu';
  return 'Reaksi tidak berjalan';
}

function candidateListMarkup(candidateIds) {
  if (!candidateIds?.length) return '';
  return `
    <ul class="feedback-candidates">
      ${candidateIds.map((id) => `<li>${icon('info', 13)} ${escapeHTML(getReactionRule(id)?.label ?? id)}</li>`).join('')}
    </ul>`;
}

function feedbackMarkup(run) {
  if (!run.feedback) {
    const intel = run.defaultIntel;
    return `
      <div class="intel-default">
        <span class="intel-default__icon">${icon('flask', 24)}</span>
        <div><span class="eyebrow">PROTOKOL</span><strong>${escapeHTML(intel.title)}</strong>
        <p>${escapeHTML(intel.body)}</p></div>
      </div>`;
  }
  const tone = run.feedback.ok ? 'success' : 'error';
  return `
    <div class="feedback-card feedback-card--${tone}" role="status">
      <div class="feedback-card__head">
        <span class="feedback-card__icon">${icon(run.feedback.ok ? 'check' : 'close', 17)}</span>
        <strong>${escapeHTML(run.feedback.title)}</strong>
        <span class="feedback-card__tag">${run.feedback.ok ? 'VALID' : 'REVISI'}</span>
      </div>
      <p>${escapeHTML(run.feedback.message)}</p>
      ${candidateListMarkup(run.feedback.candidates)}
      ${run.feedback.layers ? `<ul class="validation-layers">${run.feedback.layers.map((layer) => `<li class="${layer.ok ? 'is-ok' : 'is-fail'}">${icon(layer.ok ? 'check' : 'close', 13)}<span>${layer.label}</span></li>`).join('')}</ul>` : ''}
    </div>`;
}

function hintCardMarkup(experiment, hintsShown) {
  if (hintsShown <= 0) return '';
  const level = HINT_LEVELS[Math.min(hintsShown - 1, HINT_LEVELS.length - 1)];
  return `
    <div class="hint-card">
      <div class="hint-card__head"><span>${icon('bulb', 16)} PETUNJUK ${hintsShown}/${experiment.hints.length} · ${escapeHTML(level.toUpperCase())}</span></div>
      <p>${escapeHTML(experiment.hints[hintsShown - 1])}</p>
      <div class="hint-dots">${experiment.hints.map((_, index) => `<span class="${index < hintsShown ? 'is-on' : ''}"></span>`).join('')}</div>
    </div>`;
}

function reagentOptionsMarkup(run, experiment) {
  const list = experiment.reagentOptions ?? Object.keys(REAGENTS);
  return list
    .map((id) => {
      const reagent = REAGENTS[id];
      if (!reagent) return '';
      return `
        <button type="button" class="reagent-chip ${run.reagent === id ? 'is-active' : ''}" data-reagent="${id}" aria-pressed="${run.reagent === id}" ${run.locked ? 'disabled' : ''}>
          <strong>${reagent.formula}</strong><span>${reagent.name}</span>
        </button>`;
    })
    .join('');
}

function lockedConditionChip(label, value) {
  return `
    <div class="condition-field">
      <span class="condition-field__label">${label}</span>
      <div class="condition-options"><span class="condition-chip condition-chip--locked">${icon('lock', 12)} ${escapeHTML(value)}</span></div>
    </div>`;
}

function conditionControlsMarkup(run, stage) {
  const controls = stage.conditionControls ?? {};
  const target = stage.conditions ?? null;
  const parts = [];
  if (controls.catalyst) {
    parts.push(`
      <div class="condition-field">
        <span class="condition-field__label">KATALIS</span>
        <div class="condition-options">
          ${controls.catalyst.map((id) => `<button type="button" class="condition-chip ${run.conditions.catalyst === id ? 'is-active' : ''}" data-catalyst="${id}" ${run.locked ? 'disabled' : ''}>${catalystName(id)}</button>`).join('')}
        </div>
      </div>`);
  } else if (target?.catalyst != null) {
    parts.push(lockedConditionChip('KATALIS', catalystName(target.catalyst)));
  }
  if (controls.equivalents) {
    parts.push(`
      <div class="condition-field">
        <span class="condition-field__label">EKUIVALEN</span>
        <div class="condition-options">
          ${controls.equivalents.map((value) => `<button type="button" class="condition-chip ${run.conditions.equivalents === value ? 'is-active' : ''}" data-equivalents="${value}" ${run.locked ? 'disabled' : ''}>${value} eq</button>`).join('')}
        </div>
      </div>`);
  } else if (target?.equivalents != null) {
    parts.push(lockedConditionChip('EKUIVALEN', `${target.equivalents} eq`));
  }
  if (controls.peroxide) {
    parts.push(`
      <div class="condition-field">
        <span class="condition-field__label">PEROKSIDA</span>
        <div class="condition-options">
          <button type="button" class="condition-chip ${run.conditions.peroxide ? 'is-active' : ''}" data-peroxide="toggle" aria-pressed="${run.conditions.peroxide}" ${run.locked ? 'disabled' : ''}>${run.conditions.peroxide ? 'ON' : 'OFF'}</button>
        </div>
      </div>`);
  } else if (target?.peroxide) {
    parts.push(lockedConditionChip('PEROKSIDA', 'ON'));
  }
  if (!parts.length) {
    return `<p class="condition-note">${icon('info', 14)} Eksperimen ini tidak memerlukan pengaturan kondisi khusus.</p>`;
  }
  return parts.join('');
}

function missionStripMarkup(experiment, label, targetTitle) {
  return `
    <button type="button" class="mission-strip" data-action="sheet-tab" data-sheet-tab="mission" aria-label="Buka setup eksperimen ${escapeHTML(experiment.title)}">
      <span class="mission-strip__icon">${icon('flask', 18)}</span>
      <span class="mission-strip__copy">
        <span class="mission-strip__meta">${experiment.id} · ${escapeHTML(label)}</span>
        <strong>${escapeHTML(targetTitle)}</strong>
      </span>
      <span class="mission-strip__cta">Setup ${icon('chevron-right', 15)}</span>
    </button>
  `;
}

function sheetShellMarkup(run, tabs, panels) {
  return `
    <aside class="side-stack ${run.sheetOpen ? 'is-open' : ''}" data-sheet-tab="${run.sheetTab}" id="addition-mobile-sheet" aria-label="Inspector dan feedback">
      <div class="sheet-head">
        <button type="button" class="sheet-toggle" data-action="sheet-toggle" aria-expanded="${run.sheetOpen}">
          <span class="sheet-grip" aria-hidden="true"></span>
          <span class="sheet-toggle__label">${icon('atom', 17)} Setup &amp; petunjuk</span>
          <span class="sheet-toggle__chevron">${icon('chevron-left', 16)}</span>
        </button>
        <div class="sheet-tabs" role="tablist">
          ${tabs.map((tab) => `<button type="button" role="tab" class="sheet-tab ${run.sheetTab === tab.id ? 'is-active' : ''}" data-action="sheet-tab" data-sheet-tab="${tab.id}" aria-selected="${run.sheetTab === tab.id}">${tab.label}</button>`).join('')}
        </div>
      </div>
      ${panels}
    </aside>`;
}

function sheetBackdropMarkup(run) {
  return `<button type="button" class="sheet-backdrop ${run.sheetOpen ? 'is-open' : ''}" data-action="sheet-close" tabindex="-1" aria-hidden="true"></button>`;
}

function successActionMarkup() {
  return `
    <div class="action-note action-note--success"><span class="action-note__icon">${icon('check', 18)}</span><div><strong>EKSPERIMEN SELESAI</strong><span>Lihat laporan reaksi dan bintangmu.</span></div></div>
    <button type="button" class="btn btn--primary action-cta" data-action="view-result"><span>Lihat Laporan</span>${icon('arrow-right', 18)}</button>`;
}

function swapActionBarForReport(root) {
  const actionBar = root.querySelector('.action-bar');
  if (actionBar) actionBar.innerHTML = successActionMarkup();
}

function bumpHudXp(root, summary) {
  const xpTarget = root.querySelector('[data-hud-xp] strong');
  if (xpTarget && Number.isFinite(summary?.totalXp)) xpTarget.textContent = String(summary.totalXp);
}

function nextPlayableId(experiment) {
  const index = getExperimentIndex(experiment.id);
  for (let i = index + 1; i < EXPERIMENTS.length; i += 1) {
    if (EXPERIMENTS[i].playable !== false) return EXPERIMENTS[i].id;
  }
  return null;
}

function topbarMarkup(experiment) {
  return `
    <header class="game-topbar">
      <div class="game-topbar__left">
        <button type="button" class="icon-btn game-back" data-action="map" aria-label="Kembali ke peta">${icon('arrow-left', 19)}<span>PETA</span></button>
        <div class="game-heading">
          <span class="eyebrow">${experiment.id} <span class="slash">//</span> ${escapeHTML(experiment.category.toUpperCase())}</span>
          <div class="game-heading__line"><h1>${escapeHTML(experiment.title)}</h1>${levelBadgeMarkup(experiment)}<span class="badge badge--outline">ADDITION LAB</span></div>
        </div>
      </div>
      <div class="game-topbar__right">
        <span class="hud-xp" data-hud-xp title="Total XP Addition Lab">${icon('spark', 14)}<strong>${getAdditionTotalXp()}</strong><small>XP</small></span>
        <span class="topbar-sep" aria-hidden="true"></span>
        <button type="button" class="icon-btn icon-btn--ghost" data-action="briefing" aria-label="Lihat briefing">${icon('info', 19)}</button>
      </div>
    </header>`;
}

function gameFooterMarkup(shortcutNote) {
  return `
    <footer class="game-footer">
      <span class="game-keys">${icon('info', 13)} ${shortcutNote}</span>
      <span class="game-autosave">${icon('database', 13)} Progres tersimpan setelah eksperimen selesai</span>
    </footer>`;
}

// ---------------------------------------------------------------------------
// Kind: reaction — builder flow (mendukung multi-stage AL-39)
// ---------------------------------------------------------------------------

function mountReaction(root, experiment) {
  const stages = experiment.stages ?? null;
  const stageCount = stages?.length ?? 1;
  const stageConfig = () => (stages ? stages[run.stageIndex] : experiment);
  const stageTarget = () => getMolecule(stageConfig().targetProduct);
  const stageControls = () => stageConfig().conditionControls ?? {};
  const hasConditionControls = stages
    ? stages.some((stage) => stage.conditionControls?.catalyst || stage.conditionControls?.equivalents || stage.conditionControls?.peroxide)
    : Boolean(experiment.conditionControls?.catalyst || experiment.conditionControls?.equivalents || experiment.conditionControls?.peroxide);
  const stageEnol = experiment.stage === 'enol';

  const run = {
    stageIndex: 0,
    reagent: null,
    conditions: initConditions(stages ? stages[0].conditionControls : experiment.conditionControls, stages ? stages[0].conditions : experiment.conditions),
    locked: false,
    reactionRan: false,
    reactionResult: null,
    defaultIntel: {
      title: 'Pilih reagen & kondisi.',
      body: 'Pilih reagen, atur kondisi, lalu tekan Jalankan Reaksi. Setelah reaksi berjalan, bangun struktur produknya di kanvas.',
    },
    hintsUsed: 0,
    hintsShown: 0,
    failedChecks: 0,
    structureFailures: 0,
    valenceErrors: 0,
    reagentMistakes: 0,
    conditionMistakes: 0,
    feedback: null,
    resultReady: null,
    activeBond: 1,
    canUndo: false,
    sheetOpen: false,
    sheetTab: 'mission',
  };

  let builder = null;
  let disposed = false;
  const abort = new AbortController();
  const { signal } = abort;
  const settings = getSettings();
  const reduceMotion = settings.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const mobileQuery = window.matchMedia?.('(max-width: 980px)');
  const isMobile = () => Boolean(mobileQuery?.matches);

  function setupBodyMarkup() {
    const stage = stageConfig();
    const reactant = getMolecule(stage.reactant);
    const product = stageTarget();
    return `
      <div class="setup-reactant">
        <span class="section-label"><span>REAKTAN</span></span>
        <div class="setup-reactant__canvas">${renderStructureSVG(moleculeGraph(stage.reactant), { className: 'structure-svg', ariaLabel: `Struktur ${reactant.name}` })}</div>
        <strong>${reactant.name}</strong><span>${reactant.formula}</span>
      </div>
      ${stageCount > 1 ? `
        <div class="stage-progress">
          ${stages.map((stageEntry, index) => `<span class="stage-chip ${index < run.stageIndex ? 'is-done' : index === run.stageIndex ? 'is-active' : ''}">${index < run.stageIndex ? icon('check', 12) : index + 1}</span>`).join('')}
          <span class="stage-progress__label">${escapeHTML(stage.label)}</span>
        </div>` : ''}
      <div class="setup-section">
        <span class="section-label"><span>1 · PILIH REAGEN</span></span>
        <div class="reagent-grid" data-reagent-grid>${reagentOptionsMarkup(run, experiment)}</div>
      </div>
      <div class="setup-section">
        <span class="section-label"><span>2 · ATUR KONDISI</span></span>
        <div data-condition-controls>${conditionControlsMarkup(run, stage)}</div>
      </div>
      <button type="button" class="btn btn--primary setup-run" data-action="run" ${run.reactionRan || run.resultReady ? 'disabled' : ''}>
        ${icon('play', 17)}<span>${run.reactionRan ? 'Reaksi Berjalan' : 'Jalankan Reaksi'}</span>
      </button>
      <div class="setup-target">
        <span class="section-label"><span>PRODUK TARGET${stageCount > 1 ? ` · TAHAP ${run.stageIndex + 1}/${stageCount}` : ''}</span></span>
        <strong>${product.name}</strong><span>${product.formula}</span>
        ${stage.note ? `<p class="setup-target__note">${escapeHTML(stage.note)}</p>` : ''}
      </div>
    `;
  }

  function countCellsMarkup(analysis) {
    return ['C', 'H', 'Br', 'Cl', 'I', 'O']
      .filter((element) => element === 'C' || element === 'H' || (analysis.elementCounts[element] ?? 0) > 0)
      .map((element) => `<div class="count-cell"><span class="count-cell__label">${element}</span><strong>${analysis.elementCounts[element] ?? 0}</strong></div>`)
      .join('');
  }

  function labStatus(analysis) {
    if (analysis.atomCount === 0) {
      return { tone: 'neutral', label: 'STANDBY', title: 'Grid kosong', detail: 'Jalankan reaksi, lalu bangun produknya.' };
    }
    if (!analysis.connected) {
      return { tone: 'warn', label: 'PERHATIAN', title: 'Belum terhubung', detail: 'Satukan semua atom menjadi satu molekul.' };
    }
    if (analysis.invalidValence) {
      return { tone: 'error', label: 'VALENSI', title: 'Valensi terlampaui', detail: 'Kurangi ikatan pada atom yang kelebihan valensi.' };
    }
    return { tone: 'ready', label: 'SIAP', title: 'Siap diperiksa', detail: 'Tekan Periksa untuk memvalidasi produk.' };
  }

  function labStatusMarkup(status) {
    return `
      <span class="status-lamp status-lamp--${status.tone}"></span>
      <div class="status-copy">
        <span>${status.label}</span>
        <strong>${status.title}</strong>
        <small>${status.detail}</small>
      </div>
    `;
  }

  function screenMarkup() {
    return `
      <section class="screen game-screen addition-lab-screen" aria-label="Eksperimen ${experiment.id}: ${escapeHTML(experiment.title)}">
        ${topbarMarkup(experiment)}

        <main class="game-layout addition-layout">
          <aside class="briefing panel addition-setup" aria-label="Setup reaksi">
            <div class="panel-head panel-head--compact">
              <div><span class="eyebrow">${icon('flask', 13)} REACTION SETUP</span><span class="panel-code">${experiment.id}</span></div>
            </div>
            ${setupBodyMarkup()}
          </aside>

          ${missionStripMarkup(experiment, stageCount > 1 ? stageConfig().label.toUpperCase() : 'REACTION SETUP', `Target: ${stageTarget()?.name ?? ''}`)}

          <section class="workspace workspace--build panel" aria-label="Reaction workspace">
            <header class="workspace-head">
              <div><span class="eyebrow">${icon('atom', 13)} REACTION WORKSPACE</span><h2>BANGUN PRODUK</h2></div>
              <div class="workspace-head__status">
                <span class="grid-state" data-grid-state><span></span>MEMUAT GRID</span>
                <span class="active-bond" data-active-bond-label>IKATAN TUNGGAL</span>
              </div>
            </header>
            <div class="builder-stage">
              <div class="builder-host" data-builder-host></div>
              <span class="builder-corner builder-corner--tl" aria-hidden="true"></span>
              <span class="builder-corner builder-corner--tr" aria-hidden="true"></span>
              <span class="builder-corner builder-corner--bl" aria-hidden="true"></span>
              <span class="builder-corner builder-corner--br" aria-hidden="true"></span>
              <div class="grid-tools" role="group" aria-label="Kontrol tampilan grid">
                <button type="button" class="grid-tool" data-grid-zoom="out" aria-label="Perkecil grid">${icon('minus', 16)}</button>
                <button type="button" class="grid-tool grid-tool--reset" data-grid-zoom="reset" aria-label="Paskan tampilan grid"><span data-zoom-label>100%</span></button>
                <button type="button" class="grid-tool" data-grid-zoom="in" aria-label="Perbesar grid">${icon('plus', 16)}</button>
              </div>
              <div class="grid-hint">${icon('plus', 13)}<span>KETUK ATOM → ATOM LAIN · CUBIT / SCROLL UNTUK ZOOM</span></div>
              <div class="stage-success ${run.resultReady ? 'is-visible' : ''}" data-stage-success>
                <span class="stage-success__icon">${icon('check', 30)}</span>
                <strong>PRODUK VALID</strong><span>Eksperimen berhasil.</span>
              </div>
            </div>
          </section>

          ${sheetShellMarkup(
            run,
            [
              { id: 'mission', label: 'Setup' },
              { id: 'readout', label: 'Inspector' },
              { id: 'hints', label: 'Petunjuk' },
            ],
            `
            <section class="mission-sheet panel addition-setup-sheet" data-sheet-panel="mission" aria-label="Setup reaksi">
              <div class="mission-sheet__head">
                <div><span class="eyebrow">${icon('flask', 13)} REACTION SETUP</span><strong>${experiment.id}</strong></div>
                <span class="mission-sheet__tag" data-setup-tag>${run.reactionRan ? 'REAKSI AKTIF' : 'SETUP'}</span>
              </div>
              ${setupBodyMarkup()}
            </section>
            <section class="inspector panel" data-inspector data-sheet-panel="readout">
              <div class="inspector-head"><div><span class="eyebrow">${icon('target', 13)} READOUT</span><h2>INSPECTOR</h2></div><span class="live-tag"><span></span>LIVE</span></div>
              <div class="inspector-counts" data-inspector-counts>${countCellsMarkup(analyzeMolecule({ nodes: [], edges: [] }))}</div>
              <div class="formula-readout"><span class="formula-readout__label">RUMUS</span><strong class="formula-readout__value" data-inspector-formula>—</strong></div>
              <div class="inspector-status inspector-status--neutral" data-inspector-status>${labStatusMarkup(labStatus(analyzeMolecule({ nodes: [], edges: [] })))}</div>
            </section>
            <section class="intel-panel panel" data-intel data-sheet-panel="hints" aria-live="polite">${feedbackMarkup(run)}${hintCardMarkup(experiment, run.hintsShown)}</section>`,
          )}

          <footer class="action-bar" aria-label="Action bar">
            <div class="action-tools" data-action-tools>
              ${ATOM_TOOLS.map((tool) => `<button type="button" class="tool-btn tool-btn--add" data-add-atom="${tool.element}" aria-label="Tambah atom ${tool.element}"><span class="tool-btn__icon">${icon('plus', 16)}</span><span class="tool-btn__label">${tool.label}</span></button>`).join('')}
              <span class="action-divider" aria-hidden="true"></span>
              ${[1, 2, 3].map((order) => `<button type="button" class="tool-btn tool-btn--bond tool-btn--bond-${order} ${run.activeBond === order ? 'is-active' : ''}" data-bond-order="${order}" aria-pressed="${run.activeBond === order}" aria-label="${order === 1 ? 'Ikatan tunggal' : order === 2 ? 'Ikatan rangkap dua' : 'Ikatan rangkap tiga'}"><span class="tool-btn__icon">${icon(`bond${order}`, 21)}</span><span class="tool-btn__label">${order === 1 ? 'Tunggal' : order === 2 ? 'Rangkap 2' : 'Rangkap 3'}</span></button>`).join('')}
              <span class="action-divider" aria-hidden="true"></span>
              <button type="button" class="tool-btn tool-btn--danger" data-action="delete" aria-label="Hapus atom terpilih"><span class="tool-btn__icon">${icon('trash', 19)}</span><span class="tool-btn__label">Hapus</span></button>
            </div>
            <div class="action-tools action-tools--end">
              <button type="button" class="tool-btn tool-btn--util" data-action="undo" aria-label="Undo" ${run.canUndo ? '' : 'disabled'}><span class="tool-btn__icon">${icon('undo', 18)}</span><span class="tool-btn__label">Undo</span></button>
              <button type="button" class="tool-btn tool-btn--util" data-action="reset" aria-label="Reset ke reaktan"><span class="tool-btn__icon">${icon('reset', 18)}</span><span class="tool-btn__label">Reset</span></button>
              <button type="button" class="tool-btn tool-btn--util tool-btn--hint" data-action="hint" aria-label="Petunjuk"><span class="tool-btn__icon">${icon('bulb', 18)}</span><span class="tool-btn__label">Petunjuk</span><span class="tool-count" data-hint-count>${experiment.hints.length - run.hintsShown}</span></button>
              <button type="button" class="btn btn--primary action-check" data-action="check">${icon('check', 18)}<span>Periksa</span></button>
            </div>
          </footer>
        </main>

        ${sheetBackdropMarkup(run)}

        ${gameFooterMarkup('Tambah atom gugus yang masuk · sesuaikan ikatan · <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>H</kbd> petunjuk')}
      </section>
    `;
  }

  function renderScreen() {
    root.innerHTML = screenMarkup();
  }

  function setSheet(open, tab) {
    run.sheetOpen = typeof open === 'boolean' ? open : !run.sheetOpen;
    if (tab) run.sheetTab = tab;
    const stack = root.querySelector('.side-stack');
    const backdrop = root.querySelector('.sheet-backdrop');
    backdrop?.classList.toggle('is-open', run.sheetOpen);
    if (!stack) return;
    stack.classList.toggle('is-open', run.sheetOpen);
    stack.dataset.sheetTab = run.sheetTab;
    stack.querySelectorAll('[data-sheet-tab]').forEach((button) => {
      if (button.tagName !== 'BUTTON') return;
      const active = button.dataset.sheetTab === run.sheetTab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function revealSheet(tab) {
    if (isMobile()) setSheet(true, tab);
  }

  function renderIntel() {
    const target = root.querySelector('[data-intel]');
    if (target) target.innerHTML = feedbackMarkup(run) + hintCardMarkup(experiment, run.hintsShown);
  }

  function updateInspector(analysis) {
    const counts = root.querySelector('[data-inspector-counts]');
    const formula = root.querySelector('[data-inspector-formula]');
    const statusTarget = root.querySelector('[data-inspector-status]');
    if (counts) counts.innerHTML = countCellsMarkup(analysis);
    if (formula) formula.textContent = analysis.formula || '—';
    if (statusTarget) {
      const status = labStatus(analysis);
      statusTarget.className = `inspector-status inspector-status--${status.tone}`;
      statusTarget.innerHTML = labStatusMarkup(status);
    }
  }

  function refreshSetup() {
    root.querySelectorAll('[data-reagent-grid]').forEach((grid) => {
      grid.innerHTML = reagentOptionsMarkup(run, experiment);
    });
    root.querySelectorAll('[data-condition-controls]').forEach((target) => {
      target.innerHTML = conditionControlsMarkup(run, stageConfig());
    });
    root.querySelectorAll('[data-action="run"]').forEach((runButton) => {
      runButton.disabled = run.reactionRan || run.resultReady;
      runButton.querySelector('span').textContent = run.reactionRan ? 'Reaksi Berjalan' : 'Jalankan Reaksi';
    });
    const tag = root.querySelector('[data-setup-tag]');
    if (tag) tag.textContent = run.reactionRan ? 'REAKSI AKTIF' : 'SETUP';
    const strip = root.querySelector('.mission-strip');
    if (strip) {
      strip.outerHTML = missionStripMarkup(experiment, stageCount > 1 ? stageConfig().label.toUpperCase() : 'REACTION SETUP', `Target: ${stageTarget()?.name ?? ''}`);
    }
  }

  function updateBondSelection() {
    root.querySelectorAll('[data-bond-order]').forEach((button) => {
      const active = Number(button.dataset.bondOrder) === run.activeBond;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const label = root.querySelector('[data-active-bond-label]');
    if (label) label.textContent = run.activeBond === 1 ? 'IKATAN TUNGGAL' : run.activeBond === 2 ? 'IKATAN RANGKAP DUA' : 'IKATAN RANGKAP TIGA';
  }

  function syncUndo() {
    root.querySelectorAll('[data-action="undo"]').forEach((button) => {
      button.disabled = !run.canUndo || Boolean(run.resultReady);
    });
  }

  function loadReactant() {
    builder?.loadMolecule(moleculeGraph(stageConfig().reactant));
  }

  function runReactionFlow() {
    if (run.reactionRan || run.resultReady) return;
    if (!run.reagent) {
      showToast('Pilih reagen terlebih dahulu.', { type: 'info' });
      revealSheet('mission');
      return;
    }
    const stage = stageConfig();
    const result = runReaction({
      reactantGraph: moleculeGraph(stage.reactant),
      reagentId: run.reagent,
      conditions: run.conditions,
      stageEnol,
    });
    if (result.status !== 'matched') {
      if (result.code === 'WRONG_REAGENT') run.reagentMistakes += 1;
      else if (result.code && result.code !== 'NO_MATCH') run.conditionMistakes += 1;
      run.feedback = { ok: false, title: failureTitle(result.code), message: result.message ?? 'Reaksi tidak dapat berjalan.', candidates: result.candidates ?? null };
      renderIntel();
      revealSheet('hints');
      sfx.play('error');
      return;
    }
    const identified = identifyMolecule(result.product);
    if (identified?.id !== stage.targetProduct) {
      run.feedback = {
        ok: false,
        title: 'Jalur reaksi berbeda',
        message: `Kombinasi ini menghasilkan ${identified?.name ?? result.productName ?? 'produk lain'}, bukan ${stageTarget()?.name ?? stage.targetProduct}. ${result.notes[0] ?? ''} Sesuaikan reagen/kondisi.`,
        candidates: null,
      };
      renderIntel();
      revealSheet('hints');
      sfx.play('error');
      return;
    }
    run.reactionRan = true;
    run.reactionResult = result;
    const intermediateNote = result.intermediateName ? `Intermediate ${result.intermediateName} terbentuk. ` : '';
    run.feedback = { ok: true, title: 'Reaksi siap', message: `${result.notes.join(' ')} ${intermediateNote}Sekarang bangun ${identified.name} di kanvas.`, candidates: null };
    refreshSetup();
    renderIntel();
    sfx.play('success');
    showToast('Reaksi benar. Bangun produknya di kanvas.', { type: 'success' });
    if (isMobile()) setSheet(false);
    if (!reduceMotion && result.reactiveBond) {
      builder?.highlightAtoms([result.reactiveBond.a, result.reactiveBond.b]);
      window.setTimeout(() => { if (!disposed) builder?.clearHighlights(); }, 900);
    }
  }

  function advanceStage() {
    const stage = stageConfig();
    run.stageIndex += 1;
    const next = stageConfig();
    run.reagent = null;
    run.conditions = initConditions(next.conditionControls, next.conditions);
    run.reactionRan = false;
    run.reactionResult = null;
    run.feedback = { ok: true, title: 'Tahap selesai', message: `${stage.note ?? ''} Lanjut ke ${next.label}: pilih reagen dan kondisi tahap berikutnya.`, candidates: null };
    loadReactant();
    refreshSetup();
    renderIntel();
    sfx.play('success');
    showToast(next.label, { type: 'success' });
    builder?.clearHighlights();
    if (isMobile()) setSheet(false);
  }

  function finishExperiment(scoring, validationLayers) {
    const xp = experimentXp(experiment.difficulty, scoring.stars, run.hintsUsed);
    const summary = recordExperimentCompletion(experiment.id, {
      score: scoring.total,
      stars: scoring.stars,
      xp,
      hintsUsed: run.hintsUsed,
      attempts: run.failedChecks,
    });
    run.resultReady = {
      kind: 'reaction',
      experimentId: experiment.id,
      molecule: cloneMolecule(builder?.getMolecule() ?? { nodes: [], edges: [] }),
      score: scoring.total,
      breakdown: scoring.breakdown,
      breakdownMeta: { reagent: 20, conditions: 15, structure: 40, formula: 15, understanding: 10 },
      stars: scoring.stars,
      xp,
      hintsUsed: run.hintsUsed,
      failedChecks: run.failedChecks,
      summary,
      nextExperimentId: nextPlayableId(experiment),
    };
    run.locked = true;
    builder?.setLocked(true);
    builder?.clearHighlights();
    const overlay = root.querySelector('[data-stage-success]');
    overlay?.classList.add('is-visible');
    run.feedback = { ok: true, title: 'Produk valid', message: 'Eksperimen berhasil! Laporan reaksi siap dilihat.', layers: validationLayers, candidates: null };
    renderIntel();
    sfx.play('success');
    swapActionBarForReport(root);
    bumpHudXp(root, summary);
  }

  function runCheck() {
    if (run.resultReady) return;
    if (!run.reactionRan) {
      showToast('Jalankan reaksi terlebih dahulu sebelum memeriksa produk.', { type: 'info' });
      return;
    }
    const stage = stageConfig();
    const molecule = builder?.getMolecule() ?? { nodes: [], edges: [] };
    const validation = validateProduct({
      builtGraph: molecule,
      expectedGraph: moleculeGraph(stage.targetProduct),
      expectedCounts: run.reactionResult.expectedAtomCounts,
      rule: run.reactionResult.rule,
      reactiveBond: run.reactionResult.reactiveBond,
      stageEnol,
    });
    if (!validation.valid) {
      const failedLayer = validation.layers.find((layer) => !layer.ok);
      if (failedLayer?.id !== 'empty') run.failedChecks += 1;
      run.structureFailures += validation.structureFailures;
      run.valenceErrors += validation.valenceErrors;
      run.feedback = { ok: false, title: 'Produk belum valid', message: failedLayer?.message ?? 'Periksa struktur.', layers: validation.layers, candidates: null };
      renderIntel();
      revealSheet('hints');
      sfx.play(failedLayer?.id === 'empty' ? 'click' : 'error');
      if (run.failedChecks >= 3 && run.hintsShown < experiment.hints.length) {
        run.hintsShown = Math.max(run.hintsShown, 2);
        renderIntel();
        showToast('Petunjuk tambahan dibuka untuk membantumu.', { type: 'info' });
      }
      return;
    }

    if (stageCount > 1 && run.stageIndex < stageCount - 1) {
      advanceStage();
      return;
    }

    finishExperiment(scoreExperiment({
      reagentCorrect: run.reagentMistakes === 0,
      conditionsCorrect: run.conditionMistakes === 0,
      hasConditionControls,
      structureFailures: run.structureFailures,
      valenceErrors: run.valenceErrors,
      hintsUsed: run.hintsUsed,
    }), validation.layers);
  }

  function showHint() {
    if (run.resultReady) return;
    if (run.hintsShown >= experiment.hints.length) {
      showToast('Semua petunjuk sudah ditampilkan.', { type: 'info' });
      return;
    }
    run.hintsShown += 1;
    run.hintsUsed += 1;
    sfx.play('hint');
    renderIntel();
    const count = root.querySelector('[data-hint-count]');
    if (count) count.textContent = String(experiment.hints.length - run.hintsShown);
    revealSheet('hints');
  }

  function handleAction(action, target) {
    switch (action) {
      case 'map': navigate('addition-map', { zoneId: experiment.zone }); break;
      case 'briefing': navigate('addition-briefing', { experimentId: experiment.id }); break;
      case 'run': runReactionFlow(); break;
      case 'check': runCheck(); break;
      case 'hint': showHint(); break;
      case 'delete': if (!run.resultReady) builder?.deleteSelected(); break;
      case 'undo': builder?.undo(); break;
      case 'reset':
        if (!run.resultReady) { loadReactant(); run.feedback = null; renderIntel(); }
        break;
      case 'view-result': if (run.resultReady) navigate('addition-result', run.resultReady); break;
      case 'sheet-toggle': setSheet(); break;
      case 'sheet-close': setSheet(false); break;
      case 'sheet-tab': setSheet(true, target?.dataset?.sheetTab ?? run.sheetTab); break;
      default: break;
    }
  }

  renderScreen();

  root.addEventListener('click', (event) => {
    const reagentButton = event.target.closest('[data-reagent]');
    if (reagentButton && !reagentButton.disabled) {
      run.reagent = reagentButton.dataset.reagent;
      refreshSetup();
      sfx.play('click');
      return;
    }
    const catalystButton = event.target.closest('[data-catalyst]');
    if (catalystButton && !catalystButton.disabled) {
      run.conditions.catalyst = catalystButton.dataset.catalyst;
      refreshSetup();
      return;
    }
    const eqButton = event.target.closest('[data-equivalents]');
    if (eqButton && !eqButton.disabled) {
      run.conditions.equivalents = Number(eqButton.dataset.equivalents);
      refreshSetup();
      return;
    }
    const peroxideButton = event.target.closest('[data-peroxide]');
    if (peroxideButton && !peroxideButton.disabled) {
      run.conditions.peroxide = !run.conditions.peroxide;
      refreshSetup();
      return;
    }
    const atomButton = event.target.closest('[data-add-atom]');
    if (atomButton && !run.resultReady) {
      builder?.addAtom(atomButton.dataset.addAtom);
      return;
    }
    const bondButton = event.target.closest('[data-bond-order]');
    if (bondButton && !run.resultReady) {
      run.activeBond = Number(bondButton.dataset.bondOrder);
      builder?.setBondOrder(run.activeBond);
      updateBondSelection();
      return;
    }
    const zoomButton = event.target.closest('[data-grid-zoom]');
    if (zoomButton) {
      const mode = zoomButton.dataset.gridZoom;
      if (mode === 'in') builder?.zoomIn();
      else if (mode === 'out') builder?.zoomOut();
      else builder?.resetView();
      return;
    }
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget || actionTarget.disabled) return;
    handleAction(actionTarget.dataset.action, actionTarget);
  }, { signal });

  window.addEventListener('keydown', (event) => {
    if (isModalOpen()) return;
    if (event.key === 'Escape') { navigate('addition-map', { zoneId: experiment.zone }); return; }
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); builder?.undo(); return; }
    if (event.altKey || modifier) return;
    if (['1', '2', '3'].includes(event.key) && !run.resultReady) {
      run.activeBond = Number(event.key);
      builder?.setBondOrder(run.activeBond);
      updateBondSelection();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!run.resultReady) { event.preventDefault(); builder?.deleteSelected(); }
      return;
    }
    if (event.key.toLowerCase() === 'h') showHint();
  }, { signal });

  function mountBuilder() {
    if (disposed) return;
    const host = root.querySelector('[data-builder-host]');
    if (!host) return;
    try {
      builder = mountMoleculeBuilder(host, {
        onReady() {
          if (disposed) return;
          loadReactant();
          const state = root.querySelector('[data-grid-state]');
          if (state) state.innerHTML = '<span></span>GRID SIAP';
        },
        onUpdate({ analysis, canUndo }) {
          if (disposed) return;
          run.canUndo = Boolean(canUndo);
          updateInspector(analysis);
          syncUndo();
        },
        onToast(message) { if (!disposed) showToast(message, { type: 'info' }); },
        onAction(action) {
          if (disposed) return;
          if (action === 'place') sfx.play('place');
          else if (action === 'bond') sfx.play('bond');
          else if (action === 'delete') sfx.play('delete');
          if (run.feedback && !run.feedback.ok && !run.resultReady) { run.feedback = null; renderIntel(); }
        },
        onZoom(percent) {
          if (disposed) return;
          const label = root.querySelector('[data-zoom-label]');
          if (label) label.textContent = `${percent}%`;
        },
      });
      builder.setBondOrder(run.activeBond);
    } catch (error) {
      console.error('Gagal memuat reaction workspace:', error);
      const state = root.querySelector('[data-grid-state]');
      if (state) state.innerHTML = '<span></span>GRID OFFLINE';
    }
  }

  requestAnimationFrame(() => { if (!disposed) mountBuilder(); });

  return () => {
    disposed = true;
    abort.abort();
    if (builder) { builder.destroy(); builder = null; }
  };
}

// ---------------------------------------------------------------------------
// Kind: product-choice — kartu prediksi produk
// ---------------------------------------------------------------------------

function mountProductChoice(root, experiment) {
  const reactant = getMolecule(experiment.reactant);
  const controls = experiment.conditionControls ?? {};
  const hasConditionControls = Boolean(controls.catalyst || controls.equivalents || controls.peroxide);

  const run = {
    reagent: null,
    chosenProduct: null,
    conditions: initConditions(controls, experiment.conditions),
    locked: false,
    defaultIntel: {
      title: 'Rancang reaksinya.',
      body: 'Pilih reagen dan kondisi, prediksi produk yang dihasilkan, lalu tekan Periksa untuk memvalidasi pasangannya.',
    },
    hintsUsed: 0,
    hintsShown: 0,
    failedChecks: 0,
    feedback: null,
    resultReady: null,
    sheetOpen: false,
    sheetTab: 'mission',
  };

  const abort = new AbortController();
  const { signal } = abort;
  const mobileQuery = window.matchMedia?.('(max-width: 980px)');
  const isMobile = () => Boolean(mobileQuery?.matches);

  function setupBodyMarkup() {
    return `
      <div class="setup-reactant">
        <span class="section-label"><span>REAKTAN</span></span>
        <div class="setup-reactant__canvas">${renderStructureSVG(moleculeGraph(experiment.reactant), { className: 'structure-svg', ariaLabel: `Struktur ${reactant.name}` })}</div>
        <strong>${reactant.name}</strong><span>${reactant.formula}</span>
      </div>
      <div class="setup-section">
        <span class="section-label"><span>1 · PILIH REAGEN</span></span>
        <div class="reagent-grid" data-reagent-grid>${reagentOptionsMarkup(run, experiment)}</div>
      </div>
      <div class="setup-section">
        <span class="section-label"><span>2 · ATUR KONDISI</span></span>
        <div data-condition-controls>${conditionControlsMarkup(run, experiment)}</div>
      </div>
      <p class="condition-note">${icon('bulb', 14)} Prediksi produk dari reaksi yang kamu rancang, lalu tekan Periksa.</p>
    `;
  }

  function choiceSummaryMarkup() {
    if (!run.reagent) return '<span class="choice-summary__reagent">Pilih reagen…</span>';
    const reagent = REAGENTS[run.reagent];
    const conditionBits = [
      catalystName(run.conditions.catalyst),
      run.conditions.peroxide ? 'peroksida' : null,
      hasConditionControls || experiment.conditions ? `${run.conditions.equivalents} eq` : null,
    ].filter(Boolean);
    return `
      <span class="choice-summary__reagent">+ ${reagent.formula}</span>
      <span class="choice-summary__conditions">${escapeHTML(conditionBits.join(' · '))}</span>
      <span class="choice-summary__question">→ ?</span>`;
  }

  function productCardMarkup(option) {
    const chosen = run.chosenProduct === option.id;
    return `
      <button type="button" class="product-card ${chosen ? 'is-active' : ''}" data-product="${option.id}" aria-pressed="${chosen}" ${run.locked ? 'disabled' : ''}>
        <span class="product-card__radio" aria-hidden="true"></span>
        <span class="product-card__copy">
          <strong>${escapeHTML(option.label)}</strong>
          <span class="product-card__formula">${option.formula}</span>
          ${option.note ? `<span class="product-card__note">${escapeHTML(option.note)}</span>` : ''}
        </span>
      </button>`;
  }

  function screenMarkup() {
    return `
      <section class="screen game-screen addition-lab-screen" aria-label="Eksperimen ${experiment.id}: ${escapeHTML(experiment.title)}">
        ${topbarMarkup(experiment)}

        <main class="game-layout addition-layout">
          <aside class="briefing panel addition-setup" aria-label="Setup reaksi">
            <div class="panel-head panel-head--compact">
              <div><span class="eyebrow">${icon('flask', 13)} REACTION SETUP</span><span class="panel-code">${experiment.id}</span></div>
            </div>
            ${setupBodyMarkup()}
          </aside>

          ${missionStripMarkup(experiment, 'PRODUCT PREDICTION', escapeHTML(experiment.mission.split('.')[0]))}

          <section class="workspace workspace--choice panel" aria-label="Prediksi produk">
            <header class="workspace-head">
              <div><span class="eyebrow">${icon('flask', 13)} PRODUCT PREDICTION</span><h2>PILIH PRODUK</h2></div>
              <div class="workspace-head__status"><span class="active-bond">${experiment.productOptions.length} KANDIDAT</span></div>
            </header>
            <div class="choice-stage">
              <div class="choice-reaction">
                <div class="choice-reactant">
                  <div class="choice-reactant__canvas">${renderStructureSVG(moleculeGraph(experiment.reactant), { className: 'structure-svg', ariaLabel: `Struktur ${reactant.name}` })}</div>
                  <strong>${reactant.name}</strong><span>${reactant.formula}</span>
                </div>
                <div class="choice-summary" data-choice-summary>${choiceSummaryMarkup()}</div>
              </div>
              <div class="choice-cards" data-product-cards>${experiment.productOptions.map(productCardMarkup).join('')}</div>
            </div>
          </section>

          ${sheetShellMarkup(
            run,
            [
              { id: 'mission', label: 'Setup' },
              { id: 'hints', label: 'Petunjuk' },
            ],
            `
            <section class="mission-sheet panel addition-setup-sheet" data-sheet-panel="mission" aria-label="Setup reaksi">
              <div class="mission-sheet__head">
                <div><span class="eyebrow">${icon('flask', 13)} REACTION SETUP</span><strong>${experiment.id}</strong></div>
                <span class="mission-sheet__tag" data-setup-tag>${run.chosenProduct ? 'SIAP DIPERIKSA' : 'SETUP'}</span>
              </div>
              ${setupBodyMarkup()}
            </section>
            <section class="intel-panel panel" data-intel data-sheet-panel="hints" aria-live="polite">${feedbackMarkup(run)}${hintCardMarkup(experiment, run.hintsShown)}</section>`,
          )}

          <footer class="action-bar" aria-label="Action bar">
            <div class="action-note"><span class="action-note__icon">${icon('bulb', 18)}</span><div><strong>PREDIKSI PRODUK</strong><span>Pasangkan reagen + kondisi dengan produk yang benar.</span></div></div>
            <div class="action-tools action-tools--end">
              <button type="button" class="tool-btn tool-btn--util tool-btn--hint" data-action="hint" aria-label="Petunjuk"><span class="tool-btn__icon">${icon('bulb', 18)}</span><span class="tool-btn__label">Petunjuk</span><span class="tool-count" data-hint-count>${experiment.hints.length - run.hintsShown}</span></button>
              <button type="button" class="btn btn--primary action-check" data-action="check">${icon('check', 18)}<span>Periksa</span></button>
            </div>
          </footer>
        </main>

        ${sheetBackdropMarkup(run)}

        ${gameFooterMarkup('Pilih reagen & kondisi · pasangkan dengan produk · <kbd>H</kbd> petunjuk')}
      </section>
    `;
  }

  function renderScreen() {
    root.innerHTML = screenMarkup();
  }

  function setSheet(open, tab) {
    run.sheetOpen = typeof open === 'boolean' ? open : !run.sheetOpen;
    if (tab) run.sheetTab = tab;
    const stack = root.querySelector('.side-stack');
    const backdrop = root.querySelector('.sheet-backdrop');
    backdrop?.classList.toggle('is-open', run.sheetOpen);
    if (!stack) return;
    stack.classList.toggle('is-open', run.sheetOpen);
    stack.dataset.sheetTab = run.sheetTab;
    stack.querySelectorAll('[data-sheet-tab]').forEach((button) => {
      if (button.tagName !== 'BUTTON') return;
      const active = button.dataset.sheetTab === run.sheetTab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function revealSheet(tab) {
    if (isMobile()) setSheet(true, tab);
  }

  function renderIntel() {
    const target = root.querySelector('[data-intel]');
    if (target) target.innerHTML = feedbackMarkup(run) + hintCardMarkup(experiment, run.hintsShown);
  }

  function refreshSetup() {
    root.querySelectorAll('[data-reagent-grid]').forEach((grid) => {
      grid.innerHTML = reagentOptionsMarkup(run, experiment);
    });
    root.querySelectorAll('[data-condition-controls]').forEach((target) => {
      target.innerHTML = conditionControlsMarkup(run, experiment);
    });
    const summary = root.querySelector('[data-choice-summary]');
    if (summary) summary.innerHTML = choiceSummaryMarkup();
    const tag = root.querySelector('[data-setup-tag]');
    if (tag) tag.textContent = run.chosenProduct ? 'SIAP DIPERIKSA' : 'SETUP';
  }

  function refreshCards() {
    root.querySelectorAll('[data-product]').forEach((card) => {
      const active = card.dataset.product === run.chosenProduct;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', String(active));
    });
  }

  function finishExperiment(scoring) {
    const xp = experimentXp(experiment.difficulty, scoring.stars, run.hintsUsed);
    const summary = recordExperimentCompletion(experiment.id, {
      score: scoring.total,
      stars: scoring.stars,
      xp,
      hintsUsed: run.hintsUsed,
      attempts: run.failedChecks,
    });
    run.resultReady = {
      kind: 'product-choice',
      experimentId: experiment.id,
      molecule: moleculeGraph(experiment.targetProduct),
      score: scoring.total,
      breakdown: scoring.breakdown,
      breakdownMeta: { reagent: 25, conditions: 20, product: 45, understanding: 10 },
      stars: scoring.stars,
      xp,
      hintsUsed: run.hintsUsed,
      failedChecks: run.failedChecks,
      summary,
      nextExperimentId: nextPlayableId(experiment),
    };
    run.locked = true;
    run.feedback = { ok: true, title: 'Prediksi tepat', message: `${scoring.matchedOption?.label ?? ''} — pasangan reagen, kondisi, dan produk yang kamu pilih benar.`, candidates: null };
    renderIntel();
    sfx.play('success');
    swapActionBarForReport(root);
    bumpHudXp(root, summary);
  }

  function runCheck() {
    if (run.resultReady) return;
    if (!run.reagent) {
      showToast('Pilih reagen terlebih dahulu.', { type: 'info' });
      revealSheet('mission');
      return;
    }
    if (!run.chosenProduct) {
      showToast('Pilih salah satu kandidat produk.', { type: 'info' });
      return;
    }
    const scoring = scoreProductChoice({
      experiment,
      reagentId: run.reagent,
      conditions: run.conditions,
      chosenProductId: run.chosenProduct,
      hintsUsed: run.hintsUsed,
    });
    if (!scoring.correct) {
      run.failedChecks += 1;
      const chosenOption = (experiment.productOptions ?? []).find((option) => option.id === run.chosenProduct);
      const message = chosenOption
        ? `${chosenOption.label}: ${chosenOption.note ?? 'pasangan ini tidak cocok'}. Reagen/kondisi yang kamu pilih tidak menghasilkan produk ini.`
        : 'Produk ini bukan hasil reaksi adisi yang mungkin untuk eksperimen ini.';
      run.feedback = { ok: false, title: 'Prediksi belum tepat', message, candidates: null };
      renderIntel();
      revealSheet('hints');
      sfx.play('error');
      return;
    }
    finishExperiment(scoring);
  }

  function showHint() {
    if (run.resultReady) return;
    if (run.hintsShown >= experiment.hints.length) {
      showToast('Semua petunjuk sudah ditampilkan.', { type: 'info' });
      return;
    }
    run.hintsShown += 1;
    run.hintsUsed += 1;
    sfx.play('hint');
    renderIntel();
    const count = root.querySelector('[data-hint-count]');
    if (count) count.textContent = String(experiment.hints.length - run.hintsShown);
    revealSheet('hints');
  }

  function handleAction(action, target) {
    switch (action) {
      case 'map': navigate('addition-map', { zoneId: experiment.zone }); break;
      case 'briefing': navigate('addition-briefing', { experimentId: experiment.id }); break;
      case 'check': runCheck(); break;
      case 'hint': showHint(); break;
      case 'view-result': if (run.resultReady) navigate('addition-result', run.resultReady); break;
      case 'sheet-toggle': setSheet(); break;
      case 'sheet-close': setSheet(false); break;
      case 'sheet-tab': setSheet(true, target?.dataset?.sheetTab ?? run.sheetTab); break;
      default: break;
    }
  }

  renderScreen();

  root.addEventListener('click', (event) => {
    const reagentButton = event.target.closest('[data-reagent]');
    if (reagentButton && !reagentButton.disabled) {
      run.reagent = reagentButton.dataset.reagent;
      refreshSetup();
      sfx.play('click');
      return;
    }
    const catalystButton = event.target.closest('[data-catalyst]');
    if (catalystButton && !catalystButton.disabled) {
      run.conditions.catalyst = catalystButton.dataset.catalyst;
      refreshSetup();
      return;
    }
    const eqButton = event.target.closest('[data-equivalents]');
    if (eqButton && !eqButton.disabled) {
      run.conditions.equivalents = Number(eqButton.dataset.equivalents);
      refreshSetup();
      return;
    }
    const peroxideButton = event.target.closest('[data-peroxide]');
    if (peroxideButton && !peroxideButton.disabled) {
      run.conditions.peroxide = !run.conditions.peroxide;
      refreshSetup();
      return;
    }
    const productButton = event.target.closest('[data-product]');
    if (productButton && !productButton.disabled) {
      run.chosenProduct = productButton.dataset.product;
      refreshCards();
      sfx.play('click');
      return;
    }
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget || actionTarget.disabled) return;
    handleAction(actionTarget.dataset.action, actionTarget);
  }, { signal });

  window.addEventListener('keydown', (event) => {
    if (isModalOpen()) return;
    if (event.key === 'Escape') { navigate('addition-map', { zoneId: experiment.zone }); return; }
    if (event.key.toLowerCase() === 'h') showHint();
  }, { signal });

  return () => {
    abort.abort();
  };
}

// ---------------------------------------------------------------------------
// Kind: identify — kuis analisis struktur
// ---------------------------------------------------------------------------

function mountIdentify(root, experiment) {
  const reactant = getMolecule(experiment.reactant);

  const run = {
    answers: {},
    defaultIntel: {
      title: 'Analisis strukturnya.',
      body: 'Amati struktur senyawa, jawab semua pertanyaan kuis, lalu periksa jawabanmu. Petunjuk tersedia bila kamu tersesat.',
    },
    hintsUsed: 0,
    hintsShown: 0,
    feedback: null,
    resultReady: null,
    sheetOpen: false,
    sheetTab: 'mission',
  };

  const abort = new AbortController();
  const { signal } = abort;
  const mobileQuery = window.matchMedia?.('(max-width: 980px)');
  const isMobile = () => Boolean(mobileQuery?.matches);

  function answeredCount() {
    return experiment.quiz.filter((slot) => run.answers[slot.slot]).length;
  }

  function slotMarkup(slot, index) {
    const chosen = run.answers[slot.slot];
    return `
      <div class="quiz-slot" data-quiz-slot="${slot.slot}">
        <div class="quiz-slot__head">
          <span class="quiz-slot__num">${String(index + 1).padStart(2, '0')}</span>
          <span class="quiz-slot__cat">${escapeHTML(slot.category.toUpperCase())}</span>
          <span class="quiz-slot__pts">${slot.points} PTS</span>
        </div>
        <p class="quiz-slot__prompt">${escapeHTML(slot.prompt)}</p>
        <div class="quiz-choices" role="group" aria-label="${escapeHTML(slot.prompt)}">
          ${slot.choices.map((choice) => `<button type="button" class="quiz-choice ${chosen === choice ? 'is-active' : ''}" data-choice="${slot.slot}" data-value="${escapeHTML(choice)}" aria-pressed="${chosen === choice}">${escapeHTML(choice)}</button>`).join('')}
        </div>
      </div>`;
  }

  function setupBodyMarkup() {
    return `
      <div class="setup-reactant">
        <span class="section-label"><span>SENETELAH ANALISIS</span></span>
        <div class="setup-reactant__canvas">${renderStructureSVG(moleculeGraph(experiment.reactant), { className: 'structure-svg', ariaLabel: `Struktur ${reactant.name}` })}</div>
        <strong>${reactant.name}</strong><span>${reactant.formula}</span>
      </div>
      <p class="condition-note">${icon('book', 14)} ${escapeHTML(experiment.mission)}</p>
      <div class="setup-section">
        <span class="section-label"><span>TUJUAN BELAJAR</span></span>
        <ul class="objectives-list">${experiment.learningObjectives.map((objective) => `<li>${icon('check', 13)} ${escapeHTML(objective)}</li>`).join('')}</ul>
      </div>
    `;
  }

  function screenMarkup() {
    return `
      <section class="screen game-screen addition-lab-screen" aria-label="Eksperimen ${experiment.id}: ${escapeHTML(experiment.title)}">
        ${topbarMarkup(experiment)}

        <main class="game-layout addition-layout">
          <aside class="briefing panel addition-setup" aria-label="Misi analisis">
            <div class="panel-head panel-head--compact">
              <div><span class="eyebrow">${icon('book', 13)} ANALYSIS BRIEF</span><span class="panel-code">${experiment.id}</span></div>
            </div>
            ${setupBodyMarkup()}
          </aside>

          ${missionStripMarkup(experiment, 'ANALYSIS QUIZ', escapeHTML(experiment.mission.split('.')[0]))}

          <section class="workspace workspace--identify panel" aria-label="Kuis analisis struktur">
            <header class="workspace-head">
              <div><span class="eyebrow">${icon('book', 13)} ANALYSIS QUIZ</span><h2>ANALISIS STRUKTUR</h2></div>
              <div class="workspace-head__status"><span class="active-bond" data-quiz-progress>${answeredCount()}/${experiment.quiz.length} TERJAWAB</span></div>
            </header>
            <div class="identify-stage">
              <div class="identify-reactant">
                <div class="identify-reactant__canvas">${renderStructureSVG(moleculeGraph(experiment.reactant), { className: 'structure-svg', ariaLabel: `Struktur ${reactant.name}` })}</div>
                <strong>${reactant.name}</strong><span>${reactant.formula}</span>
              </div>
              <div class="identify-slots" data-quiz-slots>${experiment.quiz.map(slotMarkup).join('')}</div>
            </div>
          </section>

          ${sheetShellMarkup(
            run,
            [
              { id: 'mission', label: 'Misi' },
              { id: 'hints', label: 'Petunjuk' },
            ],
            `
            <section class="mission-sheet panel addition-setup-sheet" data-sheet-panel="mission" aria-label="Misi analisis">
              <div class="mission-sheet__head">
                <div><span class="eyebrow">${icon('book', 13)} ANALYSIS BRIEF</span><strong>${experiment.id}</strong></div>
                <span class="mission-sheet__tag" data-setup-tag>${answeredCount() === experiment.quiz.length ? 'SIAP DIPERIKSA' : 'QUIZ'}</span>
              </div>
              ${setupBodyMarkup()}
            </section>
            <section class="intel-panel panel" data-intel data-sheet-panel="hints" aria-live="polite">${feedbackMarkup(run)}${hintCardMarkup(experiment, run.hintsShown)}</section>`,
          )}

          <footer class="action-bar" aria-label="Action bar">
            <div class="action-note"><span class="action-note__icon">${icon('book', 18)}</span><div><strong>ANALISIS STRUKTUR</strong><span>Jawab semua pertanyaan, lalu periksa jawabanmu.</span></div></div>
            <div class="action-tools action-tools--end">
              <button type="button" class="tool-btn tool-btn--util tool-btn--hint" data-action="hint" aria-label="Petunjuk"><span class="tool-btn__icon">${icon('bulb', 18)}</span><span class="tool-btn__label">Petunjuk</span><span class="tool-count" data-hint-count>${experiment.hints.length - run.hintsShown}</span></button>
              <button type="button" class="btn btn--primary action-check" data-action="check">${icon('check', 18)}<span>Periksa Jawaban</span></button>
            </div>
          </footer>
        </main>

        ${sheetBackdropMarkup(run)}

        ${gameFooterMarkup('Jawab semua slot kuis · <kbd>H</kbd> petunjuk')}
      </section>
    `;
  }

  function renderScreen() {
    root.innerHTML = screenMarkup();
  }

  function setSheet(open, tab) {
    run.sheetOpen = typeof open === 'boolean' ? open : !run.sheetOpen;
    if (tab) run.sheetTab = tab;
    const stack = root.querySelector('.side-stack');
    const backdrop = root.querySelector('.sheet-backdrop');
    backdrop?.classList.toggle('is-open', run.sheetOpen);
    if (!stack) return;
    stack.classList.toggle('is-open', run.sheetOpen);
    stack.dataset.sheetTab = run.sheetTab;
    stack.querySelectorAll('[data-sheet-tab]').forEach((button) => {
      if (button.tagName !== 'BUTTON') return;
      const active = button.dataset.sheetTab === run.sheetTab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function revealSheet(tab) {
    if (isMobile()) setSheet(true, tab);
  }

  function renderIntel() {
    const target = root.querySelector('[data-intel]');
    if (target) target.innerHTML = feedbackMarkup(run) + hintCardMarkup(experiment, run.hintsShown);
  }

  function refreshProgress() {
    const progress = root.querySelector('[data-quiz-progress]');
    if (progress) progress.textContent = `${answeredCount()}/${experiment.quiz.length} TERJAWAB`;
    const tag = root.querySelector('[data-setup-tag]');
    if (tag) tag.textContent = answeredCount() === experiment.quiz.length ? 'SIAP DIPERIKSA' : 'QUIZ';
    root.querySelectorAll('[data-quiz-slot]').forEach((slotEl) => {
      const slot = experiment.quiz.find((entry) => entry.slot === slotEl.dataset.quizSlot);
      if (!slot) return;
      const chosen = run.answers[slot.slot];
      slotEl.querySelectorAll('[data-choice]').forEach((choiceButton) => {
        const active = choiceButton.dataset.value === chosen;
        choiceButton.classList.toggle('is-active', active);
        choiceButton.setAttribute('aria-pressed', String(active));
      });
    });
  }

  function finishExperiment(scoring) {
    const xp = experimentXp(experiment.difficulty, scoring.stars, run.hintsUsed);
    const summary = recordExperimentCompletion(experiment.id, {
      score: scoring.total,
      stars: scoring.stars,
      xp,
      hintsUsed: run.hintsUsed,
      attempts: 0,
    });
    run.resultReady = {
      kind: 'identify',
      experimentId: experiment.id,
      molecule: moleculeGraph(experiment.reactant),
      score: scoring.total,
      breakdown: null,
      slots: scoring.perSlot,
      slotPenalty: scoring.penalty,
      stars: scoring.stars,
      xp,
      hintsUsed: run.hintsUsed,
      failedChecks: 0,
      summary,
      nextExperimentId: nextPlayableId(experiment),
    };
    run.feedback = {
      ok: true,
      title: 'Analisis tersimpan',
      message: `${scoring.perSlot.filter((slot) => slot.correct).length}/${scoring.perSlot.length} jawaban benar. Skor ${scoring.total}/100 setelah penalti petunjuk.`,
      candidates: null,
    };
    renderIntel();
    sfx.play('success');
    swapActionBarForReport(root);
    bumpHudXp(root, summary);
    root.querySelectorAll('[data-choice]').forEach((button) => { button.disabled = true; });
  }

  function runCheck() {
    if (run.resultReady) return;
    const unanswered = experiment.quiz.filter((slot) => !run.answers[slot.slot]);
    if (unanswered.length) {
      showToast(`Jawab ${unanswered.length} pertanyaan tersisa.`, { type: 'info' });
      return;
    }
    finishExperiment(scoreIdentify({ experiment, answers: run.answers, hintsUsed: run.hintsUsed }));
  }

  function showHint() {
    if (run.resultReady) return;
    if (run.hintsShown >= experiment.hints.length) {
      showToast('Semua petunjuk sudah ditampilkan.', { type: 'info' });
      return;
    }
    run.hintsShown += 1;
    run.hintsUsed += 1;
    sfx.play('hint');
    renderIntel();
    const count = root.querySelector('[data-hint-count]');
    if (count) count.textContent = String(experiment.hints.length - run.hintsShown);
    revealSheet('hints');
  }

  function handleAction(action, target) {
    switch (action) {
      case 'map': navigate('addition-map', { zoneId: experiment.zone }); break;
      case 'briefing': navigate('addition-briefing', { experimentId: experiment.id }); break;
      case 'check': runCheck(); break;
      case 'hint': showHint(); break;
      case 'view-result': if (run.resultReady) navigate('addition-result', run.resultReady); break;
      case 'sheet-toggle': setSheet(); break;
      case 'sheet-close': setSheet(false); break;
      case 'sheet-tab': setSheet(true, target?.dataset?.sheetTab ?? run.sheetTab); break;
      default: break;
    }
  }

  renderScreen();

  root.addEventListener('click', (event) => {
    const choiceButton = event.target.closest('[data-choice]');
    if (choiceButton && !choiceButton.disabled) {
      run.answers[choiceButton.dataset.choice] = choiceButton.dataset.value;
      refreshProgress();
      sfx.play('click');
      return;
    }
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget || actionTarget.disabled) return;
    handleAction(actionTarget.dataset.action, actionTarget);
  }, { signal });

  window.addEventListener('keydown', (event) => {
    if (isModalOpen()) return;
    if (event.key === 'Escape') { navigate('addition-map', { zoneId: experiment.zone }); return; }
    if (event.key.toLowerCase() === 'h') showHint();
  }, { signal });

  return () => {
    abort.abort();
  };
}

// ---------------------------------------------------------------------------

export function mountAdditionLab(root, params = {}) {
  const experiment = getExperiment(params.experimentId);
  if (!experiment || !isExperimentUnlocked(experiment.id)) {
    navigate('addition-map');
    return () => {};
  }
  if (experiment.kind === 'identify') return mountIdentify(root, experiment);
  if (experiment.kind === 'product-choice') return mountProductChoice(root, experiment);
  return mountReaction(root, experiment);
}
