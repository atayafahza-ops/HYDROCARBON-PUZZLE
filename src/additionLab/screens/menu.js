import { navigate } from '../../ui/router.js';
import { icon, starIcon } from '../../ui/icons.js';
import {
  getAdditionCompletedCount,
  getAdditionExperimentCount,
  getAdditionMaxStars,
  getAdditionTotalStars,
  getAdditionTotalXp,
  getContinueExperimentId,
} from '../../systems/save.js';
import { getRank, getUnlockedAchievementCount, ACHIEVEMENTS } from '../systems/additionProgress.js';
import { getExperiment } from '../data/experiments.js';
import { ZONES } from '../data/zones.js';

export function mountAdditionMenu(root) {
  const completed = getAdditionCompletedCount();
  const total = getAdditionExperimentCount();
  const totalStars = getAdditionTotalStars();
  const maxStars = getAdditionMaxStars();
  const totalXp = getAdditionTotalXp();
  const rank = getRank();
  const achievements = getUnlockedAchievementCount();
  const continueExperiment = getExperiment(getContinueExperimentId());
  const allComplete = completed >= total;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const abort = new AbortController();
  const { signal } = abort;

  root.innerHTML = `
    <section class="screen addition-screen" aria-label="Addition Lab — The Reaction Protocol">
      <header class="subbar">
        <button type="button" class="icon-btn subbar__back" data-back aria-label="Kembali ke menu utama">${icon('arrow-left', 20)}<span>Menu</span></button>
        <div class="subbar__title">
          <span class="eyebrow">${icon('flask', 14)} MODE BARU <span class="slash">//</span> THE REACTION PROTOCOL</span>
          <h1>Addition Lab <span class="muted-title">— Laboratorium Reaksi Adisi</span></h1>
        </div>
        <div class="subbar__stats">
          <span class="top-stat">${starIcon(16)}<strong>${totalStars}</strong><small>/${maxStars}</small></span>
          <span class="top-stat">${icon('spark', 15)}<strong>${totalXp}</strong><small> XP</small></span>
        </div>
      </header>

      <main class="addition-menu-grid">
        <section class="addition-hero panel">
          <div class="hero-grid" aria-hidden="true"></div>
          <span class="result-kicker">${icon('flask', 14)} REACTION PROTOCOL</span>
          <h2>Bangun produk.<br />Kuasai reaksi.</h2>
          <p class="addition-hero__lead">Pilih reagen, atur kondisi, jalankan reaksi, lalu bangun struktur produknya. ${total} eksperimen adisi alkena &amp; alkuna menantimu di ${ZONES.length} zona riset.</p>
          <div class="addition-hero__rank">
            <span class="rank-chip">${icon(rank.icon, 18)}<span><small>PANGKAT RISET</small><strong>${rank.name}</strong></span></span>
            <span class="badge badge--outline">${icon('trophy', 13)} ${achievements}/${ACHIEVEMENTS.length} PRESTASI</span>
          </div>
          <div class="addition-hero__actions">
            <button type="button" class="btn btn--primary btn--lg" data-action="continue">
              ${icon(allComplete ? 'reset' : 'play', 18)}<span>${allComplete ? 'Ulangi Eksperimen' : completed === 0 ? 'Mulai Eksperimen' : `Lanjut ${continueExperiment?.id ?? ''}`}</span>
            </button>
            <button type="button" class="btn btn--secondary" data-action="map">${icon('map', 17)}<span>Peta Eksperimen</span></button>
          </div>
        </section>

        <aside class="addition-menu-side">
          <section class="panel addition-progress-card">
            <div class="panel-head panel-head--compact">
              <div><span class="eyebrow">${icon('database', 13)} PROGRES RISET</span><h2 class="panel-title">ARSIP EKSPERIMEN</h2></div>
              <span class="panel-code">${percent}%</span>
            </div>
            <div class="progress-track"><span style="width:${percent}%"></span></div>
            <div class="addition-progress-stats">
              <span><small>EKSPERIMEN</small><strong>${completed}/${total}</strong></span>
              <span><small>BINTANG</small><strong>${totalStars}/${maxStars}</strong></span>
              <span><small>XP</small><strong>${totalXp}</strong></span>
            </div>
          </section>

          <button type="button" class="menu-btn menu-btn--cyan" data-action="codex">
            <span class="menu-btn__icon">${icon('book', 22)}</span>
            <span class="menu-btn__copy"><strong>Reaction Codex</strong><span>Teori reaksi adisi</span></span>
            ${icon('chevron-right', 17)}
          </button>
          <button type="button" class="menu-btn menu-btn--teal" data-action="profile">
            <span class="menu-btn__icon">${icon('users', 22)}</span>
            <span class="menu-btn__copy"><strong>Research Profile</strong><span>Pangkat &amp; prestasi</span></span>
            ${icon('chevron-right', 17)}
          </button>
          <p class="addition-independent-note">${icon('info', 14)} Progres Addition Lab terpisah dari Main Campaign dan tidak pernah mereset arsip lamamu.</p>
        </aside>
      </main>

      <footer class="screen-footer">
        <span>${icon('bulb', 15)} Pilih reagen → atur kondisi → bangun produk → validasi.</span>
        <span class="footer-version">ADDITION LAB v1.1 <span class="slash">//</span> ${total} EKSPERIMEN</span>
      </footer>
    </section>
  `;

  root.querySelector('[data-back]')?.addEventListener('click', () => navigate('menu'), { signal });
  root.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'continue') {
        navigate('addition-briefing', { experimentId: continueExperiment?.id ?? 'AL-01' });
      } else if (action === 'map') {
        navigate('addition-map');
      } else if (action === 'codex') {
        navigate('addition-codex');
      } else if (action === 'profile') {
        navigate('addition-profile');
      }
    }, { signal });
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') navigate('menu');
  }, { signal });

  return () => abort.abort();
}