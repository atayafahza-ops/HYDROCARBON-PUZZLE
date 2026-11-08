import { navigate } from '../../ui/router.js';
import { icon, starIcon } from '../../ui/icons.js';
import { escapeHTML, pad2, starsHTML } from '../../ui/helpers.js';
import { analyzeMolecule } from '../../chemistry/graph.js';
import { renderStructureSVG } from '../../ui/structure.js';
import { getExperiment, getExperimentIndex, EXPERIMENTS } from '../data/experiments.js';
import { getMolecule } from '../data/molecules.js';
import { getZone } from '../data/zones.js';
import { catalystName } from '../data/reagents.js';
import {
  getAdditionTotalStars,
  getAdditionMaxStars,
  getAdditionTotalXp,
  getAdditionCompletedCount,
  getAdditionExperimentCount,
  getExperimentBestStars,
} from '../../systems/save.js';
import { getRank } from '../systems/additionProgress.js';

const BREAKDOWN_LABELS = {
  reagent: 'Pemilihan reagen',
  conditions: 'Kondisi reaksi',
  structure: 'Struktur produk',
  formula: 'Neraca atom',
  understanding: 'Pemahaman',
};
const BREAKDOWN_MAX = { reagent: 20, conditions: 15, structure: 40, formula: 15, understanding: 10 };

