import { navigate } from '../../ui/router.js';
import { icon } from '../../ui/icons.js';
import { escapeHTML, starsHTML } from '../../ui/helpers.js';
import { renderStructureSVG } from '../../ui/structure.js';
import { getExperiment } from '../data/experiments.js';
import { getMolecule } from '../data/molecules.js';
import { getReagent, catalystName } from '../data/reagents.js';
import { getZone } from '../data/zones.js';
import { isExperimentUnlocked, getExperimentBestStars, markLastExperiment } from '../../systems/save.js';

const LEVEL_BADGES = {
  core: { label: 'INTI', cls: 'badge--green' },
  enrichment: { label: 'PENGAYAAN', cls: 'badge--purple' },
  advanced: { label: 'LANJUTAN', cls: 'badge--red' },
};

const REVIEW_LABELS = {
  validated: { label: 'TERVALIDASI', cls: 'badge--green' },
  chemistry_reviewed: { label: 'REVIEW KIMIA', cls: 'badge--outline' },
  draft: { label: 'DRAF', cls: 'badge--red' },
};

function conditionsLine(conditions) {
  if (!conditions) return '';
  const bits = [catalystName(conditions.catalyst)];
  if (conditions.peroxide) bits.push('peroksida');
  if (conditions.equivalents > 1) bits.push(`${conditions.equivalents} eq`);
  return escapeHTML(bits.join(' · '));
}

function reagentLine(reagentData, reveal) {
  if (reveal && reagentData) {
    return `<span class="briefing-reagent__formula">${reagentData.formula}</span><span>${reagentData.name}</span>`;
  }
  return `<span class="briefing-reagent__formula">?</span><span>Analisis produk untuk menyimpulkan reagen</span>`;
}

function moleculeBlock(label, molecule, modifier = '') {
  return `
    <div class="briefing-mol ${modifier}">
      <span class="briefing-mol__label">${label}</span>
      <div class="briefing-mol__canvas">${renderStructureSVG(molecule, { className: 'structure-svg', ariaLabel: `Struktur ${molecule.name}` })}</div>
      <strong>${molecule.name}</strong>
      <span class="briefing-mol__formula">${molecule.formula}</span>
    </div>
  `;
}

function equationMarkup(experiment, reactantData, productData, reagentData) {
  if (experiment.kind === 'identify' || !productData) {
    return `
      <div class="briefing-equation briefing-equation--analyze">
        ${moleculeBlock('SENETELAH ANALISIS', reactantData)}
        <div class="briefing-arrow">
          <span class="briefing-reagent"><span class="briefing-reagent__formula">${icon('book', 16)}</span><span>Kuis analisis struktur</span></span>
          ${icon('arrow-right', 26)}
          <span class="briefing-conditions">${experiment.quiz.length} pertanyaan</span>
        </div>
      </div>
    `;
  }
  if (experiment.stages?.length) {
    return experiment.stages.map((stage) => {
      const stageReactant = getMolecule(stage.reactant);
      const stageProduct = getMolecule(stage.targetProduct);
      return `
        <div class="briefing-equation">
          ${moleculeBlock(`TAHAP ${experiment.stages.indexOf(stage) + 1} · REAKTAN`, stageReactant)}
          <div class="briefing-arrow">
            <span class="briefing-reagent">${reagentLine(getReagent(stage.reagent), true)}</span>
            ${icon('arrow-right', 26)}
            <span class="briefing-conditions">${conditionsLine(stage.conditions)}</span>
          </div>
          ${moleculeBlock('PRODUK TAHAP', stageProduct, 'briefing-mol--target')}
        </div>
      `;
    }).join('');
  }
  return `
    <div class="briefing-equation">
      ${moleculeBlock('REAKTAN', reactantData)}
      <div class="briefing-arrow">
        <span class="briefing-reagent">${reagentLine(reagentData, experiment.revealReagent)}</span>
        ${icon('arrow-right', 26)}
        <span class="briefing-conditions">${conditionsLine(experiment.conditions)}</span>
      </div>
      ${moleculeBlock('PRODUK TARGET', productData, 'briefing-mol--target')}
    </div>
  `;
}

