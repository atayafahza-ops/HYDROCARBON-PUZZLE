import { navigate } from '../../ui/router.js';
import { icon, starIcon, moleculeMark } from '../../ui/icons.js';
import { escapeHTML } from '../../ui/helpers.js';
import { CODEX_PAGES } from '../data/codexEntries.js';
import {
  getAdditionCompletedCount,
  getAdditionExperimentCount,
  getAdditionTotalStars,
  getAdditionMaxStars,
} from '../../systems/save.js';

function indexButton(page, index, active) {
  return `
    <button type="button" class="codex-index__btn ${active ? 'is-active' : ''}" data-page-btn="${index}" ${active ? 'aria-current="page"' : ''}>
      <span class="codex-index__num">0${index + 1}</span>
      <span class="codex-index__icon">${icon(page.icon, 17)}</span>
      <span class="codex-index__copy"><strong>${page.title}</strong><small>${page.chapter}</small></span>
      ${icon('chevron-right', 14)}
    </button>`;
}

function pageMarkup(page) {
  return `
    <header class="codex-page__header">
      <span class="codex-page__icon">${icon(page.icon, 26)}</span>
      <div><span class="eyebrow">${page.chapter}</span><h2>${page.title}</h2></div>
    </header>
    ${page.sections.map((section) => `
      <section class="codex-section">
        <h3>${escapeHTML(section.heading)}</h3>
        <p class="codex-body-copy">${escapeHTML(section.body)}</p>
      </section>`).join('')}
  `;
}

export function mountAdditionCodex(root) {
  const completed = getAdditionCompletedCount();
  const total = getAdditionExperimentCount();
  const totalStars = getAdditionTotalStars();
  const maxStars = getAdditionMaxStars();
  let pageIndex = 0;
  let pageTurnTimer = null;
  const abort = new AbortController();
  const { signal } = abort;

  root.innerHTML = `
    <section class="screen codex-screen addition-codex-screen" aria-label="Reaction Codex">
      <header class="subbar">
        <button type="button" class="icon-btn subbar__back" data-back aria-label="Kembali ke Addition Lab">${icon('arrow-left', 20)}<span>Addition Lab</span></button>
        <div class="subbar__title">
          <span class="eyebrow">${icon('book', 14)} REACTION LIBRARY <span class="slash">//</span> ${CODEX_PAGES.length} BAB</span>
          <h1>Reaction Codex <span class="muted-title">— Teori Reaksi Adisi</span></h1>
        </div>
        <div class="subbar__stats">
          <span class="top-stat">${starIcon(16)}<strong>${totalStars}</strong><small>/${maxStars}</small></span>
          <span class="top-stat top-stat--safe">${icon('database', 15)}<span>${completed}/${total} eksperimen</span></span>
        </div>
      </header>

      <main class="codex-main panel">
        <div class="codex-book">
          <div class="codex-spine" aria-hidden="true"></div>
          <aside class="codex-index" aria-label="Daftar isi codex">
            <div class="codex-cover">
              <span class="codex-cover__seal">${moleculeMark(46)}</span>
              <span class="eyebrow">ADDITION LAB // FIELD NOTES</span>
              <h2>REACTION<br />CODEX</h2>
              <p>Catatan laboratorium tentang reaksi adisi alkena dan alkuna.</p>
            </div>
            <span class="codex-index__label">DAFTAR ISI</span>
            <nav class="codex-index__nav">${CODEX_PAGES.map((page, index) => indexButton(page, index, index === pageIndex)).join('')}</nav>
            <div class="codex-progress">
              <div class="codex-progress__head"><span>PROGRES EKSPERIMEN</span><strong>${completed}/${total}</strong></div>
              <div class="progress-track"><span style="width:${total ? Math.round((completed / total) * 100) : 0}%"></span></div>
              <button type="button" class="btn btn--primary btn--sm codex-cta" data-go-map>${icon('play', 15)}<span>Latihan di lab</span></button>
            </div>
          </aside>

          <div class="codex-page-wrap">
            <div class="codex-page-head"><span>ADDITION LAB <span class="slash">//</span> FILE 0${pageIndex + 1}</span><span>${starIcon(12)} REFERENSI TERVERIFIKASI</span></div>
            <article class="codex-page" data-codex-page aria-live="polite"></article>
            <footer class="codex-pager">
              <button type="button" class="pager-btn" data-page-prev aria-label="Halaman sebelumnya">${icon('chevron-left', 17)}<span>Sebelumnya</span></button>
              <span class="codex-pager__count" data-page-count></span>
              <button type="button" class="pager-btn" data-page-next aria-label="Halaman berikutnya"><span>Berikutnya</span>${icon('chevron-right', 17)}</button>
            </footer>
          </div>
        </div>
      </main>

      <footer class="screen-footer">
        <span>${icon('bulb', 15)} Gunakan tombol panah kiri dan kanan untuk membalik halaman.</span>
        <span class="footer-version">REACTION CODEX v1.0 <span class="slash">//</span> ${CODEX_PAGES.length} BAB</span>
      </footer>
    </section>
  `;

  const pageTarget = root.querySelector('[data-codex-page]');
  const pageCount = root.querySelector('[data-page-count]');
  const prevButton = root.querySelector('[data-page-prev]');
  const nextButton = root.querySelector('[data-page-next]');

  function renderPage(index) {
    pageIndex = Math.max(0, Math.min(CODEX_PAGES.length - 1, index));
    pageTarget.innerHTML = pageMarkup(CODEX_PAGES[pageIndex]);
    root.querySelectorAll('[data-page-btn]').forEach((button) => {
      const active = Number(button.dataset.pageBtn) === pageIndex;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    pageCount.textContent = `HALAMAN 0${pageIndex + 1} / 0${CODEX_PAGES.length}`;
    prevButton.disabled = pageIndex === 0;
    nextButton.disabled = pageIndex === CODEX_PAGES.length - 1;
    if (pageTurnTimer) window.clearTimeout(pageTurnTimer);
    pageTarget.classList.remove('is-turning');
    if (!document.documentElement.classList.contains('reduce-motion')) {
      void pageTarget.offsetWidth;
      pageTarget.classList.add('is-turning');
      pageTurnTimer = window.setTimeout(() => pageTarget.classList.remove('is-turning'), 320);
    }
    pageTarget.scrollTop = 0;
  }

  root.querySelectorAll('[data-page-btn]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.pageBtn);
      if (index !== pageIndex) renderPage(index);
    }, { signal });
  });
  prevButton.addEventListener('click', () => renderPage(pageIndex - 1), { signal });
  nextButton.addEventListener('click', () => renderPage(pageIndex + 1), { signal });
  root.querySelector('[data-back]')?.addEventListener('click', () => navigate('addition'), { signal });
  root.querySelector('[data-go-map]')?.addEventListener('click', () => navigate('addition-map'), { signal });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { navigate('addition'); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); if (pageIndex < CODEX_PAGES.length - 1) renderPage(pageIndex + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); if (pageIndex > 0) renderPage(pageIndex - 1); }
  }, { signal });

  renderPage(0);
  return () => { abort.abort(); if (pageTurnTimer) window.clearTimeout(pageTurnTimer); };
}