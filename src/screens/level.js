import { navigate } from '../ui/router.js';
import { icon } from '../ui/icons.js';
import { escapeHTML, starsHTML } from '../ui/helpers.js';
import { formulaHTML, formulaUnicode } from '../chemistry/formula.js';
import { analyzeMolecule, cloneMolecule } from '../chemistry/graph.js';
import { describeStructure, formatNameTokens } from '../chemistry/nomenclature.js';
import { validateBuild, validateName } from '../chemistry/validator.js';
import { renderStructureSVG } from '../ui/structure.js';
import { mountMoleculeBuilder } from '../game/builder.js';
import { getLevel, getNextLevel } from '../data/levels.js';
import { calculateStars } from '../systems/score.js';
import { getSave, getTotalXp, recordCompletion } from '../systems/save.js';
import { sfx } from '../systems/audio.js';
import { showToast } from '../ui/toast.js';
import { isModalOpen } from '../ui/modal.js';
import {
  openIntroModal,
  openPauseModal,
} from '../ui/dialogs.js';

const BOND_LABELS = {
  1: 'IKATAN TUNGGAL',
  2: 'IKATAN RANGKAP DUA',
  3: 'IKATAN RANGKAP TIGA',
};

const CATEGORY_LABELS = {
  alkana: 'Alkana',
  alkena: 'Alkena',
  alkuna: 'Alkuna',
  campuran: 'Campuran',
};

const EMPTY_MOLECULE = { nodes: [], edges: [] };

function targetFormula(level) {
  if (level.target.formula) {
    return formulaHTML(level.target.formula.carbon, level.target.formula.hydrogen);
  }
  if (level.namePuzzle?.displayGraph) {
    const analysis = analyzeMolecule(level.namePuzzle.displayGraph);
    return formulaHTML(analysis.carbonCount, analysis.hydrogenCount);
  }
  return '—';
}

function targetMarkup(level) {
  const target = level.target;
  const formula = targetFormula(level);
  if (target.kind === 'formula') {
    return `
      <div class="target-card target-card--formula">
        <span class="target-card__label">${target.label}</span>
        <strong class="target-card__value target-card__value--formula">${formula}</strong>
        <div class="target-card__chips">
          <span class="chip chip--accent">${target.category}</span>
          <span class="chip">Rantai terbuka</span>
        </div>
        ${target.clue ? `<div class="target-card__clue">${icon('target', 14)}<span>${target.clue}</span></div>` : ''}
      </div>
    `;
  }
  if (target.kind === 'structure') {
    return `
      <div class="target-card target-card--structure">
        <span class="target-card__label">${target.label}</span>
        <strong class="target-card__value target-card__value--decode">NAMA?</strong>
        <div class="target-card__chips">
          <span class="chip chip--accent">${target.category}</span>
          <span class="chip">${formula}</span>
        </div>
        ${target.clue ? `<div class="target-card__clue">${icon('eye', 14)}<span>${target.clue}</span></div>` : ''}
      </div>
    `;
  }
  return `
    <div class="target-card target-card--name">
      <span class="target-card__label">${target.label}</span>
      <strong class="target-card__value">${target.name}</strong>
      <div class="target-card__chips">
        <span class="chip chip--accent">${target.category}</span>
        <span class="chip">${formula}</span>
      </div>
    </div>
  `;
}

function inspectorStatus(analysis) {
  if (analysis.carbonCount === 0) {
    return { tone: 'neutral', label: 'STANDBY', title: 'Grid kosong', detail: 'Tambahkan atom C untuk memulai.' };
  }
  if (!analysis.connected) {
    return { tone: 'warn', label: 'PERHATIAN', title: 'Belum terhubung', detail: 'Satukan semua atom menjadi satu molekul.' };
  }
  if (analysis.invalidValence) {
    return { tone: 'error', label: 'VALENSI', title: 'Valensi terlampaui', detail: 'Total orde ikatan tidak boleh lebih dari 4.' };
  }
  if (!analysis.acyclic) {
    return { tone: 'warn', label: 'RANTAI', title: 'Struktur siklik', detail: 'Misi ini hanya menerima rantai terbuka.' };
  }
  return { tone: 'ready', label: 'SIAP', title: 'Siap diperiksa', detail: 'Tekan Periksa untuk memvalidasi target.' };
}

function statusMarkup(status) {
  return `
    <span class="status-lamp status-lamp--${status.tone}"></span>
    <div class="status-copy">
      <span>${status.label}</span>
      <strong>${status.title}</strong>
      <small>${status.detail}</small>
    </div>
  `;
}

function sheetMarkup(run) {
  const readoutLabel = run.phase === 'name' ? 'Token' : 'Inspector';
  return `
    <div class="sheet-head">
      <button type="button" class="sheet-toggle" data-action="sheet-toggle" aria-expanded="${run.sheetOpen}" aria-controls="game-mobile-sheet">
        <span class="sheet-grip" aria-hidden="true"></span>
        <span class="sheet-toggle__label">${run.phase === 'name' ? `${icon('database', 17)} Token & nama` : `${icon('atom', 17)} Inspector molekul`}</span>
        <span class="sheet-toggle__chevron">${icon('chevron-left', 16)}</span>
      </button>
      <div class="sheet-tabs" role="tablist" aria-label="Panel misi">
        <button type="button" role="tab" class="sheet-tab ${run.sheetTab === 'mission' ? 'is-active' : ''}" data-action="sheet-tab" data-sheet-tab="mission" aria-selected="${run.sheetTab === 'mission'}">
          ${icon('terminal', 15)} Misi
        </button>
        <button type="button" role="tab" class="sheet-tab ${run.sheetTab === 'readout' ? 'is-active' : ''}" data-action="sheet-tab" data-sheet-tab="readout" aria-selected="${run.sheetTab === 'readout'}">
          ${icon(run.phase === 'name' ? 'database' : 'target', 15)} ${readoutLabel}
        </button>
        <button type="button" role="tab" class="sheet-tab ${run.sheetTab === 'hints' ? 'is-active' : ''}" data-action="sheet-tab" data-sheet-tab="hints" aria-selected="${run.sheetTab === 'hints'}">
          ${icon('bulb', 15)} Petunjuk
        </button>
      </div>
    </div>
  `;
}

