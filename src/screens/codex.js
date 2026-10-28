import { navigate } from '../ui/router.js';
import { icon, moleculeMark, starIcon } from '../ui/icons.js';
import { formulaHTML } from '../chemistry/formula.js';
import { analyzeMolecule } from '../chemistry/graph.js';
import { renderStructureSVG } from '../ui/structure.js';
import {
  BUTANE,
  ETHENE,
  ETHYNE,
  ISOBUTANE,
  METHANE,
  METHYLBUTANE,
  PROPANE,
} from '../data/levels.js';
import {
  getCompletedCount,
  getLevelCount,
  getMaxStars,
  getTotalStars,
} from '../systems/save.js';

const CATEGORY_LABEL = {
  alkana: 'Alkana',
  alkena: 'Alkena',
  alkuna: 'Alkuna',
};

function miniStructure(molecule, name, options = {}) {
  const analysis = analyzeMolecule(molecule);
  return `
    <figure class="codex-structure ${options.className ?? ''}">
      <div class="codex-structure__canvas">
        ${renderStructureSVG(molecule, {
          className: 'structure-svg structure-svg--ink',
          ariaLabel: `Struktur ${name}`,
        })}
      </div>
      <figcaption class="codex-structure__meta">
        <strong>${name}</strong>
        <span>${formulaHTML(analysis.carbonCount, analysis.hydrogenCount)} &nbsp;•&nbsp; ${CATEGORY_LABEL[analysis.category] ?? 'Hidrokarbon'}</span>
      </figcaption>
    </figure>
  `;
}