export function mountAdditionResult(root, params = {}) {
  const experiment = getExperiment(params.experimentId);
  if (!experiment || !params.molecule) {
    navigate('addition-map');
    return () => {};
  }
  const product = getMolecule(experiment.targetProduct);
  const zone = getZone(experiment.zone);
  const analysis = analyzeMolecule(params.molecule);
  const stars = Math.max(0, Math.min(3, Number(params.stars) || 0));
  const score = Number(params.score) || 0;
  const breakdown = params.breakdown ?? {};
  const gainedXp = params.summary?.gainedXp ?? params.xp ?? 0;
  const bestStars = params.summary?.bestStars ?? getExperimentBestStars(experiment.id);
  const isNewBest = params.summary?.newBest ?? false;
  const totalStars = getAdditionTotalStars();
  const maxStars = getAdditionMaxStars();
  const totalXp = getAdditionTotalXp();
  const completed = getAdditionCompletedCount();
  const total = getAdditionExperimentCount();
  const rank = getRank();
  const nextExperiment = params.nextExperimentId ? getExperiment(params.nextExperimentId) : null;
  const allDone = !nextExperiment && completed >= total;
  const abort = new AbortController();
  const { signal } = abort;

  const confetti = Array.from({ length: 18 }, (_, index) => {
    const x = 4 + ((index * 37) % 92);
    const delay = ((index * 13) % 20) / 20;
    const duration = 2.4 + ((index * 7) % 14) / 10;
    return `<span style="--x:${x}%;--d:${delay}s;--dur:${duration}s"></span>`;
  }).join('');

  root.innerHTML = `
    <section class="screen result-screen addition-result-screen" aria-label="Laporan eksperimen ${experiment.id}">
      <div class="result-confetti" aria-hidden="true">${confetti}</div>
      <header class="result-topbar">
        <button type="button" class="icon-btn result-back" data-action="map" aria-label="Kembali ke peta">${icon('arrow-left', 19)}<span>PETA</span></button>
        <div class="result-topbar__title">
          <span class="eyebrow">EXPERIMENT REPORT <span class="slash">//</span> ${experiment.id}</span>
          <strong>${icon('trophy', 15)} REAKSI BERHASIL</strong>
        </div>
        <div class="result-topbar__stats">
          <span class="top-stat">${starIcon(15)}<strong>${totalStars}</strong><small>/${maxStars}</small></span>
          <span class="top-stat">${icon('spark', 14)}<strong>${totalXp}</strong><small> XP</small></span>
        </div>
      </header>

      <main class="result-grid">
        <section class="result-hero panel">
          <div class="hero-grid" aria-hidden="true"></div>
          <span class="result-kicker">${icon('check', 14)} EXPERIMENT COMPLETE</span>
          <span class="result-file">${experiment.id} <span class="slash">//</span> ${zone.title.toUpperCase()}</span>
          <h1>REAKSI<br />BERHASIL!</h1>
          <p class="result-level-name">${escapeHTML(experiment.title)}<span>${escapeHTML(experiment.category)}</span></p>
          <div class="result-stars">${starsHTML(stars, { size: 54, label: `${stars} dari 3 bintang` })}</div>
          <p class="result-star-caption">SKOR ${score}/100</p>

          <div class="result-run-stats">
            <span><small>PETUNJUK</small><strong>${params.hintsUsed ?? 0}<i>/4</i></strong></span>
            <span><small>PERIKSA GAGAL</small><strong>${params.failedChecks ?? 0}</strong></span>
            <span><small>REKOR</small><strong>${bestStars}<i>/3</i></strong></span>
          </div>

          <div class="result-xp">
            <span class="result-xp__icon">${icon('spark', 22)}</span>
            <div><span>XP DIPEROLEH</span><strong>+${gainedXp}</strong></div>
            ${isNewBest && stars > 0 ? `<span class="result-record">${icon('trophy', 13)} REKOR BARU</span>` : `<span class="result-record result-record--muted">TERBAIK ${bestStars}/3</span>`}
          </div>

          <div class="score-breakdown">
            ${Object.keys(BREAKDOWN_LABELS).map((key) => `
              <div class="score-row">
                <span>${BREAKDOWN_LABELS[key]}</span>
                <div class="score-row__track"><span style="width:${Math.round(((breakdown[key] ?? 0) / BREAKDOWN_MAX[key]) * 100)}%"></span></div>
                <strong>${breakdown[key] ?? 0}/${BREAKDOWN_MAX[key]}</strong>
              </div>`).join('')}
          </div>

          <div class="result-action-block">
            ${nextExperiment
              ? `<button type="button" class="btn btn--primary btn--lg result-next" data-action="next">${icon('arrow-right', 18)}<span>Lanjut ${nextExperiment.id}</span></button>`
              : `<button type="button" class="btn btn--primary btn--lg result-next" data-action="map">${icon('map', 18)}<span>${allDone ? 'Semua Eksperimen Selesai' : 'Kembali ke Peta'}</span></button>`}
            <div class="result-secondary-actions">
              <button type="button" class="btn btn--secondary" data-action="retry">${icon('reset', 16)}<span>Coba Lagi</span></button>
              <button type="button" class="btn btn--ghost" data-action="profile">${icon('users', 16)}<span>Profil</span></button>
            </div>
            <span class="result-next-hint">${icon(rank.icon, 13)} Pangkat riset: ${rank.name}.</span>
          </div>
        </section>

        <div class="result-detail">
          <section class="result-compound panel">
            <header class="panel-head panel-head--compact">
              <div><span class="eyebrow">${icon('flask', 13)} PRODUCT RECORD</span><h2 class="panel-title">PRODUK REAKSI</h2></div>
              <span class="badge badge--green">${icon('check', 12)} VALID</span>
            </header>
            <div class="result-compound__body">
              <div class="result-paper">
                <div class="result-paper__head"><span>STRUKTUR PRODUK</span><span>${experiment.id}</span></div>
                <div class="result-paper__canvas">${renderStructureSVG(params.molecule, { className: 'structure-svg structure-svg--ink', ariaLabel: `Struktur ${product.name}` })}</div>
                <div class="result-paper__foot"><span>${analysis.formula}</span><span class="result-paper__verified">${icon('check', 12)} SYNTHESIZED</span></div>
              </div>
              <dl class="result-info">
                <div class="result-info__name"><dt>Nama produk</dt><dd>${escapeHTML(product.name)}</dd></div>
                <div><dt>Rumus molekul</dt><dd class="result-formula">${product.formula}</dd></div>
                <div><dt>Reagen</dt><dd>${experiment.reagent}</dd></div>
                <div><dt>Kondisi</dt><dd>${catalystName(experiment.conditions.catalyst)}${experiment.conditions.peroxide ? ' + peroksida' : ''}${experiment.conditions.equivalents > 1 ? ` · ${experiment.conditions.equivalents} eq` : ''}</dd></div>
              </dl>
            </div>
          </section>

          <section class="result-explanation panel">
            <header class="panel-head panel-head--compact">
              <div><span class="eyebrow">${icon('terminal', 13)} ANALYSIS // DR. LUCI</span><h2 class="panel-title">PENJELASAN</h2></div>
              <span class="explanation-code">RPT-${experiment.id}</span>
            </header>
            <div class="result-explanation__body">
              <div class="luci-quote"><img src="${import.meta.env.BASE_URL}assets/img/dr-luci.png" alt="" aria-hidden="true" loading="lazy" /><span class="luci-quote__tag">DR. LUCI <b>//</b> MENTOR</span></div>
              <div class="result-explanation__copy">
                <p>${escapeHTML(experiment.explanation.summary)}</p>
                <ol class="mechanism-list">${experiment.explanation.mechanism.map((step) => `<li>${escapeHTML(step)}</li>`).join('')}</ol>
              </div>
            </div>
            <footer class="result-explanation__foot">
              <span>${icon('database', 13)} Tersimpan di arsip Addition Lab</span>
              <button type="button" class="text-link" data-action="codex">Buka Reaction Codex ${icon('arrow-right', 13)}</button>
            </footer>
          </section>
        </div>
      </main>

      <footer class="screen-footer result-footer">
        <span>${icon('database', 15)} ${completed}/${total} eksperimen selesai — progres terpisah dari Main Campaign.</span>
        <span class="footer-version">${starIcon(13)} ${totalStars}/${maxStars} BINTANG <span class="slash">//</span> ${totalXp} XP</span>
      </footer>
    </section>
  `;

  root.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'next' && nextExperiment) navigate('addition-briefing', { experimentId: nextExperiment.id });
    else if (action === 'retry') navigate('addition-lab', { experimentId: experiment.id });
    else if (action === 'map') navigate('addition-map', { zoneId: experiment.zone });
    else if (action === 'profile') navigate('addition-profile');
    else if (action === 'codex') navigate('addition-codex');
  }, { signal });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') navigate('addition-map', { zoneId: experiment.zone });
  }, { signal });

  return () => abort.abort();
}