function inspectorMarkup(analysis) {
  const status = inspectorStatus(analysis);
  return `
    <div class="inspector-head">
      <div>
        <span class="eyebrow">${icon('target', 13)} READOUT</span>
        <h2>MOLECULAR INSPECTOR</h2>
      </div>
      <span class="live-tag"><span></span>LIVE</span>
    </div>

    <div class="inspector-counts">
      <div class="count-cell">
        <span class="count-cell__label">JUMLAH C</span>
        <strong data-inspector-c>${analysis.carbonCount}</strong>
      </div>
      <div class="count-cell">
        <span class="count-cell__label">JUMLAH H</span>
        <strong data-inspector-h>${analysis.hydrogenCount}</strong>
      </div>
    </div>

    <div class="formula-readout">
      <span class="formula-readout__label">RUMUS MOLEKUL</span>
      <strong class="formula-readout__value" data-inspector-formula>${formulaHTML(analysis.carbonCount, analysis.hydrogenCount, { empty: '—' })}</strong>
      <span class="formula-readout__category" data-inspector-category>${CATEGORY_LABELS[analysis.category] ?? '—'}</span>
    </div>

    <div class="bond-readout">
      <div class="bond-row"><span class="bond-row__name">${icon('bond1', 18)} Tunggal</span><strong data-bond-single>${analysis.bondCounts.single}</strong></div>
      <div class="bond-row"><span class="bond-row__name">${icon('bond2', 18)} Rangkap dua</span><strong data-bond-double>${analysis.bondCounts.double}</strong></div>
      <div class="bond-row"><span class="bond-row__name">${icon('bond3', 18)} Rangkap tiga</span><strong data-bond-triple>${analysis.bondCounts.triple}</strong></div>
    </div>

    <div class="inspector-status inspector-status--${status.tone}" data-inspector-status>
      ${statusMarkup(status)}
    </div>
    <p class="inspector-footnote">${icon('info', 14)} Posisi atom tidak mengubah validasi.</p>
  `;
}

function slotMarkup(run, level) {
  const labels = level.namePuzzle.slotLabels ?? [];
  return run.slots
    .map((slot, index) => {
      const locked = run.nameValidated || Boolean(run.resultReady);
      return `
        <button type="button" class="name-slot ${slot ? 'is-filled' : 'is-empty'}" data-slot-index="${index}" ${!slot || locked ? 'disabled' : ''} aria-label="${slot ? `Kembalikan token ${escapeHTML(slot.token)}` : `Slot ${escapeHTML(labels[index] ?? index + 1)} kosong`}">
          <span class="name-slot__label">${labels[index] ?? `Bagian ${index + 1}`}</span>
          <strong>${slot ? escapeHTML(slot.token) : '—'}</strong>
        </button>
      `;
    })
    .join('');
}

function bankGroups(level) {
  const bank = level.namePuzzle?.bank;
  if (!bank) return [];
  return [
    { label: 'POSISI', variant: 'pos', tokens: bank.numbers ?? [] },
    { label: 'SUBSTITUEN', variant: 'sub', tokens: bank.substituents ?? [] },
    { label: 'RANTAI INDUK', variant: 'stem', tokens: bank.stems ?? [] },
    { label: 'AKHIRAN', variant: 'suffix', tokens: bank.suffixes ?? [] },
  ].map((group) => ({
    ...group,
    items: group.tokens.map((token, index) => ({
      id: `${group.variant}-${index}-${token}`,
      token,
      variant: group.variant,
    })),
  }));
}

function bankMarkup(run, level) {
  const used = new Set(run.slots.filter(Boolean).map((item) => item.id));
  const locked = run.nameValidated || Boolean(run.resultReady);
  return bankGroups(level)
    .map(
      (group) => `
        <div class="token-group">
          <span class="token-group__label">${group.label}</span>
          <div class="token-group__list">
            ${group.items
              .map(
                (item) => `
                  <button type="button" class="name-token name-token--${item.variant} ${used.has(item.id) ? 'is-used' : ''}" data-token-id="${item.id}" ${used.has(item.id) || locked ? 'disabled' : ''}>
                    ${escapeHTML(item.token)}
                  </button>
                `,
              )
              .join('')}
          </div>
        </div>
      `,
    )
    .join('');
}

function builtName(run) {
  return formatNameTokens(run.slots.map((slot) => slot?.token ?? null));
}

function namePreviewMarkup(run) {
  const name = builtName(run);
  return `
    <span class="name-preview__label">NAMA TERBENTUK</span>
    <strong class="name-preview__value ${run.nameValidated ? 'is-correct' : ''}">${name ? escapeHTML(name) : '—'}</strong>
    ${run.nameValidated ? `<span class="name-preview__check">${icon('check', 16)} TERVERIFIKASI</span>` : ''}
  `;
}

function intelMarkup(run, level) {
  if (run.feedback) {
    const feedback = run.feedback;
    const tone = feedback.ok ? 'success' : 'error';
    return `
      <div class="feedback-card feedback-card--${tone}" role="status">
        <div class="feedback-card__head">
          <span class="feedback-card__icon">${icon(feedback.ok ? 'check' : 'close', 17)}</span>
          <strong>${escapeHTML(feedback.title)}</strong>
          <span class="feedback-card__tag">${feedback.ok ? 'VALID' : 'REVISI'}</span>
        </div>
        <p>${escapeHTML(feedback.message)}</p>
        ${feedback.ok ? `<span class="feedback-card__next">Baca hasilmu, lalu lanjutkan.</span>` : `<span class="feedback-card__next">${icon('undo', 13)} Perbaiki lalu periksa lagi.</span>`}
      </div>
    `;
  }

  const hints = currentHints(run, level);
  if (run.hintsShown > 0 && hints.length) {
    return `
      <div class="hint-card">
        <div class="hint-card__head">
          <span>${icon('bulb', 16)} PETUNJUK ${run.hintsShown}/${hints.length}</span>
          <span class="hint-card__cost">${run.hintsShown === 1 ? 'Bintang maks. 2' : 'Bintang maks. 1'}</span>
        </div>
        <p>${escapeHTML(hints[run.hintsShown - 1])}</p>
        <div class="hint-dots">${hints.map((_, index) => `<span class="${index < run.hintsShown ? 'is-on' : ''}"></span>`).join('')}</div>
      </div>
    `;
  }

  return `
    <div class="intel-default">
      <span class="intel-default__icon">${icon(run.phase === 'name' ? 'book' : 'bulb', 24)}</span>
      <div>
        <span class="eyebrow">CATATAN STAF</span>
        <strong>${run.phase === 'name' ? 'Susun nama selangkah demi selangkah.' : 'Gunakan petunjuk jika buntu.'}</strong>
        <p>${run.phase === 'name' ? 'Pilih token dari bank. Klik slot yang terisi untuk mengembalikan token ke bank.' : 'Setiap petunjuk yang dibuka mengurangi potensi bintang, tetapi progresmu tidak pernah dihentikan.'}</p>
      </div>
    </div>
  `;
}