const PAGES = [
  {
    title: 'Dasar Hidrokarbon',
    short: 'Dasar',
    icon: 'atom',
    chapter: 'FONDASI',
    render: () => `
      <header class="codex-chapter">
        <span class="codex-chapter__index">01</span>
        <div>
          <span class="codex-kicker">PRINSIP DASAR</span>
          <h2>Dasar Hidrokarbon</h2>
          <p class="codex-lead">Hidrokarbon adalah senyawa yang tersusun dari atom karbon (C) dan hidrogen (H). Dalam Carbon Code, struktur direpresentasikan sebagai jaringan ikatan antar-atom karbon.</p>
        </div>
      </header>

      <div class="codex-callout">
        ${icon('info', 18)}
        <p>Rumus molekul tidak dibaca dari bentuk gambar. Ia dihitung dari <strong>konektivitas</strong> dan <strong>orde ikatan</strong> pada setiap atom karbon.</p>
      </div>

      <div class="codex-concept-grid">
        <article class="codex-concept">
          <span class="codex-concept__no">STEP 01</span>
          ${icon('atom', 26)}
          <h3>Valensi karbon</h3>
          <p>Setiap atom C memiliki empat elektron valensi. Total orde ikatan yang dapat dipakai karbon tidak boleh melebihi <strong>4</strong>.</p>
        </article>
        <article class="codex-concept">
          <span class="codex-concept__no">STEP 02</span>
          ${icon('spark', 26)}
          <h3>Hidrogen otomatis</h3>
          <p>Jumlah hidrogen pada tiap karbon dihitung dari sisa valensi: <strong>H = 4 − Σ orde ikatan</strong>.</p>
        </article>
        <article class="codex-concept">
          <span class="codex-concept__no">STEP 03</span>
          ${icon('check', 26)}
          <h3>Satu molekul utuh</h3>
          <p>Semua atom harus terhubung. Atom terpisah dianggap belum membentuk satu molekul dan ditolak validator.</p>
        </article>
      </div>

      <div class="valence-diagram">
        <div class="valence-atom">C<span>4</span></div>
        <span class="valence-arrow">${icon('arrow-right', 18)}</span>
        <div class="valence-slots">
          <span class="valence-slot">C–C <small>1</small></span>
          <span class="valence-slot">C=C <small>2</small></span>
          <span class="valence-slot">C–H <small>1</small></span>
          <span class="valence-slot">C≡C <small>3</small></span>
        </div>
        <p>Semua pemakaian valensi dijumlahkan. Sisa valensi menjadi jumlah atom H.</p>
      </div>

      <p class="codex-footnote">Contoh: karbon tunggal tanpa ikatan C–C memiliki sisa valensi 4, sehingga rumusnya CH₄ (metana).</p>
    `,
  },
  {
    title: 'Rumus Umum',
    short: 'Rumus',
    icon: 'flask',
    chapter: 'KOMPOSISI',
    render: () => `
      <header class="codex-chapter">
        <span class="codex-chapter__index">02</span>
        <div>
          <span class="codex-kicker">PETA RUMUS</span>
          <h2>Rumus Umum Hidrokarbon</h2>
          <p class="codex-lead">Golongan hidrokarbon dapat dikenali dari jenis ikatannya. Rantai terbuka dengan n atom karbon mengikuti pola rumus berikut.</p>
        </div>
      </header>

      <div class="formula-cards">
        <article class="formula-card formula-card--alkana">
          <span>ALKANA</span>
          <strong>C<sub>n</sub>H<sub>2n+2</sub></strong>
          <p>Semua ikatan C–C tunggal (jenuh).</p>
          <em>Contoh: CH₄, C₃H₈</em>
        </article>
        <article class="formula-card formula-card--alkena">
          <span>ALKENA</span>
          <strong>C<sub>n</sub>H<sub>2n</sub></strong>
          <p>Satu ikatan rangkap dua C=C pada rantai.</p>
          <em>Contoh: C₂H₄, C₄H₈</em>
        </article>
        <article class="formula-card formula-card--alkuna">
          <span>ALKUNA</span>
          <strong>C<sub>n</sub>H<sub>2n−2</sub></strong>
          <p>Satu ikatan rangkap tiga C≡C pada rantai.</p>
          <em>Contoh: C₂H₂, C₃H₄</em>
        </article>
      </div>

      <table class="codex-table">
        <thead>
          <tr><th>Golongan</th><th>Rumus</th><th>Contoh</th><th>Ikatan khas</th></tr>
        </thead>
        <tbody>
          <tr><td>Alkana</td><td>C<sub>n</sub>H<sub>2n+2</sub></td><td>Metana, propana</td><td><span class="mini-bond">C–C</span></td></tr>
          <tr><td>Alkena</td><td>C<sub>n</sub>H<sub>2n</sub></td><td>Etena, butena</td><td><span class="mini-bond mini-bond--double">C=C</span></td></tr>
          <tr><td>Alkuna</td><td>C<sub>n</sub>H<sub>2n−2</sub></td><td>Etuna, butuna</td><td><span class="mini-bond mini-bond--triple">C≡C</span></td></tr>
        </tbody>
      </table>

      <div class="codex-callout codex-callout--warm">
        ${icon('bulb', 18)}
        <p>Dari alkana ke alkena, hidrogen berkurang 2 karena satu ikatan tunggal digantikan ikatan rangkap dua. Alkuna kehilangan 2 hidrogen lagi.</p>
      </div>

      <p class="codex-footnote">Rumus umum ini berlaku untuk hidrokarbon rantai terbuka (asiklik) dengan satu jenis ikatan rangkap. Struktur siklik tidak termasuk cakupan arsip ini.</p>
    `,
  },
  {
    title: 'Jenis Ikatan',
    short: 'Ikatan',
    icon: 'bond',
    chapter: 'MEKANIKA',
    render: () => `
      <header class="codex-chapter">
        <span class="codex-chapter__index">03</span>
        <div>
          <span class="codex-kicker">ORDE IKATAN</span>
          <h2>Tiga Jenis Ikatan</h2>
          <p class="codex-lead">Jenis ikatan menentukan berapa valensi yang dipakai dan berapa hidrogen yang tersisa pada setiap karbon.</p>
        </div>
      </header>

      <div class="bond-codex-grid">
        <article class="bond-codex bond-codex--single">
          <span class="bond-codex__icon">${icon('bond1', 38)}</span>
          <span class="bond-codex__tag">ORDE 1</span>
          <h3>Ikatan tunggal</h3>
          <p>Menghubungkan dua karbon dengan satu pasangan ikatan. Memakai <strong>1 valensi</strong> dari masing-masing atom.</p>
          <code>C–C</code>
        </article>
        <article class="bond-codex bond-codex--double">
          <span class="bond-codex__icon">${icon('bond2', 38)}</span>
          <span class="bond-codex__tag">ORDE 2</span>
          <h3>Ikatan rangkap dua</h3>
          <p>Dua pasangan ikatan antar-karbon. Memakai <strong>2 valensi</strong> dari masing-masing atom.</p>
          <code>C=C</code>
        </article>
        <article class="bond-codex bond-codex--triple">
          <span class="bond-codex__icon">${icon('bond3', 38)}</span>
          <span class="bond-codex__tag">ORDE 3</span>
          <h3>Ikatan rangkap tiga</h3>
          <p>Tiga pasangan ikatan antar-karbon. Memakai <strong>3 valensi</strong> dari masing-masing atom.</p>
          <code>C≡C</code>
        </article>
      </div>

      <section class="codex-section">
        <h3>Bandingkan contohnya</h3>
        <div class="bond-example-grid">
          ${miniStructure(ETHENE, 'Etena', { className: 'codex-structure--compact' })}
          ${miniStructure(ETHYNE, 'Etuna', { className: 'codex-structure--compact' })}
        </div>
      </section>

      <div class="codex-note-row">
        <span>${icon('info', 16)} Informasi orde ikatan ditampilkan dengan jumlah garis, bukan hanya warna.</span>
      </div>

      <p class="codex-footnote">Dalam game, pilih alat ikatan terlebih dahulu, lalu klik dua atom karbon untuk menghubungkannya. Jika ikatan sudah ada, klik dua atom lagi untuk mengganti ordenya.</p>
    `,
  },
  {
    title: 'Rantai & Tata Nama',
    short: 'Tata nama',
    icon: 'book',
    chapter: 'NOMENKLATUR',
    render: () => `
      <header class="codex-chapter">
        <span class="codex-chapter__index">04</span>
        <div>
          <span class="codex-kicker">ATURAN UTAMA</span>
          <h2>Rantai Induk &amp; Tata Nama</h2>
          <p class="codex-lead">Nama hidrokarbon dibangun dari posisi, substituen, rantai induk, dan akhiran yang sesuai jenis ikatan.</p>
        </div>
      </header>

      <div class="naming-steps">
        <div><span>1</span><p><strong>Rantai terpanjang</strong> menjadi rantai induk. Untuk alkena dan alkuna, rantai itu wajib memuat ikatan rangkap.</p></div>
        <div><span>2</span><p><strong>Penomoran</strong> dimulai dari ujung yang memberi posisi terendah pada ikatan rangkap, lalu substituen.</p></div>
        <div><span>3</span><p><strong>Substituen</strong> seperti metil dan etil disebut sebelum rantai induk beserta posisinya.</p></div>
        <div><span>4</span><p><strong>Akhiran</strong> mengikuti golongan: -ana, -ena, atau -una.</p></div>
      </div>

      <div class="naming-tables">
        <section>
          <h3>Panjang rantai</h3>
          <table class="codex-table codex-table--tight">
            <tbody>
              <tr><td>1</td><td>met</td><td>metana</td></tr>
              <tr><td>2</td><td>et</td><td>etana</td></tr>
              <tr><td>3</td><td>prop</td><td>propana</td></tr>
              <tr><td>4</td><td>but</td><td>butana</td></tr>
              <tr><td>5</td><td>pent</td><td>pentana</td></tr>
            </tbody>
          </table>
        </section>
        <section>
          <h3>Akhiran</h3>
          <div class="suffix-list">
            <span><strong>-ana</strong><small>ikatan tunggal</small></span>
            <span><strong>-ena</strong><small>ikatan rangkap dua</small></span>
            <span><strong>-una</strong><small>ikatan rangkap tiga</small></span>
          </div>
          <div class="substituent-chip-row">
            <span class="name-token">metil</span>
            <span class="name-token">etil</span>
            <span class="name-token">propil</span>
          </div>
        </section>
      </div>

      <div class="naming-example">
        ${miniStructure(METHYLBUTANE, 'Contoh senyawa', { className: 'codex-structure--compact' })}
        <div class="naming-example__copy">
          <span class="codex-kicker">CONTOH PENERAPAN</span>
          <div class="naming-token-line">
            <span class="name-token name-token--pos">2</span>
            <span class="name-token name-token--sub">metil</span>
            <span class="name-token name-token--stem">but</span>
            <span class="name-token name-token--suffix">-ana</span>
          </div>
          <strong>2-metilbutana</strong>
          <p>Rantai terpanjang 4 karbon, cabang metil di posisi 2, semua ikatan tunggal.</p>
        </div>
      </div>

      <p class="codex-footnote">Penulisan alternatif yang setara, seperti but-1-ena, dapat diterima selama aturan penomoran dan komponen namanya benar.</p>
    `,
  },
  {
    title: 'Contoh Struktur',
    short: 'Contoh',
    icon: 'flask',
    chapter: 'REFERENSI',
    render: () => `
      <header class="codex-chapter">
        <span class="codex-chapter__index">05</span>
        <div>
          <span class="codex-kicker">GALERI ARSIP</span>
          <h2>Contoh Struktur</h2>
          <p class="codex-lead">Empat struktur dasar yang mewakili alkana, alkena, dan percabangan sederhana.</p>
        </div>
      </header>

      <div class="codex-gallery">
        ${miniStructure(METHANE, 'Metana')}
        ${miniStructure(PROPANE, 'Propana')}
        ${miniStructure(ETHENE, 'Etena')}
        ${miniStructure(ISOBUTANE, '2-metilpropana')}
      </div>

      <div class="codex-callout">
        ${icon('eye', 18)}
        <p>Perhatikan label atom: CH₃ di ujung rantai, CH₂ di tengah, dan CH₄ pada metana. Label ini berasal dari perhitungan hidrogen otomatis, bukan pilihan pemain.</p>
      </div>

      <p class="codex-footnote">Semua struktur di atas dapat kamu buka kembali dan susun ulang melalui Level Select. Posisi gambar boleh berbeda; yang dinilai adalah hubungan ikatannya.</p>
    `,
  },
  {
    title: 'Isomer Struktur',
    short: 'Isomer',
    icon: 'branch',
    chapter: 'VARIASI',
    render: () => `
      <header class="codex-chapter">
        <span class="codex-chapter__index">06</span>
        <div>
          <span class="codex-kicker">RUMUS SAMA, BENTUK BEDA</span>
          <h2>Isomer Struktur</h2>
          <p class="codex-lead">Dua molekul dapat memiliki rumus molekul yang sama namun konektivitas atom yang berbeda. Keduanya adalah senyawa yang sah.</p>
        </div>
      </header>

      <div class="isomer-compare">
        ${miniStructure(BUTANE, 'Butana', { className: 'codex-structure--compare' })}
        <div class="isomer-divider"><span>VS</span><small>C₄H₁₀</small></div>
        ${miniStructure(ISOBUTANE, '2-metilpropana', { className: 'codex-structure--compare' })}
      </div>

      <div class="isomer-insight">
        <span>${icon('branch', 20)}</span>
        <div>
          <strong>Konektivitas berbeda, rumus sama.</strong>
          <p>Keduanya memiliki 4 karbon dan 10 hidrogen. Butana membentuk rantai lurus, sedangkan 2-metilpropana memiliki satu karbon pusat yang bercabang ke tiga karbon.</p>
        </div>
      </div>

      <section class="codex-section">
        <h3>Menghitung isomer C₅H₁₂</h3>
        <p class="codex-body-copy">Dengan lima karbon, ada tiga isomer struktur alkana: pentana (lurus), 2-metilbutana, dan 2,2-dimetilpropana. Carbon Code memakai 2-metilbutana sebagai contoh cabang pada Level 8.</p>
        ${miniStructure(METHYLBUTANE, '2-metilbutana', { className: 'codex-structure--compact' })}
      </section>

      <div class="codex-callout codex-callout--warm">
        ${icon('target', 18)}
        <p>Saat misi menerima beberapa isomer, validator memeriksa kecocokan rumus, kategori, dan konektivitas. Jangan menilai benar hanya dari bentuk visual.</p>
      </div>
    `,
  },
];

