import { navigate } from '../../ui/router.js';
import { icon, starIcon } from '../../ui/icons.js';
import { escapeHTML, starsHTML } from '../../ui/helpers.js';
import { renderStructureSVG } from '../../ui/structure.js';
import { experimentDetails, getExperiment } from '../data/experiments.js';
import { getMolecule } from '../data/molecules.js';
import { getReagent, catalystName } from '../data/reagents.js';
import { isExperimentUnlocked, getExperimentBestStars, markLastExperiment } from '../../systems/save.js';

export function mountAdditionBriefing(root, params = {}) {
  const experiment = getExperiment(params.experimentId);
  if (!experiment || !isExperimentUnlocked(experiment.id)) {
    navigate('addition-map');
    return () => {};
  }
  markLastExperiment(experiment.id);
  const details = experimentDetails(experiment);
  const { zoneData, reactantData, productData, reagentData } = details;
  const bestStars = getExperimentBestStars(experiment.id);
  const abort = new AbortController();
  const { signal } = abort;

  const reagentLine = experiment.revealReagent
    ? `<span class="briefing-reagent__formula">${reagentData.formula}</span><span>${reagentData.name}</span>`
    : `<span class="briefing-reagent__formula">?</span><span>Analisis produk untuk menyimpulkan reagen</span>`;

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
            <span class="badge badge--outline">${escapeHTML(experiment.category)}</span>
          </div>
          <p class="briefing-mission__text">${escapeHTML(experiment.mission)}</p>

          <div class="briefing-equation">
            <div class="briefing-mol">
              <span class="briefing-mol__label">REAKTAN</span>
              <div class="briefing-mol__canvas">${renderStructureSVG(reactantData, { className: 'structure-svg', ariaLabel: `Struktur ${reactantData.name}` })}</div>
              <strong>${reactantData.name}</strong>
              <span class="briefing-mol__formula">${reactantData.formula}</span>
            </div>
            <div class="briefing-arrow">
              <span class="briefing-reagent">${reagentLine}</span>
              ${icon('arrow-right', 26)}
              <span class="briefing-conditions">${catalystName(experiment.conditions.catalyst)}${experiment.conditions.peroxide ? ' + peroksida' : ''}</span>
            </div>
            <div class="briefing-mol briefing-mol--target">
              <span class="briefing-mol__label">PRODUK TARGET</span>
              <div class="briefing-mol__canvas">${renderStructureSVG(productData, { className: 'structure-svg', ariaLabel: `Struktur ${productData.name}` })}</div>
              <strong>${productData.name}</strong>
              <span class="briefing-mol__formula">${productData.formula}</span>
            </div>
          </div>

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
        <span>${icon('info', 15)} Lima lapis validasi: struktur, konektivitas, valensi, neraca atom, identitas produk.</span>
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