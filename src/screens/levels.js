import { navigate } from '../ui/router.js';
import { icon, starIcon } from '../ui/icons.js';
import { pad2, starsHTML } from '../ui/helpers.js';
import { showToast } from '../ui/toast.js';
import { ZONES, getLevel, getZone, LEVELS } from '../data/levels.js';
import {
  getBestStars,
  getContinueLevelId,
  getMaxStars,
  getTotalStars,
  getTotalXp,
  getZoneMaxStars,
  getZoneStars,
  isLevelComplete,
  isLevelUnlocked,
} from '../systems/save.js';

function zoneIsOpen(zone) {
  if (zone.status !== 'available') return false;
  return zone.index === 1 || isLevelUnlocked(zone.slotStart);
}

function zoneButtonMarkup(zone, selected) {
  const open = zoneIsOpen(zone);
  const stars = getZoneStars(zone.id);
  const maxStars = getZoneMaxStars(zone.id);
  const isSoon = zone.status === 'soon';
  return `
    <button type="button" class="zone-tab zone-tab--${zone.accent} ${selected ? 'is-active' : ''} ${!open ? 'is-locked' : ''}" data-zone="${zone.id}" aria-pressed="${selected}">
      <span class="zone-tab__icon">${icon(zone.icon, 20)}</span>
      <span class="zone-tab__copy">
        <strong>${zone.name}</strong>
        <span>${isSoon ? 'SEGERA HADIR' : open ? `${maxStars} BINTANG` : 'TERKUNCI'}</span>
      </span>
      <span class="zone-tab__side">
        ${open ? `<span class="zone-tab__count">${stars}/${maxStars}</span>` : `<span class="zone-tab__lock">${icon('lock', 14)}</span>`}
      </span>
    </button>
  `;
}

function emptyLevelNode(zone, slotNumber) {
  const isSoon = zone.status === 'soon' || slotNumber > 8;
  return `
    <div class="level-slot level-slot--locked">
      <div class="level-node level-node--placeholder" aria-label="Level ${slotNumber} belum tersedia">
        <span class="level-node__top">LEVEL</span>
        <span class="level-node__number">${pad2(slotNumber)}</span>
        <span class="level-node__lock">${icon(isSoon ? 'clock' : 'lock', 17)}</span>
        <span class="level-node__status">${isSoon ? 'SEGERA' : 'TERKUNCI'}</span>
      </div>
      <span class="level-node__title">${isSoon ? 'Belum tersedia' : 'Terkunci'}</span>
      <span class="level-node__type">${isSoon ? 'PEMBARUAN' : 'ARSIP'}</span>
    </div>
  `;
}

function levelNodeMarkup(level, index) {
  const unlocked = isLevelUnlocked(level.id);
  const complete = isLevelComplete(level.id);
  const stars = getBestStars(level.id);
  const current = unlocked && !complete;
  const statusLabel = complete ? 'SELESAI' : unlocked ? 'LANJUT' : 'TERKUNCI';
  return `
    <div class="level-slot ${current ? 'is-current' : ''}" style="--slot-index:${index}">
      <button type="button" class="level-node ${complete ? 'is-complete' : ''} ${current ? 'is-current' : ''} ${!unlocked ? 'is-locked' : ''}" data-level-id="${level.id}" ${!unlocked ? 'aria-disabled="true"' : ''}>
        <span class="level-node__top">LEVEL</span>
        <span class="level-node__number">${pad2(level.id)}</span>
        <span class="level-node__status">${statusLabel}</span>
        ${!unlocked ? `<span class="level-node__lock">${icon('lock', 16)}</span>` : ''}
        ${complete ? `<span class="level-node__check">${icon('check', 13)}</span>` : ''}
      </button>
      <span class="level-node__title">${level.title}</span>
      <span class="level-node__type">${level.typeLabel}</span>
      <span class="level-node__stars">${starsHTML(stars, { size: 13, label: `${stars} bintang` })}</span>
    </div>
  `;
}

