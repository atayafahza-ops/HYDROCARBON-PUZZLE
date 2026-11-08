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
import { resolveReaction, expectedAtomCounts } from '../engine/reactionEngine.js';
import { validateProduct, scoreExperiment, experimentXp } from '../engine/reactionValidator.js';

const ATOM_TOOLS = [
  { element: 'C', label: 'C', key: 'A' },
  { element: 'O', label: 'O', key: 'O' },
  { element: 'Br', label: 'Br', key: 'B' },
  { element: 'Cl', label: 'Cl', key: 'C' },
  { element: 'I', label: 'I', key: 'I' },
];

function reagentOptionsMarkup(run) {
  return Object.values(REAGENTS)
    .map(
      (reagent) => `
        <button type="button" class="reagent-chip ${run.reagent === reagent.id ? 'is-active' : ''}" data-reagent="${reagent.id}" aria-pressed="${run.reagent === reagent.id}" ${run.reactionRan ? 'disabled' : ''}>
          <strong>${reagent.formula}</strong><span>${reagent.name}</span>
        </button>`,
    )
    .join('');
}

function conditionControlsMarkup(run, experiment) {
  const controls = experiment.conditionControls;
  const parts = [];
  if (controls.catalyst) {
    parts.push(`
      <div class="condition-field">
        <span class="condition-field__label">KATALIS</span>
        <div class="condition-options">
          ${controls.catalyst.map((id) => `<button type="button" class="condition-chip ${run.conditions.catalyst === id ? 'is-active' : ''}" data-catalyst="${id}" ${run.reactionRan ? 'disabled' : ''}>${catalystName(id)}</button>`).join('')}
        </div>
      </div>`);
  }
  if (controls.equivalents) {
    parts.push(`
      <div class="condition-field">
        <span class="condition-field__label">EKUIVALEN</span>
        <div class="condition-options">
          ${controls.equivalents.map((value) => `<button type="button" class="condition-chip ${run.conditions.equivalents === value ? 'is-active' : ''}" data-equivalents="${value}" ${run.reactionRan ? 'disabled' : ''}>${value} eq</button>`).join('')}
        </div>
      </div>`);
  }
  if (controls.peroxide) {
    parts.push(`
      <div class="condition-field">
        <span class="condition-field__label">PEROKSIDA</span>
        <div class="condition-options">
          <button type="button" class="condition-chip ${run.conditions.peroxide ? 'is-active' : ''}" data-peroxide="toggle" aria-pressed="${run.conditions.peroxide}" ${run.reactionRan ? 'disabled' : ''}>${run.conditions.peroxide ? 'ON' : 'OFF'}</button>
        </div>
      </div>`);
  }
  if (!parts.length) {
    return `<p class="condition-note">${icon('info', 14)} Eksperimen ini tidak memerlukan pengaturan kondisi khusus.</p>`;
  }
  return parts.join('');
}