function currentHints(run, level) {
  if (run.phase === 'name') return level.nameHints ?? level.hints ?? [];
  return level.hints ?? [];
}

function starForecastMarkup(run) {
  const stars = run.resultReady
    ? run.resultReady.stars
    : calculateStars(run.hintsUsed, run.failedChecks);
  const label = run.resultReady ? 'BINTANG' : 'POTENSI';
  return `
    <div class="star-forecast__stars">${starsHTML(stars, { size: 16, label: `${stars} dari 3 bintang` })}</div>
    <span class="star-forecast__label">${label} ${stars}/3</span>
  `;
}

function phaseStepper(run, level) {
  if (!level.combo) return '';
  return `
    <div class="phase-stepper" aria-label="Tahap misi">
      <div class="phase-step ${run.phase === 'build' ? 'is-active' : ''} ${run.buildValidated ? 'is-done' : ''}">
        <span class="phase-step__num">${run.buildValidated ? icon('check', 12) : '1'}</span>
        <div><strong>Bangun struktur</strong><small>${targetFormula(level)}</small></div>
      </div>
      <span class="phase-line ${run.buildValidated ? 'is-done' : ''}"></span>
      <div class="phase-step ${run.phase === 'name' ? 'is-active' : ''} ${run.nameValidated ? 'is-done' : ''}">
        <span class="phase-step__num">${run.nameValidated ? icon('check', 12) : '2'}</span>
        <div><strong>Beri nama</strong><small>Rantai + akhiran</small></div>
      </div>
    </div>
  `;
}

function briefingBodyMarkup(run, level) {
  const guide = run.phase === 'name' ? level.nameGuide ?? level.guide : level.guide;
  const mentorQuote =
    run.phase === 'name'
      ? 'Teliti membaca struktur. Rantai induk, posisi, lalu akhiran — jangan dibalik.'
      : 'Pilih atom, lalu atom lain untuk membuat ikatan. Inspector akan menjaga valensimu.';
  return `
    ${targetMarkup(level)}

    <div class="mission-brief">
      <span class="section-label"><span>INSTRUKSI</span></span>
      <p>${level.mission}</p>
    </div>

    ${phaseStepper(run, level)}

    <details class="briefing-more" open>
      <summary class="section-label">
        <span>${run.phase === 'name' ? 'PANDUAN PENAMAAN' : 'PROTOKOL'}</span>
        <small>${guide.length} LANGKAH</small>
        ${icon('chevron-right', 14)}
      </summary>
      <div class="briefing-more__body">
        <ol class="guide-list">
          ${guide.map((step) => `<li><span class="guide-list__no"></span><p>${step}</p></li>`).join('')}
        </ol>

        <div class="briefing-mentor">
          <div class="briefing-mentor__portrait">
            <img src="${import.meta.env.BASE_URL}assets/img/dr-nova-vector.svg" alt="Dr. Nova" loading="lazy" />
          </div>
          <div>
            <span>DR. NOVA <b>//</b> MENTOR</span>
            <p>“${mentorQuote}”</p>
          </div>
        </div>
      </div>
    </details>
  `;
}

function briefingMarkup(run, level) {
  return `
    <aside class="briefing panel" aria-label="Instruksi misi">
      <div class="panel-head panel-head--compact briefing-head">
        <div>
          <span class="eyebrow">${icon('terminal', 13)} MISSION FILE</span>
          <span class="panel-code">${level.file}</span>
        </div>
      </div>
      ${briefingBodyMarkup(run, level)}
    </aside>
  `;
}

function missionSheetMarkup(run, level) {
  return `
    <section class="mission-sheet panel" data-sheet-panel="mission" aria-label="Mission file">
      <div class="mission-sheet__head">
        <div>
          <span class="eyebrow">${icon('terminal', 13)} MISSION FILE</span>
          <strong>${level.file}</strong>
        </div>
        <span class="mission-sheet__tag">${run.phase === 'name' ? 'TAHAP 2/2' : 'ARSIP AKTIF'}</span>
      </div>
      ${briefingBodyMarkup(run, level)}
    </section>
  `;
}

function missionTargetText(level) {
  const target = level.target;
  if (target.kind === 'formula') {
    return target.formula ? formulaUnicode(target.formula.carbon, target.formula.hydrogen) : 'Rumus target';
  }
  if (target.kind === 'structure') return 'Identifikasi struktur';
  return target.name ?? 'Target senyawa';
}

function missionStripMarkup(run, level) {
  return `
    <button type="button" class="mission-strip" data-action="sheet-tab" data-sheet-tab="mission" aria-label="Buka arsip misi ${escapeHTML(level.title)}">
      <span class="mission-strip__icon">${icon('terminal', 18)}</span>
      <span class="mission-strip__copy">
        <span class="mission-strip__meta">MISI ${String(level.id).padStart(2, '0')} · ${escapeHTML(level.file)}</span>
        <strong>${escapeHTML(missionTargetText(level))}</strong>
      </span>
      <span class="mission-strip__cta">Baca misi ${icon('chevron-right', 15)}</span>
    </button>
  `;
}

function buildWorkspaceMarkup(run) {
  return `
    <section class="workspace workspace--build panel" aria-label="Molecular grid">
      <header class="workspace-head">
        <div>
          <span class="eyebrow">${icon('atom', 13)} INTERACTIVE WORKSPACE</span>
          <h2>MOLECULAR GRID</h2>
        </div>
        <div class="workspace-head__status">
          <span class="grid-state" data-grid-state><span></span>MEMUAT GRID</span>
          <span class="active-bond" data-active-bond-label>${BOND_LABELS[run.activeBond]}</span>
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
          <button type="button" class="grid-tool grid-tool--reset" data-grid-zoom="reset" aria-label="Paskan tampilan grid" title="Paskan tampilan">
            <span data-zoom-label>100%</span>
          </button>
          <button type="button" class="grid-tool" data-grid-zoom="in" aria-label="Perbesar grid">${icon('plus', 16)}</button>
        </div>
        <div class="grid-hint">${icon('plus', 13)}<span>KETUK ATOM → ATOM LAIN · CUBIT / SCROLL UNTUK ZOOM</span></div>
        <div class="stage-axis" aria-hidden="true"><span>X</span><span>Y</span></div>
        <div class="stage-success ${run.buildValidated ? 'is-visible' : ''}" data-stage-success>
          <span class="stage-success__icon">${icon('check', 30)}</span>
          <strong>STRUKTUR VALID</strong>
          <span>Data molekul berhasil dipulihkan.</span>
        </div>
      </div>
    </section>
  `;
}

