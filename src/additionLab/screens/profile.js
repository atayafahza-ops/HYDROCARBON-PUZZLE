import { navigate } from '../../ui/router.js';
import { icon, starIcon } from '../../ui/icons.js';
import { escapeHTML, starsHTML } from '../../ui/helpers.js';
import { openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import {
  getAdditionTotalXp,
  getAdditionTotalStars,
  getAdditionMaxStars,
  getAdditionCompletedCount,
  getAdditionExperimentCount,
  resetAdditionLab,
} from '../../systems/save.js';
import { RANKS, getRank, getRankProgress, getAchievements } from '../systems/additionProgress.js';
import { EXPERIMENTS } from '../data/experiments.js';
import { ZONES } from '../data/zones.js';
import { getAdditionZoneCompleted } from '../../systems/save.js';

export function mountAdditionProfile(root) {
  const totalXp = getAdditionTotalXp();
  const totalStars = getAdditionTotalStars();
  const maxStars = getAdditionMaxStars();
  const completed = getAdditionCompletedCount();
  const total = getAdditionExperimentCount();
  const rank = getRank();
  const progress = getRankProgress();
  const achievements = getAchievements();
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const abort = new AbortController();
  const { signal } = abort;

  root.innerHTML = `
    <section class="screen addition-screen addition-profile-screen" aria-label="Research Profile">
      <header class="subbar">
        <button type="button" class="icon-btn subbar__back" data-back aria-label="Kembali ke Addition Lab">${icon('arrow-left', 20)}<span>Addition Lab</span></button>
        <div class="subbar__title">
          <span class="eyebrow">${icon('users', 14)} RESEARCHER FILE <span class="slash">//</span> ADDITION LAB</span>
          <h1>Research Profile <span class="muted-title">— Pangkat &amp; Prestasi</span></h1>
        </div>
        <div class="subbar__stats">
          <span class="top-stat">${starIcon(16)}<strong>${totalStars}</strong><small>/${maxStars}</small></span>
          <span class="top-stat">${icon('spark', 15)}<strong>${totalXp}</strong><small> XP</small></span>
        </div>
      </header>

      <main class="profile-grid">
        <section class="panel profile-rank-card">
          <div class="profile-rank-hero">
            <span class="profile-rank-icon">${icon(rank.icon, 40)}</span>
            <div><span class="eyebrow">PANGKAT RISET SAAT INI</span><h2>${rank.name}</h2><p>${totalXp} XP terkumpul</p></div>
          </div>
          <div class="rank-progress">
            <div class="rank-progress__head">
              <span>${progress.next ? `Menuju ${progress.next.name}` : 'Pangkat maksimum tercapai'}</span>
              <strong>${progress.next ? `${progress.into}/${progress.span} XP` : 'MAX'}</strong>
            </div>
            <div class="progress-track"><span style="width:${progress.percent}%"></span></div>
          </div>
          <div class="rank-ladder">
            ${RANKS.map((entry) => `
              <div class="rank-step ${entry.minXp <= totalXp ? 'is-reached' : ''} ${entry.id === rank.id ? 'is-current' : ''}">
                <span class="rank-step__icon">${icon(entry.icon, 18)}</span>
                <div><strong>${entry.name}</strong><small>${entry.minXp} XP</small></div>
                ${entry.minXp <= totalXp ? icon('check', 15) : icon('lock', 14)}
              </div>`).join('')}
          </div>
        </section>

        <section class="panel profile-stats-card">
          <div class="panel-head panel-head--compact"><div><span class="eyebrow">${icon('database', 13)} STATISTIK</span><h2 class="panel-title">RINGKASAN RISET</h2></div></div>
          <div class="profile-stat-grid">
            <div class="profile-stat"><span>EKSPERIMEN</span><strong>${completed}<small>/${total}</small></strong></div>
            <div class="profile-stat"><span>BINTANG</span><strong>${totalStars}<small>/${maxStars}</small></strong></div>
            <div class="profile-stat"><span>TOTAL XP</span><strong>${totalXp}</strong></div>
            <div class="profile-stat"><span>PRESTASI</span><strong>${unlockedCount}<small>/${achievements.length}</small></strong></div>
          </div>
          <div class="profile-zone-list">
            ${ZONES.map((zone) => {
              const done = getAdditionZoneCompleted(zone.id);
              const count = EXPERIMENTS.filter((experiment) => experiment.zone === zone.id).length;
              return `<div class="profile-zone-row"><span>${icon(zone.icon, 15)} ${zone.title}</span><strong>${done}/${count}</strong></div>`;
            }).join('')}
          </div>
        </section>

        <section class="panel profile-achievements-card">
          <div class="panel-head panel-head--compact"><div><span class="eyebrow">${icon('trophy', 13)} ACHIEVEMENTS</span><h2 class="panel-title">PRESTASI</h2></div><span class="panel-code">${unlockedCount}/${achievements.length}</span></div>
          <div class="achievement-grid">
            ${achievements.map((achievement) => `
              <div class="achievement ${achievement.unlocked ? 'is-unlocked' : 'is-locked'}">
                <span class="achievement__icon">${icon(achievement.unlocked ? achievement.icon : 'lock', 22)}</span>
                <div><strong>${escapeHTML(achievement.name)}</strong><p>${escapeHTML(achievement.description)}</p></div>
                ${achievement.unlocked ? `<span class="achievement__check">${icon('check', 14)}</span>` : ''}
              </div>`).join('')}
          </div>
        </section>
      </main>

      <footer class="screen-footer profile-footer">
        <button type="button" class="btn btn--danger btn--sm" data-reset-lab>${icon('trash', 15)}<span>Reset Addition Lab</span></button>
        <span class="footer-version">${icon('info', 13)} Reset hanya menghapus progres Addition Lab, bukan Main Campaign.</span>
      </footer>
    </section>
  `;

  root.querySelector('[data-back]')?.addEventListener('click', () => navigate('addition'), { signal });
  root.querySelector('[data-reset-lab]')?.addEventListener('click', () => {
    openModal({
      eyebrow: 'RESET ARSIP',
      title: 'Reset Addition Lab?',
      body: '<p>Semua bintang, XP, pangkat, dan prestasi Addition Lab akan dihapus. Progres Main Campaign tidak terpengaruh. Tindakan ini tidak dapat dibatalkan.</p>',
      actions: [
        { label: 'Batal', variant: 'secondary' },
        { label: 'Reset Addition Lab', variant: 'danger', icon: 'trash', onClick: () => { resetAdditionLab(); showToast('Progres Addition Lab direset.', { type: 'info' }); navigate('addition'); } },
      ],
    });
  }, { signal });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') navigate('addition');
  }, { signal });

  return () => abort.abort();
}