export function mountAdditionBriefing(root, params = {}) {
  const experiment = getExperiment(params.experimentId);
  if (!experiment || !isExperimentUnlocked(experiment.id)) {
    navigate('addition-map');
    return () => {};
  }
  markLastExperiment(experiment.id);
  const zoneData = getZone(experiment.zone);
  const reactantData = getMolecule(experiment.reactant);
  const productData = experiment.targetProduct ? getMolecule(experiment.targetProduct) : null;
  const reagentData = experiment.reagent ? getReagent(experiment.reagent) : null;
  const intermediateData = experiment.intermediate ? getMolecule(experiment.intermediate) : null;
  const bestStars = getExperimentBestStars(experiment.id);
  const levelBadge = LEVEL_BADGES[experiment.level] ?? LEVEL_BADGES.core;
  const reviewBadge = REVIEW_LABELS[experiment.review?.status] ?? REVIEW_LABELS.chemistry_reviewed;
  const abort = new AbortController();
  const { signal } = abort;

  root.innerHTML = `
    <section class="screen addition-screen addition-briefing-screen" aria-label="Briefing ${experiment.id}">
      <header class="subbar">
        <button type="button" class="icon-btn subbar__back" data-back aria-label="Kembali ke peta">${icon('arrow-left', 20)}<span>Peta</span></button>
        <div class="subbar__title">
          <span class="eyebrow">${icon(zoneData.icon, 14)} ${experiment.id} <span class="slash">//</span> ${zoneData.title.toUpperCase()}</span>
          <h1>${escapeHTML(experiment.title)}</h1>
        </div>
        <div class="subbar__stats">
          <span class="top-stat">${starsHTML(bestStars, { size: 15, label: `${bestStars} bintang terbaik` })}</span>
        </div>
      </header>

      <main class="briefing-grid">
        <section class="panel briefing-mission">
          <div class="panel-head panel-head--compact">
            <div><span class="eyebrow">${icon('terminal', 13)} EXPERIMENT BRIEF</span><h2 class="panel-title">MISI</h2></div>
            <div class="briefing-badges">
              <span class="badge ${levelBadge.cls}">${levelBadge.label}</span>
              ${experiment.stage === 'enol' ? '<span class="badge badge--outline">TAHAP ENOL</span>' : ''}
              <span class="badge ${reviewBadge.cls}">${icon('eye', 12)} ${reviewBadge.label}</span>
              <span class="badge badge--outline">${escapeHTML(experiment.category)}</span>
            </div>
          </div>
          <p class="briefing-mission__text">${escapeHTML(experiment.mission)}</p>

          ${equationMarkup(experiment, reactantData, productData, reagentData)}
          ${intermediateData ? `
            <p class="briefing-intermediate">${icon('flask', 14)} Intermediate yang terbentuk: <strong>${escapeHTML(intermediateData.name)}</strong> (${intermediateData.formula}) — enol sebelum tautomerisasi.</p>
          ` : ''}

          <div class="briefing-objectives">
            <span class="section-label"><span>TUJUAN PEMBELAJARAN</span></span>
            <ul>${experiment.learningObjectives.map((objective) => `<li>${icon('check', 14)}<span>${escapeHTML(objective)}</span></li>`).join('')}</ul>
          </div>

          <div class="briefing-cta">
            <button type="button" class="btn btn--primary btn--lg" data-start>${icon('flask', 18)}<span>Mulai Eksperimen</span></button>
            <button type="button" class="btn btn--ghost" data-codex>${icon('book', 16)}<span>Reaction Codex</span></button>
          </div>
        </section>

        <aside class="panel briefing-theory">
          <div class="panel-head panel-head--compact">
            <div><span class="eyebrow">${icon('bulb', 13)} TEORI ZONA</span><h2 class="panel-title">${zoneData.title}</h2></div>
          </div>
          <p>${escapeHTML(zoneData.theory)}</p>
          <div class="briefing-mentor">
            <div class="briefing-mentor__portrait"><img src="${import.meta.env.BASE_URL}assets/img/dr-luci.png" alt="Dr. Luci" loading="lazy" /></div>
            <div><span>DR. LUCI <b>//</b> MENTOR</span><p>“Pilih reagen dan kondisi dengan tepat, lalu bangun produknya. Validator memeriksa struktur, bukan sekadar rumus.”</p></div>
          </div>
        </aside>
      </main>

      <footer class="screen-footer">
        <span>${icon('info', 15)} Tujuh lapis validasi: neraca atom, valensi, perubahan ikatan, aturan reaksi, regioselektivitas, identitas produk, stereokimia.</span>
        <span class="footer-version">${experiment.id} <span class="slash">//</span> DIFFICULTY ${experiment.difficulty}/3</span>
      </footer>
    </section>
  `;

  root.querySelector('[data-back]')?.addEventListener('click', () => navigate('addition-map', { zoneId: experiment.zone }), { signal });
  root.querySelector('[data-start]')?.addEventListener('click', () => navigate('addition-lab', { experimentId: experiment.id }), { signal });
  root.querySelector('[data-codex]')?.addEventListener('click', () => navigate('addition-codex'), { signal });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') navigate('addition-map', { zoneId: experiment.zone });
    if (event.key === 'Enter') navigate('addition-lab', { experimentId: experiment.id });
  }, { signal });

  return () => abort.abort();
}