function nameWorkspaceMarkup(run, level) {
  const molecule = run.structureMolecule ?? level.namePuzzle.displayGraph;
  const analysis = analyzeMolecule(molecule);
  const formula = formulaHTML(analysis.carbonCount, analysis.hydrogenCount);
  return `
    <section class="workspace workspace--name panel" aria-label="Name decoder">
      <header class="workspace-head">
        <div>
          <span class="eyebrow">${icon('book', 13)} PAPER ARCHIVE</span>
          <h2>NAME DECODER</h2>
        </div>
        <div class="workspace-head__status">
          <span class="grid-state"><span></span>TOKEN ASSEMBLY</span>
          <span class="active-bond">${level.file}</span>
        </div>
      </header>

      <div class="name-stage">
        <div class="paper-deck">
          <article class="paper ${run.nameValidated ? 'is-valid' : ''}">
            <div class="paper__top">
              <span>STRUKTUR ARSIP <b>//</b> ${level.file}</span>
              <strong>${formula}</strong>
            </div>
            <div class="paper__canvas">
              ${renderStructureSVG(molecule, {
                className: 'structure-svg structure-svg--ink',
                ariaLabel: 'Struktur senyawa yang harus diberi nama',
              })}
            </div>
            <div class="paper__bottom">
              <span>C ${analysis.carbonCount} <i>•</i> H ${analysis.hydrogenCount}</span>
              <span>${analysis.bondCounts.single} tunggal <i>•</i> ${analysis.bondCounts.double} rangkap</span>
              <span class="paper__stamp">${run.nameValidated ? 'VERIFIED' : 'RAW FEED'}</span>
            </div>
          </article>
        </div>

        <div class="name-assembly">
          <div class="name-assembly__head">
            <span class="eyebrow">${icon('target', 13)} SUSUN NAMA YANG BENAR</span>
            <span class="name-assembly__hint">Klik slot untuk membatalkan</span>
          </div>
          <div class="name-slots" data-name-slots>
            ${slotMarkup(run, level)}
          </div>
          <div class="name-preview" data-name-preview aria-live="polite">
            ${namePreviewMarkup(run)}
          </div>
        </div>
      </div>
    </section>
  `;
}

function buildSideMarkup(run, level) {
  const analysis = analyzeMolecule(EMPTY_MOLECULE);
  return `
    <aside class="side-stack ${run.sheetOpen ? 'is-open' : ''}" data-sheet-tab="${run.sheetTab}" id="game-mobile-sheet" aria-label="Inspector dan feedback">
      ${sheetMarkup(run)}
      ${missionSheetMarkup(run, level)}
      <section class="inspector panel" data-inspector data-sheet-panel="readout">
        ${inspectorMarkup(analysis)}
      </section>
      <section class="intel-panel panel" data-intel data-sheet-panel="hints" aria-live="polite">
        ${intelMarkup(run, level)}
      </section>
    </aside>
  `;
}

function nameSideMarkup(run, level) {
  const molecule = run.structureMolecule ?? level.namePuzzle.displayGraph;
  const analysis = analyzeMolecule(molecule);
  return `
    <aside class="side-stack side-stack--name ${run.sheetOpen ? 'is-open' : ''}" data-sheet-tab="${run.sheetTab}" id="game-mobile-sheet" aria-label="Bank token dan feedback">
      ${sheetMarkup(run)}
      ${missionSheetMarkup(run, level)}
      <section class="token-console panel" data-sheet-panel="readout">
        <div class="panel-head panel-head--compact token-console__head">
          <div>
            <span class="eyebrow">${icon('database', 13)} NAME COMPONENTS</span>
            <h2>TOKEN BANK</h2>
          </div>
          <span class="panel-code">${run.slots.length} SLOT</span>
        </div>

        <div class="structure-facts">
          <span><small>C</small><strong>${analysis.carbonCount}</strong></span>
          <span><small>H</small><strong>${analysis.hydrogenCount}</strong></span>
          <span><small>RUMUS</small><strong>${formulaHTML(analysis.carbonCount, analysis.hydrogenCount)}</strong></span>
          <span><small>IKATAN</small><strong>${analysis.bondCounts.single}/${analysis.bondCounts.double}/${analysis.bondCounts.triple}</strong></span>
        </div>

        <div class="name-inline">
          <div class="name-assembly__head">
            <span class="eyebrow">${icon('target', 13)} SUSUN NAMA</span>
            <span class="name-assembly__hint">Ketuk slot untuk membatalkan</span>
          </div>
          <div class="name-slots name-slots--inline" data-name-slots-inline>
            ${slotMarkup(run, level)}
          </div>
          <div class="name-preview name-preview--inline" data-name-preview-inline aria-live="polite">
            ${namePreviewMarkup(run)}
          </div>
        </div>

        <div class="token-scroll" data-token-bank>
          ${bankMarkup(run, level)}
        </div>
        <div class="token-note">${icon('info', 14)} Satu token hanya dapat dipakai sekali.</div>
      </section>
      <section class="intel-panel panel" data-intel data-sheet-panel="hints" aria-live="polite">
        ${intelMarkup(run, level)}
      </section>
    </aside>
  `;
}