export function mountLevels(root, params = {}) {
  const initialZone = getZone(params.zoneId ?? getZone(getLevel(getContinueLevelId())?.zoneId ?? 'carbon-basics').id);
  let selectedZoneId = initialZone.id;
  const abort = new AbortController();
  const { signal } = abort;

  root.innerHTML = `
    <section class="screen levels-screen" aria-label="Pemilihan level">
      <header class="subbar">
        <button type="button" class="icon-btn subbar__back" data-back aria-label="Kembali ke menu">${icon('arrow-left', 20)}<span>Menu</span></button>
        <div class="subbar__title">
          <span class="eyebrow">${icon('map', 14)} ARCHIVE MAP <span class="slash">//</span> 5 ZONA</span>
          <h1>Level Select <span class="muted-title">— <span data-zone-heading></span></span></h1>
        </div>
        <div class="subbar__stats">
          <span class="top-stat">${starIcon(16)}<strong>${getTotalStars()}</strong><small>/${getMaxStars()}</small></span>
          <span class="top-stat">${icon('spark', 15)}<strong>${getTotalXp()}</strong><small> XP</small></span>
          <span class="top-stat top-stat--safe">${icon('database', 15)}<span>8 level MVP</span></span>
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
            <p>Level baru terbuka setelah level sebelumnya selesai. Zona yang terkunci tetap dapat dipratinjau.</p>
          </div>
          <div class="map-legend">
            <span><i class="legend-dot legend-dot--current"></i>Lanjut</span>
            <span><i class="legend-dot legend-dot--done"></i>Selesai</span>
            <span><i class="legend-dot legend-dot--locked"></i>Terkunci</span>
          </div>
        </aside>

        <section class="map-panel panel" data-map-panel></section>
      </main>

      <footer class="screen-footer levels-footer">
        <span>${icon('bulb', 15)} Pilih level mana pun yang sudah terbuka untuk mengulang latihan.</span>
        <span class="footer-version">ARSIP 01—08 <span class="slash">//</span> 8 MISI TERSEDIA</span>
      </footer>
    </section>
  `;

  const mapPanel = root.querySelector('[data-map-panel]');
  const headingTarget = root.querySelector('[data-zone-heading]');

  function renderZone() {
    const zone = getZone(selectedZoneId);
    const open = zoneIsOpen(zone);
    const zoneLevels = LEVELS.filter((level) => level.zoneId === zone.id);
    const slotNumbers = Array.from({ length: 5 }, (_, index) => zone.slotStart + index);
    const stars = getZoneStars(zone.id);
    const maxStars = getZoneMaxStars(zone.id);
    const nextLevel = open
      ? zoneLevels.find((level) => isLevelUnlocked(level.id) && !isLevelComplete(level.id))
      : null;
    const lastLevel = zoneLevels[zoneLevels.length - 1] ?? null;
    const completedInZone = zoneLevels.filter((level) => isLevelComplete(level.id)).length;
    const statusText =
      zone.status === 'soon'
        ? 'SEGERA HADIR'
        : open
          ? completedInZone === zoneLevels.length
            ? 'ZONA SELESAI'
            : 'TERBUKA'
          : 'TERKUNCI';

    headingTarget.textContent = zone.name;

    mapPanel.innerHTML = `
      <header class="map-head">
        <div class="map-zone-badge map-zone-badge--${zone.accent}">${icon(zone.icon, 27)}</div>
        <div class="map-head__copy">
          <span class="eyebrow">LAB 0${zone.index} <span class="slash">//</span> ${zone.status === 'soon' ? 'DALAM PEMBANGUNAN' : 'ARSIP AKTIF'}</span>
          <h2>${zone.name}</h2>
          <p>${zone.description}</p>
        </div>
        <div class="map-head__stats">
          <div class="map-stat-block">
            <span>${starIcon(15)} BINTANG ZONA</span>
            <strong>${open ? `${stars}<small>/${maxStars}</small>` : '—'}</strong>
          </div>
          <span class="badge ${open ? 'badge--green' : 'badge--muted'}">${open ? 'TERBUKA' : statusText}</span>
        </div>
      </header>

      <div class="level-map" aria-label="Peta level ${zone.name}">
        <div class="map-decoration map-decoration--grid" aria-hidden="true"></div>
        <div class="map-decoration map-decoration--node" aria-hidden="true"></div>
        <div class="map-rail" aria-hidden="true"></div>
        <div class="level-slots">
          ${slotNumbers
            .map((slotNumber, index) => {
              const level = getLevel(slotNumber);
              if (!level) return emptyLevelNode(zone, slotNumber);
              return levelNodeMarkup(level, index);
            })
            .join('')}
        </div>
        <div class="map-rail-label"><span>ENTRY POINT</span><span>ARCHIVE DEPTH</span></div>
      </div>

      ${
        !open
          ? `<div class="zone-locked-banner">
              <span class="zone-locked-banner__icon">${icon(zone.status === 'soon' ? 'clock' : 'lock', 25)}</span>
              <div>
                <strong>${zone.status === 'soon' ? 'Zona ini sedang direstorasi.' : 'Arsip zona ini masih terkunci.'}</strong>
                <p>${zone.status === 'soon' ? 'Level baru pada zona ini akan ditambahkan pada pembaruan berikutnya.' : 'Selesaikan rangkaian level sebelumnya untuk membuka akses laboratorium ini.'}</p>
              </div>
            </div>`
          : ''
      }

      <footer class="map-info">
        <div class="map-info__copy">
          <span class="eyebrow">${open ? `${zoneLevels.length} MISI TERSEDIA` : 'AKSES TERBATAS'}</span>
          <h3>${open ? `Arsip ${zone.shortName}` : zone.status === 'soon' ? 'Segera di Carbon Code' : 'Teruskan dari Carbon Basics'}</h3>
          <p>${
            open
              ? nextLevel
                ? `Lanjutkan penelitianmu. Misi berikutnya: <strong>Level ${pad2(nextLevel.id)} — ${nextLevel.title}.</strong>`
                : 'Semua misi pada zona ini telah dipulihkan. Kamu bisa mengulang level untuk memperbaiki bintang.'
              : zone.status === 'soon'
                ? 'Nantinya zona ini memuat tantangan tata nama dan isomer yang lebih kompleks.'
                : 'Zona ini akan terbuka setelah seluruh arsip Carbon Basics dipulihkan.'
          }</p>
        </div>
        <div class="map-info__actions">
          ${
            open
              ? `<button type="button" class="btn btn--primary" data-map-continue>
                  ${icon(nextLevel ? 'play' : 'reset', 17)}
                  <span>${nextLevel ? `Lanjutkan Level ${pad2(nextLevel.id)}` : `Ulangi Level ${pad2(lastLevel?.id ?? 1)}`}</span>
                </button>`
              : `<button type="button" class="btn btn--ghost" disabled>${icon('lock', 16)}<span>Belum terbuka</span></button>`
          }
        </div>
      </footer>
    `;

    mapPanel.querySelectorAll('[data-level-id]').forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const levelId = Number(button.dataset.levelId);
          const level = getLevel(levelId);
          if (!level) return;
          if (!isLevelUnlocked(levelId)) {
            showToast('Selesaikan level sebelumnya untuk membuka arsip ini.', { type: 'info' });
            return;
          }
          navigate('level', { levelId });
        },
        { signal },
      );
    });

    mapPanel.querySelector('[data-map-continue]')?.addEventListener(
      'click',
      () => {
        const targetLevel = nextLevel ?? lastLevel;
        if (targetLevel && isLevelUnlocked(targetLevel.id)) {
          navigate('level', { levelId: targetLevel.id });
        }
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