function indexButton(page, index, active) {
  return `
    <button type="button" class="codex-index__btn ${active ? 'is-active' : ''}" data-page-btn="${index}" ${active ? 'aria-current="page"' : ''}>
      <span class="codex-index__num">0${index + 1}</span>
      <span class="codex-index__icon">${icon(page.icon, 17)}</span>
      <span class="codex-index__copy"><strong>${page.title}</strong><small>${page.chapter}</small></span>
      ${icon('chevron-right', 14)}
    </button>
  `;
}

export function mountCodex(root) {
  const totalStars = getTotalStars();
  const maxStars = getMaxStars();
  const completed = getCompletedCount();
  const levelCount = getLevelCount();
  let pageIndex = 0;
  let pageTurnTimer = null;
  const abort = new AbortController();
  const { signal } = abort;

  root.innerHTML = `
    <section class="screen codex-screen" aria-label="Molecular Codex">
      <header class="subbar">
        <button type="button" class="icon-btn subbar__back" data-back aria-label="Kembali ke menu">${icon('arrow-left', 20)}<span>Menu</span></button>
        <div class="subbar__title">
          <span class="eyebrow">${icon('book', 14)} ARCHIVE LIBRARY <span class="slash">//</span> 6 BAB</span>
          <h1>Molecular Codex <span class="muted-title">— Ensiklopedia Hidrokarbon</span></h1>
        </div>
        <div class="subbar__stats">
          <span class="top-stat">${starIcon(16)}<strong>${totalStars}</strong><small>/${maxStars}</small></span>
          <span class="top-stat top-stat--safe">${icon('database', 15)}<span>${completed}/${levelCount} arsip pulih</span></span>
        </div>
      </header>

      <main class="codex-main panel">
        <div class="codex-book">
          <div class="codex-spine" aria-hidden="true"></div>
          <aside class="codex-index" aria-label="Daftar isi codex">
            <div class="codex-cover">
              <span class="codex-cover__seal">${moleculeMark(46)}</span>
              <span class="eyebrow">CARBON CODE // FIELD NOTES</span>
              <h2>MOLECULAR<br />CODEX</h2>
              <p>Catatan laboratorium tentang struktur, rumus, dan tata nama hidrokarbon.</p>
            </div>
            <span class="codex-index__label">DAFTAR ISI</span>
            <nav class="codex-index__nav">
              ${PAGES.map((page, index) => indexButton(page, index, index === pageIndex)).join('')}
            </nav>
            <div class="codex-progress">
              <div class="codex-progress__head"><span>PROGRES ARSIP</span><strong>${completed}/${levelCount}</strong></div>
              <div class="progress-track"><span style="width:${levelCount ? Math.round((completed / levelCount) * 100) : 0}%"></span></div>
              <button type="button" class="btn btn--primary btn--sm codex-cta" data-go-levels>${icon('play', 15)}<span>Latihan di lab</span></button>
            </div>
          </aside>

          <div class="codex-page-wrap">
            <div class="codex-page-head">
              <span>CARBON CODE <span class="slash">//</span> FILE 0${pageIndex + 1}</span>
              <span>${starIcon(12)} REFERENSI TERVERIFIKASI</span>
            </div>
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
        <span class="footer-version">CODEX v1.0 <span class="slash">//</span> 6 BAB</span>
      </footer>
    </section>
  `;

  const pageTarget = root.querySelector('[data-codex-page]');
  const pageCount = root.querySelector('[data-page-count]');
  const prevButton = root.querySelector('[data-page-prev]');
  const nextButton = root.querySelector('[data-page-next]');

  function renderPage(index, direction = 1) {
    pageIndex = Math.max(0, Math.min(PAGES.length - 1, index));
    pageTarget.innerHTML = PAGES[pageIndex].render();

    root.querySelectorAll('[data-page-btn]').forEach((button) => {
      const active = Number(button.dataset.pageBtn) === pageIndex;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });

    pageCount.textContent = `HALAMAN 0${pageIndex + 1} / 0${PAGES.length}`;
    prevButton.disabled = pageIndex === 0;
    nextButton.disabled = pageIndex === PAGES.length - 1;

    if (pageTurnTimer) window.clearTimeout(pageTurnTimer);
    pageTarget.classList.remove('is-turning');
    if (!document.documentElement.classList.contains('reduce-motion')) {
      void pageTarget.offsetWidth;
      pageTarget.classList.add('is-turning');
      pageTurnTimer = window.setTimeout(() => pageTarget.classList.remove('is-turning'), 320);
    }
    if (direction < 0) pageTarget.scrollTop = 0;
    pageTarget.scrollTop = 0;
  }

  root.querySelectorAll('[data-page-btn]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.pageBtn);
      if (index === pageIndex) return;
      renderPage(index, index > pageIndex ? 1 : -1);
    }, { signal });
  });

  prevButton.addEventListener('click', () => renderPage(pageIndex - 1, -1), { signal });
  nextButton.addEventListener('click', () => renderPage(pageIndex + 1, 1), { signal });
  root.querySelector('[data-back]')?.addEventListener('click', () => navigate('menu'), { signal });
  root.querySelector('[data-go-levels]')?.addEventListener('click', () => navigate('levels'), { signal });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      navigate('menu');
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (pageIndex < PAGES.length - 1) renderPage(pageIndex + 1, 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (pageIndex > 0) renderPage(pageIndex - 1, -1);
    }
  }, { signal });

  renderPage(0, 1);

  return () => {
    abort.abort();
    if (pageTurnTimer) window.clearTimeout(pageTurnTimer);
  };
}