function actionBarMarkup(run, level) {
  if (run.resultReady) {
    return `
      <div class="action-note action-note--success">
        <span class="action-note__icon">${icon('check', 18)}</span>
        <div><strong>ARSIP MOLEKUL DIPULIHKAN</strong><span>Lihat hasil, penjelasan, dan bintang misi.</span></div>
      </div>
      <button type="button" class="btn btn--primary action-cta" data-action="view-result">
        <span>Lihat Hasil</span>${icon('arrow-right', 18)}
      </button>
    `;
  }

  if (run.phase === 'build') {
    const hints = currentHints(run, level);
    if (run.buildValidated) {
      return `
        <div class="action-note action-note--success">
          <span class="action-note__icon">${icon('check', 18)}</span>
          <div><strong>STRUKTUR VALID — TAHAP 1 SELESAI</strong><span>Lanjut menentukan nama sistematis molekul ini.</span></div>
        </div>
        <button type="button" class="btn btn--primary action-cta" data-action="next-phase">
          <span>Lanjut Menamai</span>${icon('arrow-right', 18)}
        </button>
      `;
    }
    return `
      <div class="action-tools">
        <button type="button" class="tool-btn tool-btn--add" data-action="add-carbon" aria-label="Tambah atom karbon">
          <span class="tool-btn__icon">${icon('plus', 19)}</span>
          <span class="tool-btn__label">Atom C</span>
          <kbd>A</kbd>
        </button>
        <span class="action-divider" aria-hidden="true"></span>
        ${[1, 2, 3]
          .map(
            (order) => `
              <button type="button" class="tool-btn tool-btn--bond tool-btn--bond-${order} ${run.activeBond === order ? 'is-active' : ''}" data-bond-order="${order}" aria-pressed="${run.activeBond === order}" aria-label="${BOND_LABELS[order].toLowerCase()}">
                <span class="tool-btn__icon">${icon(`bond${order}`, 21)}</span>
                <span class="tool-btn__label">${order === 1 ? 'Tunggal' : order === 2 ? 'Rangkap 2' : 'Rangkap 3'}</span>
                <kbd>${order}</kbd>
              </button>
            `,
          )
          .join('')}
        <span class="action-divider" aria-hidden="true"></span>
        <button type="button" class="tool-btn tool-btn--danger" data-action="delete" aria-label="Hapus atom terpilih">
          <span class="tool-btn__icon">${icon('trash', 19)}</span>
          <span class="tool-btn__label">Hapus</span>
          <kbd>Del</kbd>
        </button>
      </div>

      <div class="action-tools action-tools--end">
        <button type="button" class="tool-btn tool-btn--util" data-action="undo" aria-label="Batalkan tindakan terakhir" ${run.canUndo ? '' : 'disabled'}>
          <span class="tool-btn__icon">${icon('undo', 18)}</span>
          <span class="tool-btn__label">Undo</span>
          <kbd>Ctrl Z</kbd>
        </button>
        <button type="button" class="tool-btn tool-btn--util" data-action="reset" aria-label="Reset grid">
          <span class="tool-btn__icon">${icon('reset', 18)}</span>
          <span class="tool-btn__label">Reset</span>
        </button>
        <button type="button" class="tool-btn tool-btn--util tool-btn--hint" data-action="hint" aria-label="Tampilkan petunjuk" ${hints.length ? '' : 'disabled'}>
          <span class="tool-btn__icon">${icon('bulb', 18)}</span>
          <span class="tool-btn__label">Petunjuk</span>
          ${hints.length ? `<span class="tool-count">${hints.length - run.hintsShown}</span>` : ''}
          <kbd>H</kbd>
        </button>
        <button type="button" class="btn btn--primary action-check" data-action="check">
          ${icon('check', 18)}<span>Periksa</span>
        </button>
      </div>
    `;
  }

  const hints = currentHints(run, level);
  return `
    <div class="action-note">
      <span class="action-note__icon action-note__icon--calm">${icon('book', 18)}</span>
      <div><strong>MODE PENAMAAN</strong><span>Isi ${run.slots.length} slot nama dari token yang tersedia.</span></div>
    </div>
    <div class="action-tools action-tools--end">
      <button type="button" class="tool-btn tool-btn--util" data-action="undo" aria-label="Batalkan susunan nama terakhir" ${run.canUndo ? '' : 'disabled'}>
        <span class="tool-btn__icon">${icon('undo', 18)}</span>
        <span class="tool-btn__label">Undo</span>
        <kbd>Ctrl Z</kbd>
      </button>
      <button type="button" class="tool-btn tool-btn--util" data-action="reset" aria-label="Kosongkan semua slot">
        <span class="tool-btn__icon">${icon('reset', 18)}</span>
        <span class="tool-btn__label">Reset</span>
      </button>
      <button type="button" class="tool-btn tool-btn--util tool-btn--hint" data-action="hint" ${hints.length ? '' : 'disabled'}>
        <span class="tool-btn__icon">${icon('bulb', 18)}</span>
        <span class="tool-btn__label">Petunjuk</span>
        ${hints.length ? `<span class="tool-count">${hints.length - run.hintsShown}</span>` : ''}
        <kbd>H</kbd>
      </button>
      <button type="button" class="btn btn--primary action-check" data-action="check">
        ${icon('check', 18)}<span>Periksa Nama</span>
      </button>
    </div>
  `;
}

function screenMarkup(run, level) {
  const isName = run.phase === 'name';
  return `
    <section class="screen game-screen ${isName ? 'game-screen--name' : ''}" aria-label="Level ${level.id}: ${level.title}">
      <header class="game-topbar">
        <div class="game-topbar__left">
          <button type="button" class="icon-btn game-back" data-action="levels" aria-label="Kembali ke peta level">
            ${icon('arrow-left', 19)}<span>PETA</span>
          </button>
          <div class="game-heading">
            <span class="eyebrow">MISI ${String(level.id).padStart(2, '0')} <span class="slash">//</span> ${level.file} <span class="slash">//</span> ${level.focus.toUpperCase()}</span>
            <div class="game-heading__line">
              <h1>${level.title}</h1>
              <span class="badge badge--outline">${level.combo ? (isName ? 'TAHAP 2/2 · PENAMAAN' : 'TAHAP 1/2 · BANGUN') : level.typeLabel.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div class="game-topbar__right">
          <span class="hud-xp" data-hud-xp title="Total XP">${icon('spark', 14)}<strong>${getTotalXp()}</strong><small>XP</small></span>
          <div class="star-forecast" data-star-forecast title="Potensi bintang misi">
            ${starForecastMarkup(run)}
          </div>
          <span class="topbar-sep" aria-hidden="true"></span>
          <button type="button" class="icon-btn icon-btn--ghost game-pause" data-action="pause" aria-label="Jeda level">${icon('pause', 19)}</button>
        </div>
      </header>

      <main class="game-layout">
        ${briefingMarkup(run, level)}
        ${missionStripMarkup(run, level)}
        ${isName ? nameWorkspaceMarkup(run, level) : buildWorkspaceMarkup(run)}
        ${isName ? nameSideMarkup(run, level) : buildSideMarkup(run, level)}
        <footer class="action-bar" aria-label="Action bar">
          ${actionBarMarkup(run, level)}
        </footer>
      </main>

      <button type="button" class="sheet-backdrop ${run.sheetOpen ? 'is-open' : ''}" data-action="sheet-close" tabindex="-1" aria-hidden="true"></button>

      <footer class="game-footer">
        <span class="game-keys">
          ${isName
            ? `${icon('info', 13)} Klik token untuk mengisi · klik slot untuk membatalkan · <kbd>Esc</kbd> jeda`
            : `${icon('info', 13)} <kbd>A</kbd> atom · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> ikatan · <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>Del</kbd> hapus · <kbd>H</kbd> petunjuk · <kbd>Esc</kbd> jeda`}
        </span>
        <span class="game-autosave">${icon('database', 13)} Bintang dicatat setelah misi selesai</span>
      </footer>
    </section>
  `;
}

