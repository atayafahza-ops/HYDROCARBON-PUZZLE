import { navigate } from '../ui/router.js';
import { icon, starIcon } from '../ui/icons.js';
import { escapeHTML, pad2, starsHTML } from '../ui/helpers.js';
import { formulaHTML } from '../chemistry/formula.js';
import { analyzeMolecule } from '../chemistry/graph.js';
import { renderStructureSVG } from '../ui/structure.js';
import { xpForStars, starCaption } from '../systems/score.js';
import { getLevel, getZone } from '../data/levels.js';
import {
  getBestStars,
  getCompletedCount,
  getLevelCount,
  getMaxStars,
  getTotalStars,
  getTotalXp,
} from '../systems/save.js';

function gainedXpFor(params) {
  if (params.summary && Number.isFinite(params.summary.gainedXp)) {
    return params.summary.gainedXp;
  }
  return xpForStars(params.stars);
}

export function mountResult(root, params = {}) {
  const level = getLevel(params.levelId);
  if (!level || !params.molecule) {
    navigate('levels');
    return () => {};
  }

  const analysis = analyzeMolecule(params.molecule);
  const stars = Math.max(0, Math.min(3, Number(params.stars) || 0));
  const formula = params.formula ?? {
    carbon: analysis.carbonCount,
    hydrogen: analysis.hydrogenCount,
  };
  const compoundName = params.compoundName ?? level.result?.name ?? 'Hidrokarbon';
  const categoryLabel = params.categoryLabel ?? level.result?.category ?? 'Hidrokarbon';
  const gainedXp = gainedXpFor(params);
  const bestStars = params.summary?.bestStars ?? getBestStars(level.id);
  const previousStars = params.summary?.previousStars ?? 0;
  const isNewBest = params.summary?.newBest ?? stars > previousStars;
  const totalStars = getTotalStars();
  const totalXp = getTotalXp();
  const maxStars = getMaxStars();
  const completed = getCompletedCount();
  const levelCount = getLevelCount();
  const nextLevel = params.nextLevelId ? getLevel(params.nextLevelId) : null;
  const allDone = !nextLevel && completed >= levelCount;
  const abort = new AbortController();
  const { signal } = abort;

  const confetti = Array.from({ length: 18 }, (_, index) => {
    const x = 4 + ((index * 37) % 92);
    const delay = ((index * 13) % 20) / 20;
    const duration = 2.4 + ((index * 7) % 14) / 10;
    return `<span style="--x:${x}%;--d:${delay}s;--dur:${duration}s"></span>`;
  }).join('');

  root.innerHTML = `
    <section class="screen result-screen" aria-label="Hasil level ${level.title}">
      <div class="result-confetti" aria-hidden="true">${confetti}</div>

      <header class="result-topbar">
        <button type="button" class="icon-btn result-back" data-action="levels" aria-label="Kembali ke peta level">
          ${icon('arrow-left', 19)}<span>PETA LEVEL</span>
        </button>
        <div class="result-topbar__title">
          <span class="eyebrow">RESULT TERMINAL <span class="slash">//</span> ${level.file}</span>
          <strong>${icon('trophy', 15)} ARSIP TERPULIHKAN</strong>
        </div>
        <div class="result-topbar__stats">
          <span class="top-stat">${starIcon(15)}<strong>${totalStars}</strong><small>/${maxStars}</small></span>
          <span class="top-stat">${icon('spark', 14)}<strong>${totalXp}</strong><small> XP</small></span>
          <button type="button" class="icon-btn icon-btn--ghost" data-action="menu" aria-label="Menu utama">${icon('home', 18)}</button>
        </div>
      </header>

      <main class="result-grid">
        <section class="result-hero panel">
          <div class="hero-grid" aria-hidden="true"></div>
          <div class="hero-orbit" aria-hidden="true"><span></span><span></span><span></span></div>

          <span class="result-kicker">${icon('check', 14)} MISSION COMPLETE</span>
          <span class="result-file">${level.file} <span class="slash">//</span> ZONA ${pad2(getZone(level.zoneId)?.index ?? 1)}</span>
          <h1>LEVEL<br />SELESAI!</h1>
          <p class="result-level-name">${level.title}<span>${level.focus}</span></p>

          <div class="result-stars">${starsHTML(stars, { size: 54, label: `${stars} dari 3 bintang` })}</div>
          <p class="result-star-caption">${starCaption(stars)}</p>

          <div class="result-run-stats">
            <span><small>PETUNJUK</small><strong>${params.hintsUsed ?? 0}<i>/3</i></strong></span>
            <span><small>PERIKSA GAGAL</small><strong>${params.failedChecks ?? 0}</strong></span>
            <span><small>REKOR</small><strong>${bestStars}<i>/3</i></strong></span>
          </div>

          <div class="result-xp">
            <span class="result-xp__icon">${icon('spark', 22)}</span>
            <div>
              <span>XP DIPEROLEH</span>
              <strong>+${gainedXp}</strong>
            </div>
            ${isNewBest && stars > 0 ? `<span class="result-record">${icon('trophy', 13)} REKOR BARU</span>` : `<span class="result-record result-record--muted">TERBAIK ${bestStars}/3</span>`}
          </div>

          <div class="result-action-block">
            ${
              nextLevel
                ? `<button type="button" class="btn btn--primary btn--lg result-next" data-action="next">${icon('arrow-right', 18)}<span>Lanjut ke Level ${pad2(nextLevel.id)}</span></button>`
                : `<button type="button" class="btn btn--primary btn--lg result-next" data-action="levels">${icon('map', 18)}<span>${allDone ? 'Semua Misi Selesai' : 'Kembali ke Peta'}</span></button>`
            }
            <div class="result-secondary-actions">
              <button type="button" class="btn btn--secondary" data-action="retry">${icon('reset', 16)}<span>Coba Lagi</span></button>
              <button type="button" class="btn btn--ghost" data-action="map">${icon('map', 16)}<span>Peta</span></button>
            </div>
            <span class="result-next-hint">
              ${nextLevel ? `${icon('arrow-right', 13)} Berikutnya: Level ${pad2(nextLevel.id)} — ${nextLevel.title}.` : allDone ? `${icon('crown', 13)} Seluruh arsip MVP telah kamu pulihkan.` : `${icon('database', 13)} Progres tersimpan otomatis.`}
            </span>
          </div>
        </section>

        <div class="result-detail">
          <section class="result-compound panel">
            <header class="panel-head panel-head--compact">
              <div>
                <span class="eyebrow">${icon('flask', 13)} MOLECULAR RECORD</span>
                <h2 class="panel-title">ARSIP MOLEKUL</h2>
              </div>
              <span class="badge badge--green">${icon('check', 12)} VALID</span>
            </header>

            <div class="result-compound__body">
              <div class="result-paper">
                <div class="result-paper__head">
                  <span>STRUKTUR FINAL</span>
                  <span>${level.file}</span>
                </div>
                <div class="result-paper__canvas">
                  ${renderStructureSVG(params.molecule, {
                    className: 'structure-svg structure-svg--ink',
                    ariaLabel: `Struktur ${compoundName}`,
                  })}
                </div>
                <div class="result-paper__foot">
                  <span>C ${formula.carbon} <i>•</i> H ${formula.hydrogen}</span>
                  <span class="result-paper__verified">${icon('check', 12)} RESTORED</span>
                </div>
              </div>

              <dl class="result-info">
                <div class="result-info__name">
                  <dt>Nama senyawa</dt>
                  <dd>${escapeHTML(compoundName)}</dd>
                </div>
                <div>
                  <dt>Rumus molekul</dt>
                  <dd class="result-formula">${formulaHTML(formula.carbon, formula.hydrogen)}</dd>
                </div>
                <div>
                  <dt>Kategori</dt>
                  <dd>${escapeHTML(categoryLabel)}</dd>
                </div>
                <div>
                  <dt>Kerangka</dt>
                  <dd>${analysis.connected ? 'Satu molekul' : 'Terhubung'}</dd>
                </div>
                <div>
                  <dt>Ikatan</dt>
                  <dd class="result-bond-count"><span>${icon('bond1', 14)} ${analysis.bondCounts.single}</span><span>${icon('bond2', 14)} ${analysis.bondCounts.double}</span><span>${icon('bond3', 14)} ${analysis.bondCounts.triple}</span></dd>
                </div>
              </dl>
            </div>
          </section>

          <section class="result-explanation panel">
            <header class="panel-head panel-head--compact">
              <div>
                <span class="eyebrow">${icon('terminal', 13)} ANALYSIS // DR. NOVA</span>
                <h2 class="panel-title">PENJELASAN</h2>
              </div>
              <span class="explanation-code">RPT-${pad2(level.id)}</span>
            </header>
            <div class="result-explanation__body">
              <div class="nova-quote">
                <img src="${import.meta.env.BASE_URL}assets/img/dr-nova.png" alt="" aria-hidden="true" loading="lazy" />
                <span class="nova-quote__tag">DR. NOVA <b>//</b> MENTOR</span>
              </div>
              <div class="result-explanation__copy">
                <p>${escapeHTML(params.explanation ?? level.result?.explanation ?? '')}</p>
                ${params.extraNote ? `<div class="result-note">${icon('info', 16)}<p>${escapeHTML(params.extraNote)}</p></div>` : ''}
                ${params.bonus ? `<div class="result-bonus">${icon('spark', 16)}<span>${escapeHTML(params.bonus)}</span></div>` : ''}
              </div>
            </div>
            <footer class="result-explanation__foot">
              <span>${icon('database', 13)} Data tersimpan di arsip lokal</span>
              <button type="button" class="text-link" data-action="codex">Buka Molecular Codex ${icon('arrow-right', 13)}</button>
            </footer>
          </section>
        </div>
      </main>

      <footer class="screen-footer result-footer">
        <span>${icon('database', 15)} Progres tersimpan di perangkat ini — ${completed}/${levelCount} arsip pulih.</span>
        <span class="footer-version">${starIcon(13)} ${totalStars}/${maxStars} BINTANG <span class="slash">//</span> ${totalXp} XP</span>
      </footer>
    </section>
  `;

  root.addEventListener(
    'click',
    (event) => {
      const actionTarget = event.target.closest('[data-action]');
      if (!actionTarget) return;
      const action = actionTarget.dataset.action;
      if (action === 'next') {
        if (nextLevel) navigate('level', { levelId: nextLevel.id });
      } else if (action === 'retry') {
        navigate('level', { levelId: level.id, restart: true });
      } else if (action === 'levels' || action === 'map') {
        navigate('levels');
      } else if (action === 'menu') {
        navigate('menu');
      } else if (action === 'codex') {
        navigate('codex');
      }
    },
    { signal },
  );

  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') navigate('levels');
    },
    { signal },
  );

  return () => abort.abort();
}
