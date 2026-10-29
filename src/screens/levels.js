import { navigate } from '../ui/router.js';
import { icon, starIcon } from '../ui/icons.js';
import { pad2, starsHTML } from '../ui/helpers.js';
import { ZONES, getLevel, getZone, LEVELS } from '../data/levels.js';
import {
  getBestStars,
  getContinueLevelId,
  getLevelCount,
  getMaxStars,
  getTotalStars,
  getTotalXp,
  getZoneMaxStars,
  getZoneStars,
  isLevelComplete,
} from '../systems/save.js';

function zoneButtonMarkup(zone, selected) {
  const stars = getZoneStars(zone.id);
  const maxStars = getZoneMaxStars(zone.id);
  return `
    <button type="button" class="zone-tab zone-tab--${zone.accent} ${selected ? 'is-active' : ''}" data-zone="${zone.id}" aria-pressed="${selected}">
      <span class="zone-tab__icon">${icon(zone.icon, 20)}</span>
      <span class="zone-tab__copy">
        <strong>${zone.name}</strong>
        <span>${getLevelsForZone(zone.id).length} MISI</span>
      </span>
      <span class="zone-tab__side">
        <span class="zone-tab__count">${stars}/${maxStars}</span>
      </span>
    </button>
  `;
}

function getLevelsForZone(zoneId) {
  return LEVELS.filter((level) => level.zoneId === zoneId);
}

function levelNodeMarkup(level, index) {
  const complete = isLevelComplete(level.id);
  const stars = getBestStars(level.id);
  const current = !complete && level.id === getContinueLevelId();
  const statusLabel = complete ? 'SELESAI' : current ? 'LANJUT' : 'BUKA';
  return `
    <div class="level-slot ${current ? 'is-current' : ''}" style="--slot-index:${index}">
      <button type="button" class="level-node ${complete ? 'is-complete' : ''} ${current ? 'is-current' : ''}" data-level-id="${level.id}">
        <span class="level-node__top">${level.difficultyLabel.toUpperCase()}</span>
        <span class="level-node__number">${pad2(level.id)}</span>
        <span class="level-node__status">${statusLabel}</span>
        ${complete ? `<span class="level-node__check">${icon('check', 13)}</span>` : ''}
      </button>
      <span class="level-node__title">${level.title}</span>
      <span class="level-node__type">${level.typeLabel}</span>
      <span class="level-node__stars">${starsHTML(stars, { size: 13, label: `${stars} bintang` })}</span>
    </div>
  `;
}