export function mountLevel(root, params = {}) {
  const level = getLevel(params.levelId);
  if (!level) {
    navigate('levels');
    return () => {};
  }

  const startsWithName = level.type === 'name';
  const initialMolecule = startsWithName ? cloneMolecule(level.namePuzzle.displayGraph) : null;
  const slotCount = level.namePuzzle?.expectedTokens.length ?? 0;

  const run = {
    phase: startsWithName ? 'name' : 'build',
    activeBond: 1,
    hintsUsed: 0,
    hintsShown: 0,
    failedChecks: 0,
    feedback: null,
    canUndo: false,
    buildValidated: false,
    nameValidated: false,
    resultReady: null,
    structureMolecule: initialMolecule,
    slots: Array(slotCount).fill(null),
    nameHistory: [],
    sheetOpen: false,
    sheetTab: 'readout',
  };

  let builder = null;
  let disposed = false;
  const abort = new AbortController();
  const { signal } = abort;
  const mobileQuery = window.matchMedia?.('(max-width: 980px)');

  const isMobile = () => Boolean(mobileQuery?.matches);

  function renderScreen() {
    root.innerHTML = screenMarkup(run, level);
    if (isMobile()) {
      const more = root.querySelector('.briefing-more');
      if (more) more.open = false;
    }
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
    const toggle = stack.querySelector('[data-action="sheet-toggle"]');
    if (toggle) toggle.setAttribute('aria-expanded', String(run.sheetOpen));
    stack.querySelectorAll('[data-sheet-tab]').forEach((button) => {
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
    if (target) target.innerHTML = intelMarkup(run, level);
  }

  function setInspectorStatus(analysis) {
    const statusTarget = root.querySelector('[data-inspector-status]');
    if (!statusTarget) return;
    let status;
    if (run.buildValidated) {
      status = { tone: 'success', label: 'VALID', title: 'Struktur valid', detail: 'Molekul memenuhi aturan dan target.' };
    } else if (run.feedback && !run.feedback.ok) {
      status = { tone: 'error', label: 'REVISI', title: run.feedback.title, detail: 'Ikuti catatan di panel feedback.' };
    } else {
      status = inspectorStatus(analysis);
    }
    statusTarget.className = `inspector-status inspector-status--${status.tone}`;
    statusTarget.innerHTML = statusMarkup(status);
  }

  function updateInspector(analysis) {
    if (!root.querySelector('[data-inspector]')) return;
    const cTarget = root.querySelector('[data-inspector-c]');
    const hTarget = root.querySelector('[data-inspector-h]');
    const formulaTarget = root.querySelector('[data-inspector-formula]');
    const categoryTarget = root.querySelector('[data-inspector-category]');
    const single = root.querySelector('[data-bond-single]');
    const double = root.querySelector('[data-bond-double]');
    const triple = root.querySelector('[data-bond-triple]');
    if (!cTarget || !hTarget || !formulaTarget) return;
    cTarget.textContent = String(analysis.carbonCount);
    hTarget.textContent = String(analysis.hydrogenCount);
    hTarget.classList.toggle('is-invalid', analysis.hydrogenCount < 0);
    formulaTarget.innerHTML = formulaHTML(analysis.carbonCount, analysis.hydrogenCount, { empty: '—' });
    formulaTarget.classList.toggle('is-invalid', analysis.hydrogenCount < 0);
    if (categoryTarget) {
      categoryTarget.textContent = CATEGORY_LABELS[analysis.category] ?? '—';
    }
    if (single) single.textContent = String(analysis.bondCounts.single);
    if (double) double.textContent = String(analysis.bondCounts.double);
    if (triple) triple.textContent = String(analysis.bondCounts.triple);
    setInspectorStatus(analysis);
  }

  function updateStarForecast() {
    const target = root.querySelector('[data-star-forecast]');
    if (target) target.innerHTML = starForecastMarkup(run);
  }

  function updateActionBar() {
    const target = root.querySelector('.action-bar');
    if (target) target.innerHTML = actionBarMarkup(run, level);
  }

  function updateBondSelection() {
    root.querySelectorAll('[data-bond-order]').forEach((button) => {
      const active = Number(button.dataset.bondOrder) === run.activeBond;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const label = root.querySelector('[data-active-bond-label]');
    if (label) label.textContent = BOND_LABELS[run.activeBond];
  }

  function updateGridState(label = 'GRID SIAP') {
    const target = root.querySelector('[data-grid-state]');
    if (target) target.innerHTML = `<span></span>${label}`;
  }

  function syncUndoButtons() {
    root.querySelectorAll('[data-action="undo"]').forEach((button) => {
      button.disabled = !run.canUndo || Boolean(run.resultReady);
    });
  }

  function showWorkspaceSuccess(visible) {
    const overlay = root.querySelector('[data-stage-success]');
    if (overlay) overlay.classList.toggle('is-visible', visible);
    const stage = root.querySelector('.builder-stage');
    stage?.classList.toggle('is-valid', visible);
  }

  function refreshNameConsole() {
    const slotsTargets = root.querySelectorAll('[data-name-slots], [data-name-slots-inline]');
    const bankTarget = root.querySelector('[data-token-bank]');
    const previewTargets = root.querySelectorAll('[data-name-preview], [data-name-preview-inline]');
    slotsTargets.forEach((target) => {
      target.innerHTML = slotMarkup(run, level);
    });
    if (bankTarget) bankTarget.innerHTML = bankMarkup(run, level);
    previewTargets.forEach((target) => {
      target.innerHTML = namePreviewMarkup(run);
    });
    const paper = root.querySelector('.paper');
    if (paper && run.nameValidated) paper.classList.add('is-valid');
  }

  function clearFeedbackOnEdit() {
    if (!run.feedback) return;
    if (run.feedback.ok) return;
    run.feedback = null;
    renderIntel();
    if (run.phase === 'build') {
      const analysis = builder?.getAnalysis() ?? analyzeMolecule(EMPTY_MOLECULE);
      updateInspector(analysis);
    }
  }

  function triggerWorkspaceError() {
    const workspace = root.querySelector('.workspace');
    if (!workspace) return;
    workspace.classList.remove('is-error');
    void workspace.offsetWidth;
    workspace.classList.add('is-error');
    window.setTimeout(() => workspace.classList.remove('is-error'), 460);
  }

  function finishRun({ name, molecule, extraNote = '' }) {
    if (run.resultReady) return;
    const analysis = analyzeMolecule(molecule);
    const stars = calculateStars(run.hintsUsed, run.failedChecks);
    const summary = recordCompletion(level.id, {
      stars,
      hintsUsed: run.hintsUsed,
      failedChecks: run.failedChecks,
    });
    const next = getNextLevel(level.id);
    run.resultReady = {
      levelId: level.id,
      stars,
      hintsUsed: run.hintsUsed,
      failedChecks: run.failedChecks,
      summary,
      molecule: cloneMolecule(molecule),
      compoundName: name,
      categoryLabel: level.result?.category ?? CATEGORY_LABELS[analysis.category] ?? 'Hidrokarbon',
      formula: { carbon: analysis.carbonCount, hydrogen: analysis.hydrogenCount },
      explanation: level.result?.explanation ?? '',
      extraNote,
      bonus: level.result?.bonus ?? '',
      nextLevelId: next?.id ?? null,
    };
    updateStarForecast();
    updateActionBar();
    sfx.play('success');
    const xpTarget = root.querySelector('[data-hud-xp] strong');
    if (xpTarget && Number.isFinite(summary?.totalXp)) {
      xpTarget.textContent = String(summary.totalXp);
    }
  }

  function buildOutcome(molecule) {
    const analysis = analyzeMolecule(molecule);
    let name = level.result?.name ?? level.target.name ?? 'Hidrokarbon';
    let extraNote = '';
    if (level.dynamicResult) {
      const description = describeStructure(molecule);
      if (description) {
        name = description.name;
        extraNote = `Struktur yang kamu susun adalah ${description.name}. Salah satu isomer lain dengan rumus ${analysis.formula} mungkin memiliki konektivitas berbeda; keduanya tetap sah.`;
      }
    }
    return { name, molecule, extraNote };
  }

  function runBuildCheck() {
    if (run.buildValidated) return;
    const molecule = builder?.getMolecule() ?? EMPTY_MOLECULE;
    const feedback = validateBuild(level, molecule);
    if (!feedback.ok) {
      if (feedback.step !== 'empty') run.failedChecks += 1;
      run.feedback = feedback;
      builder?.highlightAtoms(feedback.highlight ?? []);
      updateStarForecast();
      renderIntel();
      updateInspector(builder?.getAnalysis() ?? analyzeMolecule(EMPTY_MOLECULE));
      triggerWorkspaceError();
      revealSheet('hints');
      sfx.play(feedback.step === 'empty' ? 'click' : 'error');
      return;
    }

    run.buildValidated = true;
    run.feedback = feedback;
    run.structureMolecule = molecule;
    builder?.clearHighlights();
    builder?.setLocked(true);
    updateInspector(analyzeMolecule(molecule));
    renderIntel();
    updateStarForecast();
    showWorkspaceSuccess(true);
    sfx.play('success');

    if (level.combo) {
      updateActionBar();
      return;
    }

    finishRun(buildOutcome(molecule));
  }

  function enterNamePhase() {
    if (!level.combo || !run.buildValidated || run.phase === 'name') return;
    run.structureMolecule = builder?.getMolecule() ?? run.structureMolecule;
    builder?.destroy();
    builder = null;
    run.phase = 'name';
    run.feedback = null;
    run.hintsShown = 0;
    run.canUndo = false;
    run.slots = Array(slotCount).fill(null);
    run.nameHistory = [];
    run.sheetOpen = false;
    run.sheetTab = 'readout';
    renderScreen();
    sfx.play('unlock');
    showToast('Struktur valid. Lanjut ke tahap penamaan.', { type: 'success' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function pushNameHistory() {
    run.nameHistory.push(run.slots.slice());
    if (run.nameHistory.length > 60) run.nameHistory.shift();
    run.canUndo = true;
  }

  function placeToken(tokenId) {
    if (run.nameValidated || run.resultReady) return;
    const item = bankGroups(level)
      .flatMap((group) => group.items)
      .find((candidate) => candidate.id === tokenId);
    if (!item) return;
    if (run.slots.some((slot) => slot?.id === tokenId)) return;
    const emptyIndex = run.slots.findIndex((slot) => !slot);
    if (emptyIndex === -1) {
      showToast('Semua slot nama sudah terisi. Klik slot untuk mengembalikan token.', { type: 'info' });
      return;
    }
    pushNameHistory();
    run.slots[emptyIndex] = item;
    run.feedback = null;
    sfx.play('place');
    refreshNameConsole();
    syncUndoButtons();
    renderIntel();
    updateStarForecast();
  }

  function removeSlot(index) {
    if (run.nameValidated || run.resultReady) return;
    if (!run.slots[index]) return;
    pushNameHistory();
    run.slots[index] = null;
    run.feedback = null;
    sfx.play('delete');
    refreshNameConsole();
    syncUndoButtons();
    renderIntel();
  }

  function undoLastAction() {
    if (run.resultReady) return;
    if (run.phase === 'build') {
      builder?.undo();
      return;
    }
    if (!run.nameHistory.length) {
      showToast('Tidak ada tindakan yang bisa dibatalkan.', { type: 'info' });
      return;
    }
    run.slots = run.nameHistory.pop();
    run.canUndo = run.nameHistory.length > 0;
    run.feedback = null;
    sfx.play('click');
    refreshNameConsole();
    syncUndoButtons();
    renderIntel();
  }

  function resetCurrentPhase() {
    if (run.resultReady) return;
    if (run.phase === 'build') {
      if (run.buildValidated) return;
      run.feedback = null;
      builder?.reset();
      renderIntel();
      return;
    }
    if (!run.slots.some(Boolean)) {
      if (run.nameHistory.length) {
        showToast('Semua slot sudah kosong.', { type: 'info' });
      }
      return;
    }
    pushNameHistory();
    run.slots = run.slots.map(() => null);
    run.feedback = null;
    sfx.play('delete');
    refreshNameConsole();
    syncUndoButtons();
    renderIntel();
  }

  function showHint() {
    if (run.resultReady || (run.phase === 'build' && run.buildValidated)) return;
    const hints = currentHints(run, level);
    if (!hints.length) return;
    if (run.hintsShown >= hints.length) {
      showToast('Semua petunjuk untuk tahap ini sudah ditampilkan.', { type: 'info' });
      return;
    }
    run.hintsShown += 1;
    run.hintsUsed += 1;
    run.feedback = null;
    sfx.play('hint');
    renderIntel();
    updateStarForecast();
    updateActionBar();
    revealSheet('hints');
  }

  function runNameCheck() {
    if (run.nameValidated) return;
    const tokens = run.slots.map((slot) => slot?.token ?? null);
    const feedback = validateName(tokens, level.namePuzzle);
    if (!feedback.ok) {
      if (feedback.step !== 'incomplete') run.failedChecks += 1;
      run.feedback = feedback;
      renderIntel();
      updateStarForecast();
      revealSheet('hints');
      if (feedback.step === 'incomplete') {
        sfx.play('click');
        showToast(feedback.message, { type: 'info' });
      } else {
        sfx.play('error');
        triggerWorkspaceError();
      }
      return;
    }

    run.nameValidated = true;
    run.feedback = feedback;
    refreshNameConsole();
    renderIntel();
    updateStarForecast();
    sfx.play('success');
    finishRun({
      name: level.namePuzzle.answerName,
      molecule: run.structureMolecule ?? level.namePuzzle.displayGraph,
    });
  }

  function handleAction(action, target) {
    switch (action) {
      case 'levels':
        navigate('levels');
        break;
      case 'pause':
        openPauseModal({
          onRestart: () => navigate('level', { levelId: level.id, restart: true }),
          onExit: (route) => navigate(route),
        });
        break;
      case 'add-carbon':
        if (run.phase === 'build' && !run.buildValidated) builder?.addCarbon();
        break;
      case 'delete':
        if (run.phase === 'build' && !run.buildValidated) builder?.deleteSelected();
        break;
      case 'bond': {
        const order = Number(target?.dataset?.bondOrder);
        if (![1, 2, 3].includes(order) || run.phase !== 'build' || run.buildValidated) return;
        run.activeBond = order;
        builder?.setBondOrder(order);
        updateBondSelection();
        sfx.play('click');
        break;
      }
      case 'undo':
        undoLastAction();
        break;
      case 'reset':
        resetCurrentPhase();
        break;
      case 'hint':
        showHint();
        break;
      case 'check':
        if (run.phase === 'build') runBuildCheck();
        else runNameCheck();
        break;
      case 'next-phase':
        enterNamePhase();
        break;
      case 'view-result':
        if (run.resultReady) navigate('result', run.resultReady);
        break;
      case 'sheet-toggle':
        setSheet();
        break;
      case 'sheet-close':
        setSheet(false);
        break;
      case 'sheet-tab':
        setSheet(true, target?.dataset?.sheetTab ?? run.sheetTab);
        break;
      default:
        break;
    }
  }

  renderScreen();

  root.addEventListener(
    'click',
    (event) => {
      const tokenButton = event.target.closest('[data-token-id]');
      if (tokenButton && !tokenButton.disabled) {
        placeToken(tokenButton.dataset.tokenId);
        return;
      }
      const slotButton = event.target.closest('[data-slot-index]');
      if (slotButton && !slotButton.disabled) {
        removeSlot(Number(slotButton.dataset.slotIndex));
        return;
      }
      const bondButton = event.target.closest('[data-bond-order]');
      if (bondButton && !bondButton.disabled) {
        handleAction('bond', bondButton);
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
    },
    { signal },
  );

  window.addEventListener(
    'keydown',
    (event) => {
      if (isModalOpen()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        openPauseModal({
          onRestart: () => navigate('level', { levelId: level.id, restart: true }),
          onExit: (route) => navigate(route),
        });
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undoLastAction();
        return;
      }
      if (event.altKey) return;

      if (event.key === '1' || event.key === '2' || event.key === '3') {
        if (run.phase === 'build' && !run.buildValidated) {
          const order = Number(event.key);
          run.activeBond = order;
          builder?.setBondOrder(order);
          updateBondSelection();
        }
        return;
      }
      if (event.key.toLowerCase() === 'a') {
        if (run.phase === 'build' && !run.buildValidated) builder?.addCarbon();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (run.phase === 'build' && !run.buildValidated) {
          event.preventDefault();
          builder?.deleteSelected();
        }
        return;
      }
      if (event.key.toLowerCase() === 'h') {
        showHint();
      }
    },
    { signal },
  );

  function mountBuilder() {
    if (disposed || run.phase !== 'build') return;
    const host = root.querySelector('[data-builder-host]');
    if (!host) return;
    try {
      builder = mountMoleculeBuilder(host, {
        onReady() {
          if (disposed) return;
          updateGridState('GRID SIAP');
        },
        onUpdate({ analysis, canUndo }) {
          if (disposed || run.phase !== 'build') return;
          run.canUndo = Boolean(canUndo);
          updateInspector(analysis);
          syncUndoButtons();
        },
        onToast(message) {
          if (disposed) return;
          showToast(message, { type: 'info' });
        },
        onAction(action) {
          if (disposed) return;
          if (action === 'place') sfx.play('place');
          else if (action === 'bond') sfx.play('bond');
          else if (action === 'delete') sfx.play('delete');
          clearFeedbackOnEdit();
          if (root.querySelector('[data-inspector]')) {
            updateInspector(builder?.getAnalysis() ?? analyzeMolecule(EMPTY_MOLECULE));
          }
        },
        onZoom(percent) {
          if (disposed) return;
          const label = root.querySelector('[data-zoom-label]');
          if (label) label.textContent = `${percent}%`;
        },
      });
      builder.setBondOrder(run.activeBond);
      if (root.querySelector('[data-grid-state]')) updateGridState('GRID SIAP');
    } catch (error) {
      console.error('Gagal memuat molecular grid:', error);
      const host = root.querySelector('[data-builder-host]');
      if (host) {
        host.innerHTML = `
          <div class="builder-fallback">
            ${icon('info', 26)}
            <strong>Grid tidak dapat dimuat</strong>
            <span>Muat ulang halaman untuk mencoba lagi. Progres level lain tetap tersimpan.</span>
          </div>
        `;
      }
      updateGridState('GRID OFFLINE');
    }
  }

  requestAnimationFrame(() => {
    if (disposed) return;
    if (run.phase === 'build') mountBuilder();
  });

  if (!getSave().introSeen && level.id === 1) {
    requestAnimationFrame(() => {
      if (!disposed) openIntroModal();
    });
  }

  return () => {
    disposed = true;
    abort.abort();
    if (builder) {
      builder.destroy();
      builder = null;
    }
  };
}