function feedbackMarkup(run) {
  if (!run.feedback) {
    return `
      <div class="intel-default">
        <span class="intel-default__icon">${icon('flask', 24)}</span>
        <div><span class="eyebrow">PROTOKOL</span><strong>${run.reactionRan ? 'Bangun produknya.' : 'Pilih reagen & kondisi.'}</strong>
        <p>${run.reactionRan ? 'Tambahkan atom gugus yang masuk, lalu sesuaikan ikatan rangkap. Periksa untuk memvalidasi.' : 'Pilih reagen, atur kondisi, lalu tekan Jalankan Reaksi untuk melihat jalur yang benar.'}</p></div>
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
      ${run.feedback.layers ? `<ul class="validation-layers">${run.feedback.layers.map((layer) => `<li class="${layer.ok ? 'is-ok' : 'is-fail'}">${icon(layer.ok ? 'check' : 'close', 13)}<span>${layer.label}</span></li>`).join('')}</ul>` : ''}
    </div>`;
}

function setupBodyMarkup(run, experiment) {
  const reactant = getMolecule(experiment.reactant);
  const product = getMolecule(experiment.targetProduct);
  return `
    <div class="setup-reactant">
      <span class="section-label"><span>REAKTAN</span></span>
      <div class="setup-reactant__canvas">${renderStructureSVG(reactant, { className: 'structure-svg', ariaLabel: `Struktur ${reactant.name}` })}</div>
      <strong>${reactant.name}</strong><span>${reactant.formula}</span>
    </div>
    <div class="setup-section">
      <span class="section-label"><span>1 · PILIH REAGEN</span></span>
      <div class="reagent-grid" data-reagent-grid>${reagentOptionsMarkup(run)}</div>
    </div>
    <div class="setup-section">
      <span class="section-label"><span>2 · ATUR KONDISI</span></span>
      <div data-condition-controls>${conditionControlsMarkup(run, experiment)}</div>
    </div>
    <button type="button" class="btn btn--primary setup-run" data-action="run" ${run.reactionRan ? 'disabled' : ''}>
      ${icon('play', 17)}<span>${run.reactionRan ? 'Reaksi Berjalan' : 'Jalankan Reaksi'}</span>
    </button>
    <div class="setup-target">
      <span class="section-label"><span>PRODUK TARGET</span></span>
      <strong>${product.name}</strong><span>${product.formula}</span>
    </div>
  `;
}

function missionStripMarkup(experiment) {
  const product = getMolecule(experiment.targetProduct);
  return `
    <button type="button" class="mission-strip" data-action="sheet-tab" data-sheet-tab="mission" aria-label="Buka setup reaksi ${escapeHTML(experiment.title)}">
      <span class="mission-strip__icon">${icon('flask', 18)}</span>
      <span class="mission-strip__copy">
        <span class="mission-strip__meta">${experiment.id} · REACTION SETUP</span>
        <strong>Target: ${escapeHTML(product.name)}</strong>
      </span>
      <span class="mission-strip__cta">Setup reaksi ${icon('chevron-right', 15)}</span>
    </button>
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

function hintMarkup(run, experiment) {
  if (run.hintsShown <= 0) return '';
  return `
    <div class="hint-card">
      <div class="hint-card__head"><span>${icon('bulb', 16)} PETUNJUK ${run.hintsShown}/${experiment.hints.length}</span></div>
      <p>${escapeHTML(experiment.hints[run.hintsShown - 1])}</p>
      <div class="hint-dots">${experiment.hints.map((_, index) => `<span class="${index < run.hintsShown ? 'is-on' : ''}"></span>`).join('')}</div>
    </div>`;
}

export function mountAdditionLab(root, params = {}) {
  const experiment = getExperiment(params.experimentId);
  if (!experiment || !isExperimentUnlocked(experiment.id)) {
    navigate('addition-map');
    return () => {};
  }
  const product = getMolecule(experiment.targetProduct);
  const controls = experiment.conditionControls;
  const hasConditionControls = Boolean(controls.catalyst || controls.equivalents || controls.peroxide);

  const run = {
    reagent: null,
    conditions: {
      catalyst: controls.catalyst ? controls.catalyst[0] : experiment.conditions.catalyst,
      equivalents: controls.equivalents ? controls.equivalents[0] : experiment.conditions.equivalents,
      peroxide: false,
    },
    reactionRan: false,
    reactionResult: null,
    hintsUsed: 0,
    hintsShown: 0,
    failedChecks: 0,
    structureFailures: 0,
    valenceErrors: 0,
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

  function conditionsCorrect() {
    if (!hasConditionControls) return true;
    const target = experiment.conditions;
    if (controls.catalyst && run.conditions.catalyst !== target.catalyst) return false;
    if (controls.equivalents && run.conditions.equivalents !== target.equivalents) return false;
    if (controls.peroxide && run.conditions.peroxide !== target.peroxide) return false;
    return true;
  }

  function screenMarkup() {
    return `
      <section class="screen game-screen addition-lab-screen" aria-label="Eksperimen ${experiment.id}: ${experiment.title}">
        <header class="game-topbar">
          <div class="game-topbar__left">
            <button type="button" class="icon-btn game-back" data-action="map" aria-label="Kembali ke peta">${icon('arrow-left', 19)}<span>PETA</span></button>
            <div class="game-heading">
              <span class="eyebrow">${experiment.id} <span class="slash">//</span> ${escapeHTML(experiment.category.toUpperCase())}</span>
              <div class="game-heading__line"><h1>${escapeHTML(experiment.title)}</h1><span class="badge badge--outline">ADDITION LAB</span></div>
            </div>
          </div>
          <div class="game-topbar__right">
            <span class="hud-xp" data-hud-xp title="Total XP Addition Lab">${icon('spark', 14)}<strong>${getAdditionTotalXp()}</strong><small>XP</small></span>
            <span class="topbar-sep" aria-hidden="true"></span>
            <button type="button" class="icon-btn icon-btn--ghost" data-action="briefing" aria-label="Lihat briefing">${icon('info', 19)}</button>
          </div>
        </header>

        <main class="game-layout addition-layout">
          <aside class="briefing panel addition-setup" aria-label="Setup reaksi">
            <div class="panel-head panel-head--compact">
              <div><span class="eyebrow">${icon('flask', 13)} REACTION SETUP</span><span class="panel-code">${experiment.id}</span></div>
            </div>
            ${setupBodyMarkup(run, experiment)}
          </aside>

          ${missionStripMarkup(experiment)}

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

          <aside class="side-stack ${run.sheetOpen ? 'is-open' : ''}" data-sheet-tab="${run.sheetTab}" id="addition-mobile-sheet" aria-label="Inspector dan feedback">
            <div class="sheet-head">
              <button type="button" class="sheet-toggle" data-action="sheet-toggle" aria-expanded="${run.sheetOpen}">
                <span class="sheet-grip" aria-hidden="true"></span>
                <span class="sheet-toggle__label">${icon('atom', 17)} Inspector &amp; petunjuk</span>
                <span class="sheet-toggle__chevron">${icon('chevron-left', 16)}</span>
              </button>
              <div class="sheet-tabs" role="tablist">
                <button type="button" role="tab" class="sheet-tab ${run.sheetTab === 'mission' ? 'is-active' : ''}" data-action="sheet-tab" data-sheet-tab="mission" aria-selected="${run.sheetTab === 'mission'}">Setup</button>
                <button type="button" role="tab" class="sheet-tab ${run.sheetTab === 'readout' ? 'is-active' : ''}" data-action="sheet-tab" data-sheet-tab="readout" aria-selected="${run.sheetTab === 'readout'}">Inspector</button>
                <button type="button" role="tab" class="sheet-tab ${run.sheetTab === 'hints' ? 'is-active' : ''}" data-action="sheet-tab" data-sheet-tab="hints" aria-selected="${run.sheetTab === 'hints'}">Petunjuk</button>
              </div>
            </div>
            <section class="mission-sheet panel addition-setup-sheet" data-sheet-panel="mission" aria-label="Setup reaksi">
              <div class="mission-sheet__head">
                <div><span class="eyebrow">${icon('flask', 13)} REACTION SETUP</span><strong>${experiment.id}</strong></div>
                <span class="mission-sheet__tag" data-setup-tag>${run.reactionRan ? 'REAKSI AKTIF' : 'SETUP'}</span>
              </div>
              ${setupBodyMarkup(run, experiment)}
            </section>
            <section class="inspector panel" data-inspector data-sheet-panel="readout">
              <div class="inspector-head"><div><span class="eyebrow">${icon('target', 13)} READOUT</span><h2>INSPECTOR</h2></div><span class="live-tag"><span></span>LIVE</span></div>
              <div class="inspector-counts" data-inspector-counts>${countCellsMarkup(analyzeMolecule({ nodes: [], edges: [] }))}</div>
              <div class="formula-readout"><span class="formula-readout__label">RUMUS</span><strong class="formula-readout__value" data-inspector-formula>—</strong></div>
              <div class="inspector-status inspector-status--neutral" data-inspector-status>${labStatusMarkup(labStatus(analyzeMolecule({ nodes: [], edges: [] })))}</div>
            </section>
            <section class="intel-panel panel" data-intel data-sheet-panel="hints" aria-live="polite">${feedbackMarkup(run)}${hintMarkup(run, experiment)}</section>
          </aside>

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

        <button type="button" class="sheet-backdrop ${run.sheetOpen ? 'is-open' : ''}" data-action="sheet-close" tabindex="-1" aria-hidden="true"></button>

        <footer class="game-footer">
          <span class="game-keys">${icon('info', 13)} Tambah atom gugus yang masuk · sesuaikan ikatan · <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>H</kbd> petunjuk</span>
          <span class="game-autosave">${icon('database', 13)} Progres tersimpan setelah eksperimen selesai</span>
        </footer>
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
    if (target) target.innerHTML = feedbackMarkup(run) + hintMarkup(run, experiment);
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
      grid.innerHTML = reagentOptionsMarkup(run);
    });
    root.querySelectorAll('[data-condition-controls]').forEach((target) => {
      target.innerHTML = conditionControlsMarkup(run, experiment);
    });
    root.querySelectorAll('[data-action="run"]').forEach((runButton) => {
      runButton.disabled = run.reactionRan;
      runButton.querySelector('span').textContent = run.reactionRan ? 'Reaksi Berjalan' : 'Jalankan Reaksi';
    });
    const tag = root.querySelector('[data-setup-tag]');
    if (tag) tag.textContent = run.reactionRan ? 'REAKSI AKTIF' : 'SETUP';
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
    builder?.loadMolecule(moleculeGraph(experiment.reactant));
  }

  function runReaction() {
    if (run.reactionRan || run.resultReady) return;
    if (!run.reagent) {
      showToast('Pilih reagen terlebih dahulu.', { type: 'info' });
      revealSheet('mission');
      return;
    }
    const result = resolveReaction(moleculeGraph(experiment.reactant), run.reagent, run.conditions);
    if (!result.ok) {
      run.feedback = { ok: false, title: 'Kondisi tidak tepat', message: `${result.message} ${result.suggestion ?? ''}` };
      renderIntel();
      revealSheet('hints');
      sfx.play('error');
      return;
    }
    const identified = identifyMolecule(result.product);
    if (identified?.id !== experiment.targetProduct) {
      run.feedback = {
        ok: false,
        title: 'Jalur reaksi berbeda',
        message: `Kombinasi ini menghasilkan ${identified?.name ?? 'produk lain'}, bukan ${product.name}. ${result.notes[0] ?? ''} Sesuaikan reagen/kondisi.`,
      };
      renderIntel();
      revealSheet('hints');
      sfx.play('error');
      return;
    }
    run.reactionRan = true;
    run.reactionResult = result;
    run.feedback = { ok: true, title: 'Reaksi siap', message: `${result.notes.join(' ')} Sekarang bangun struktur ${product.name} di kanvas.` };
    refreshSetup();
    renderIntel();
    sfx.play('success');
    showToast('Reaksi benar. Bangun produknya di kanvas.', { type: 'success' });
    if (isMobile()) setSheet(false);
    if (!reduceMotion) {
      builder?.highlightAtoms([result.reactiveBond.a, result.reactiveBond.b]);
      window.setTimeout(() => { if (!disposed) builder?.clearHighlights(); }, 900);
    }
  }

  function runCheck() {
    if (run.resultReady) return;
    if (!run.reactionRan) {
      showToast('Jalankan reaksi terlebih dahulu sebelum memeriksa produk.', { type: 'info' });
      return;
    }
    const molecule = builder?.getMolecule() ?? { nodes: [], edges: [] };
    const expected = expectedAtomCounts(moleculeGraph(experiment.reactant), run.reagent, run.reactionResult.rule);
    const validation = validateProduct(molecule, expected, moleculeGraph(experiment.targetProduct));
    if (!validation.valid) {
      const failedLayer = validation.layers.find((layer) => !layer.ok);
      if (failedLayer?.id !== 'empty') run.failedChecks += 1;
      run.structureFailures += validation.structureFailures;
      run.valenceErrors += validation.valenceErrors;
      run.feedback = { ok: false, title: 'Produk belum valid', message: failedLayer?.message ?? 'Periksa struktur.', layers: validation.layers };
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

    const score = scoreExperiment({
      reagentCorrect: run.reagent === experiment.reagent,
      conditionsCorrect: conditionsCorrect(),
      hasConditionControls,
      structureFailures: run.structureFailures,
      valenceErrors: run.valenceErrors,
      hintsUsed: run.hintsUsed,
    });
    const xp = experimentXp(experiment.difficulty, score.stars, run.hintsUsed);
    const summary = recordExperimentCompletion(experiment.id, {
      score: score.total,
      stars: score.stars,
      xp,
      hintsUsed: run.hintsUsed,
      attempts: run.failedChecks,
    });
    const nextExperiment = EXPERIMENTS[getExperimentIndex(experiment.id) + 1] ?? null;
    run.resultReady = {
      experimentId: experiment.id,
      molecule: cloneMolecule(molecule),
      score: score.total,
      breakdown: score.breakdown,
      stars: score.stars,
      xp,
      hintsUsed: run.hintsUsed,
      failedChecks: run.failedChecks,
      summary,
      nextExperimentId: nextExperiment?.id ?? null,
    };
    builder?.setLocked(true);
    builder?.clearHighlights();
    const overlay = root.querySelector('[data-stage-success]');
    overlay?.classList.add('is-visible');
    run.feedback = { ok: true, title: 'Produk valid', message: 'Eksperimen berhasil! Lihat laporan hasilnya.', layers: validation.layers };
    renderIntel();
    sfx.play('success');
    const actionBar = root.querySelector('.action-bar');
    if (actionBar) {
      actionBar.innerHTML = `
        <div class="action-note action-note--success"><span class="action-note__icon">${icon('check', 18)}</span><div><strong>EKSPERIMEN SELESAI</strong><span>Lihat laporan reaksi dan bintangmu.</span></div></div>
        <button type="button" class="btn btn--primary action-cta" data-action="view-result"><span>Lihat Laporan</span>${icon('arrow-right', 18)}</button>`;
    }
    const xpTarget = root.querySelector('[data-hud-xp] strong');
    if (xpTarget && Number.isFinite(summary?.totalXp)) xpTarget.textContent = String(summary.totalXp);
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
      case 'run': runReaction(); break;
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