export function mountLevels(root, params = {}) {
  const continueLevel = getLevel(getContinueLevelId());
  const requestedZone = params.zoneId ? getZone(params.zoneId) : null;
  let selectedZoneId = requestedZone?.id ?? getZone(continueLevel?.zoneId ?? 'carbon-basics')?.id ?? ZONES[0].id;
  const abort = new AbortController();
  const { signal } = abort;
  const levelCount = getLevelCount();

  root.innerHTML = `
    <section class="screen levels-screen" aria-label="Pemilihan level">
      <header class="subbar">
        <button type="button" class="icon-btn subbar__back" data-back aria-label="Kembali ke menu">${icon('arrow-left', 20)}<span>Menu</span></button>
        <div class="subbar__title">
          <span class="eyebrow">${icon('map', 14)} ARCHIVE MAP <span class="slash">//</span> ${ZONES.length} ZONA</span>
          <h1>Level Select <span class="muted-title">— <span data-zone-heading></span></span></h1>
        </div>
        <div class="subbar__stats">
          <span class="top-stat">${starIcon(16)}<strong>${getTotalStars()}</strong><small>/${getMaxStars()}</small></span>
          <span class="top-stat">${icon('spark', 15)}<strong>${getTotalXp()}</strong><small> XP</small></span>
          <span class="top-stat top-stat--safe">${icon('database', 15)}<span>${levelCount} level</span></span>
        </div>
      </header>

      <main class="levels-grid">
        <aside class="zone-panel panel" aria-label="Pilih laboratorium">
          <div class="panel-head panel-head--compact">
            <div>
              <span class="eyebrow">${icon('database', 13)} SECTOR INDEX</span>
              <h2 class="panel-title">LABORATORIUM</h2>
            </div>
          </div>
          <nav class="zone-list">
            ${ZONES.map((zone) => zoneButtonMarkup(zone, zone.id === selectedZoneId)).join('')}
          </nav>
          <div class="zone-panel-note">
            ${icon('info', 15)}
            <p>Semua level sudah terbuka. Pilih misi mana pun untuk berlatih, lalu ulangi untuk memperbaiki bintang.</p>
          </div>
          <div class="map-legend">
            <span><i class="legend-dot legend-dot--current"></i>Lanjut</span>
            <span><i class="legend-dot legend-dot--done"></i>Selesai</span>
            <span><i class="legend-dot legend-dot--open"></i>Terbuka</span>
          </div>
        </aside>

        <section class="map-panel panel" data-map-panel></section>
      </main>

      <footer class="screen-footer levels-footer">
        <span>${icon('bulb', 15)} Butuh petunjuk? Dr. Nova akan membantumu kapan saja.</span>
        <span class="footer-version">ARSIP 01—${pad2(levelCount)} <span class="slash">//</span> ${levelCount} MISI TERSEDIA</span>
      </footer>
    </section>
  `;

  const mapPanel = root.querySelector('[data-map-panel]');
  const headingTarget = root.querySelector('[data-zone-heading]');

  function renderZone() {
    const zone = getZone(selectedZoneId);
    if (!zone) return;
    const zoneLevels = getLevelsForZone(zone.id);
    const stars = getZoneStars(zone.id);
    const maxStars = getZoneMaxStars(zone.id);
    const nextLevel = zoneLevels.find((level) => !isLevelComplete(level.id));
    const lastLevel = zoneLevels[zoneLevels.length - 1] ?? null;
    const completedInZone = zoneLevels.filter((level) => isLevelComplete(level.id)).length;
    const firstTier = zoneLevels[0]?.difficulty ?? 1;
    const lastTier = zoneLevels[zoneLevels.length - 1]?.difficulty ?? firstTier;

    headingTarget.textContent = zone.name;

    mapPanel.innerHTML = `
      <header class="map-head">
        <div class="map-zone-badge map-zone-badge--${zone.accent}">${icon(zone.icon, 27)}</div>
        <div class="map-head__copy">
          <span class="eyebrow">LAB ${pad2(zone.index)} <span class="slash">//</span> ARSIP AKTIF</span>
          <h2>${zone.name}</h2>
          <p>${zone.description}</p>
        </div>
        <div class="map-head__stats">
          <div class="map-stat-block">
            <span>${starIcon(15)} BINTANG ZONA</span>
            <strong>${stars}<small>/${maxStars}</small></strong>
          </div>
          <div class="map-stat-block">
            <span>${icon('flask', 15)} TINGKAT</span>
            <strong>T${firstTier}<small>—${lastTier}</small></strong>
          </div>
          <span class="badge ${completedInZone === zoneLevels.length ? 'badge--green' : 'badge--outline'}">${completedInZone === zoneLevels.length ? 'ZONA SELESAI' : 'TERBUKA'}</span>
        </div>
      </header>

      <div class="level-map" aria-label="Peta level ${zone.name}">
        <div class="map-decoration map-decoration--grid" aria-hidden="true"></div>
        <div class="map-decoration map-decoration--node" aria-hidden="true"></div>
        <div class="map-rail" aria-hidden="true"></div>
        <div class="level-slots">
          ${zoneLevels.map((level, index) => levelNodeMarkup(level, index)).join('')}
        </div>
        <div class="map-rail-label"><span>ENTRY POINT</span><span>ARCHIVE DEPTH</span></div>
      </div>

      <footer class="map-info">
        <div class="map-info__copy">
          <span class="eyebrow">${zoneLevels.length} MISI TERSEDIA</span>
          <h3>Arsip ${zone.shortName}</h3>
          <p>${
            nextLevel
              ? `Lanjutkan penelitianmu. Misi berikutnya: <strong>Level ${pad2(nextLevel.id)} — ${nextLevel.title}.</strong>`
              : 'Semua misi pada zona ini telah dipulihkan. Kamu bisa mengulang level untuk memperbaiki bintang.'
          }</p>
        </div>
        <div class="map-info__actions">
          <button type="button" class="btn btn--primary" data-map-continue>
            ${icon(nextLevel ? 'play' : 'reset', 17)}
            <span>${nextLevel ? `Lanjutkan Level ${pad2(nextLevel.id)}` : `Ulangi Level ${pad2(lastLevel?.id ?? 1)}`}</span>
          </button>
        </div>
      </footer>
    `;

    mapPanel.querySelectorAll('[data-level-id]').forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const levelId = Number(button.dataset.levelId);
          if (!getLevel(levelId)) return;
          navigate('level', { levelId });
        },
        { signal },
      );
    });

    mapPanel.querySelector('[data-map-continue]')?.addEventListener(
      'click',
      () => {
        const targetLevel = nextLevel ?? lastLevel;
        if (targetLevel) navigate('level', { levelId: targetLevel.id });
      },
      { signal },
    );
  }

  root.querySelectorAll('[data-zone]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        selectedZoneId = button.dataset.zone;
        root.querySelectorAll('[data-zone]').forEach((zoneButton) => {
          const active = zoneButton.dataset.zone === selectedZoneId;
          zoneButton.classList.toggle('is-active', active);
          zoneButton.setAttribute('aria-pressed', String(active));
        });
        renderZone();
        mapPanel.classList.remove('map-panel--enter');
        void mapPanel.offsetWidth;
        mapPanel.classList.add('map-panel--enter');
      },
      { signal },
    );
  });

  root.querySelector('[data-back]')?.addEventListener('click', () => navigate('menu'), { signal });
  renderZone();

  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        navigate('menu');
        return;
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const currentIndex = ZONES.findIndex((zone) => zone.id === selectedZoneId);
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextZone = ZONES[(currentIndex + delta + ZONES.length) % ZONES.length];
      if (!nextZone) return;
      selectedZoneId = nextZone.id;
      root.querySelectorAll('[data-zone]').forEach((zoneButton) => {
        const active = zoneButton.dataset.zone === selectedZoneId;
        zoneButton.classList.toggle('is-active', active);
        zoneButton.setAttribute('aria-pressed', String(active));
      });
      renderZone();
    },
    { signal },
  );

  return () => abort.abort();
}
