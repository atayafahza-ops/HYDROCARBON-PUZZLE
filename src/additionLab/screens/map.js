import { navigate } from '../../ui/router.js';
import { icon, starIcon } from '../../ui/icons.js';
import { pad2, starsHTML } from '../../ui/helpers.js';
import { ZONES, getZone } from '../data/zones.js';
import { EXPERIMENTS, getExperimentsByZone } from '../data/experiments.js';
import {
  getAdditionTotalStars,
  getAdditionMaxStars,
  getAdditionTotalXp,
  getAdditionZoneStars,
  getAdditionZoneCompleted,
  getExperimentBestStars,
  isExperimentComplete,
  isExperimentUnlocked,
  getContinueExperimentId,
} from '../../systems/save.js';

function zoneButtonMarkup(zone, selected) {
  const experiments = getExperimentsByZone(zone.id);
  const stars = getAdditionZoneStars(zone.id);
  const maxStars = experiments.length * 3;
  const locked = experiments.every((experiment) => !isExperimentUnlocked(experiment.id));
  return `
    <button type="button" class="zone-tab zone-tab--${zone.accent} ${selected ? 'is-active' : ''} ${locked ? 'is-locked' : ''}" data-zone="${zone.id}" aria-pressed="${selected}">
      <span class="zone-tab__icon">${locked ? icon('lock', 18) : icon(zone.icon, 20)}</span>
      <span class="zone-tab__copy"><strong>${zone.title}</strong><span>${experiments.length} EKSPERIMEN</span></span>
      <span class="zone-tab__side">
        ${locked ? `<span class="zone-tab__lock">${icon('lock', 13)}</span>` : ''}
        <span class="zone-tab__count">${stars}/${maxStars}</span>
      </span>
    </button>
  `;
}

function experimentNodeMarkup(experiment, index) {
  const complete = isExperimentComplete(experiment.id);
  const unlocked = isExperimentUnlocked(experiment.id);
  const stars = getExperimentBestStars(experiment.id);
  const current = unlocked && !complete && experiment.id === getContinueExperimentId();
  const statusLabel = complete ? 'SELESAI' : current ? 'LANJUT' : unlocked ? 'BUKA' : 'TERKUNCI';
  return `
    <div class="level-slot ${current ? 'is-current' : ''} ${unlocked ? '' : 'level-slot--locked'}" style="--slot-index:${index}">
      <button type="button" class="level-node ${complete ? 'is-complete' : ''} ${current ? 'is-current' : ''} ${unlocked ? '' : 'is-locked'}" data-experiment-id="${experiment.id}" ${unlocked ? '' : 'disabled'}>
        <span class="level-node__top">${experiment.category.toUpperCase()}</span>
        <span class="level-node__number">${experiment.id.replace('AL-', '')}</span>
        <span class="level-node__status">${statusLabel}</span>
        ${complete ? `<span class="level-node__check">${icon('check', 13)}</span>` : ''}
        ${unlocked ? '' : `<span class="level-node__lock">${icon('lock', 12)}</span>`}
      </button>
      <span class="level-node__title">${experiment.title}</span>
      <span class="level-node__type">${experiment.id}</span>
      <span class="level-node__stars">${starsHTML(stars, { size: 13, label: `${stars} bintang` })}</span>
    </div>
  `;
}

export function mountAdditionMap(root, params = {}) {
  const continueId = getContinueExperimentId();
  const continueExperiment = EXPERIMENTS.find((experiment) => experiment.id === continueId);
  const requestedZone = params.zoneId ? getZone(params.zoneId) : null;
  let selectedZoneId = requestedZone?.id ?? continueExperiment?.zone ?? ZONES[0].id;
  const abort = new AbortController();
  const { signal } = abort;

  root.innerHTML = `
    <section class="screen levels-screen addition-map-screen" aria-label="Peta eksperimen Addition Lab">
      <header class="subbar">
        <button type="button" class="icon-btn subbar__back" data-back aria-label="Kembali ke Addition Lab">${icon('arrow-left', 20)}<span>Addition Lab</span></button>
        <div class="subbar__title">
          <span class="eyebrow">${icon('map', 14)} EXPERIMENT MAP <span class="slash">//</span> ${ZONES.length} ZONA</span>
          <h1>Peta Eksperimen <span class="muted-title">— <span data-zone-heading></span></span></h1>
        </div>
        <div class="subbar__stats">
          <span class="top-stat">${starIcon(16)}<strong>${getAdditionTotalStars()}</strong><small>/${getAdditionMaxStars()}</small></span>
          <span class="top-stat">${icon('spark', 15)}<strong>${getAdditionTotalXp()}</strong><small> XP</small></span>
        </div>
      </header>

      <main class="levels-grid">
        <aside class="zone-panel panel" aria-label="Pilih zona riset">
          <div class="panel-head panel-head--compact">
            <div><span class="eyebrow">${icon('database', 13)} SECTOR INDEX</span><h2 class="panel-title">ZONA RISET</h2></div>
          </div>
          <nav class="zone-list">${ZONES.map((zone) => zoneButtonMarkup(zone, zone.id === selectedZoneId)).join('')}</nav>
          <div class="zone-panel-note">${icon('info', 15)}<p>Eksperimen terbuka berurutan. Selesaikan satu untuk membuka berikutnya.</p></div>
        </aside>
        <section class="map-panel panel" data-map-panel></section>
      </main>

      <footer class="screen-footer levels-footer">
        <span>${icon('bulb', 15)} Buka Reaction Codex untuk teori tiap jenis reaksi.</span>
        <span class="footer-version">AL-01—AL-${pad2(EXPERIMENTS.length)} <span class="slash">//</span> ${EXPERIMENTS.length} EKSPERIMEN</span>
      </footer>
    </section>
  `;

  const mapPanel = root.querySelector('[data-map-panel]');
  const headingTarget = root.querySelector('[data-zone-heading]');

  function renderZone() {
    const zone = getZone(selectedZoneId);
    if (!zone) return;
    const experiments = getExperimentsByZone(zone.id);
    const stars = getAdditionZoneStars(zone.id);
    const maxStars = experiments.length * 3;
    const zoneLocked = experiments.every((experiment) => !isExperimentUnlocked(experiment.id));
    const completedInZone = getAdditionZoneCompleted(zone.id);
    const nextExperiment = experiments.find((experiment) => isExperimentUnlocked(experiment.id) && !isExperimentComplete(experiment.id));
    const lastExperiment = experiments[experiments.length - 1] ?? null;
    const firstIndex = EXPERIMENTS.findIndex((experiment) => experiment.id === experiments[0]?.id);
    const gateExperiment = firstIndex > 0 ? EXPERIMENTS[firstIndex - 1] : null;

    headingTarget.textContent = zone.title;
    mapPanel.innerHTML = `
      <header class="map-head">
        <div class="map-zone-badge map-zone-badge--${zone.accent}">${icon(zoneLocked ? 'lock' : zone.icon, 27)}</div>
        <div class="map-head__copy">
          <span class="eyebrow">ZONA ${pad2(zone.index)} <span class="slash">//</span> ${zoneLocked ? 'TERSEGEL' : 'AKTIF'}</span>
          <h2>${zone.title}</h2>
          <p>${zone.theory}</p>
        </div>
        <div class="map-head__stats">
          <div class="map-stat-block"><span>${starIcon(15)} BINTANG</span><strong>${stars}<small>/${maxStars}</small></strong></div>
          <span class="badge ${completedInZone === experiments.length ? 'badge--green' : 'badge--outline'}">${zoneLocked ? 'TERKUNCI' : completedInZone === experiments.length ? 'ZONA SELESAI' : 'TERBUKA'}</span>
        </div>
      </header>
      ${zoneLocked ? `
        <div class="zone-locked-banner">
          <span class="zone-locked-banner__icon">${icon('lock', 18)}</span>
          <div><strong>Zona belum dapat dibuka</strong><p>Selesaikan ${gateExperiment ? `${gateExperiment.id} — ${gateExperiment.title}` : 'eksperimen sebelumnya'} untuk membukanya.</p></div>
        </div>` : ''}
      <div class="level-map" aria-label="Peta eksperimen ${zone.title}">
        <div class="map-decoration map-decoration--grid" aria-hidden="true"></div>
        <div class="map-rail" aria-hidden="true"></div>
        <div class="level-slots">${experiments.map((experiment, index) => experimentNodeMarkup(experiment, index)).join('')}</div>
        <div class="map-rail-label"><span>ENTRY POINT</span><span>REACTION DEPTH</span></div>
      </div>
      <footer class="map-info">
        <div class="map-info__copy">
          <span class="eyebrow">${experiments.length} EKSPERIMEN ${zoneLocked ? 'TERSEGEL' : 'TERSEDIA'}</span>
          <h3>${zone.subtitle}</h3>
          <p>${zoneLocked ? 'Zona terbuka otomatis setelah eksperimen sebelumnya selesai.' : nextExperiment ? `Berikutnya: <strong>${nextExperiment.id} — ${nextExperiment.title}.</strong>` : 'Semua eksperimen zona ini selesai. Ulangi untuk memperbaiki bintang.'}</p>
        </div>
        <div class="map-info__actions">
          <button type="button" class="btn btn--primary" data-map-continue ${zoneLocked ? 'disabled' : ''}>
            ${icon(zoneLocked ? 'lock' : nextExperiment ? 'play' : 'reset', 17)}
            <span>${zoneLocked ? 'Zona Terkunci' : nextExperiment ? `Lanjut ${nextExperiment.id}` : `Ulangi ${lastExperiment?.id ?? ''}`}</span>
          </button>
        </div>
      </footer>
    `;

    mapPanel.querySelectorAll('[data-experiment-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.experimentId;
        if (!isExperimentUnlocked(id)) return;
        navigate('addition-briefing', { experimentId: id });
      }, { signal });
    });
    mapPanel.querySelector('[data-map-continue]')?.addEventListener('click', () => {
      if (zoneLocked) return;
      const target = nextExperiment ?? lastExperiment;
      if (target && isExperimentUnlocked(target.id)) navigate('addition-briefing', { experimentId: target.id });
    }, { signal });
  }

  function selectZoneTab(zoneId) {
    selectedZoneId = zoneId;
    root.querySelectorAll('[data-zone]').forEach((button) => {
      const active = button.dataset.zone === selectedZoneId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    root.querySelector('.zone-tab.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  root.querySelectorAll('[data-zone]').forEach((button) => {
    button.addEventListener('click', () => {
      selectZoneTab(button.dataset.zone);
      renderZone();
    }, { signal });
  });
  root.querySelector('[data-back]')?.addEventListener('click', () => navigate('addition'), { signal });
  renderZone();

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') navigate('addition');
  }, { signal });

  return () => abort.abort();
}