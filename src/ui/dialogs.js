import { icon } from './icons.js';
import { openModal, closeAllModals } from './modal.js';
import { showToast } from './toast.js';
import { navigate } from './router.js';
import {
  getSettings,
  markIntroSeen,
  resetProgress,
} from '../systems/save.js';
import { applySettings, toggleSetting } from '../systems/settings.js';

const NOVA_PORTRAIT = '/assets/img/dr-nova.png';

function settingToggle(key, enabled, label) {
  return `<button type="button" class="switch ${enabled ? 'is-on' : ''}" role="switch" aria-checked="${enabled}" aria-label="${label}" data-setting="${key}"><span class="switch__thumb"></span><span class="switch__label">${enabled ? 'ON' : 'OFF'}</span></button>`;
}

export function openSettingsModal({ onReset } = {}) {
  const settings = getSettings();
  const body = `
    <div class="settings-list">
      <div class="settings-row">
        <span class="settings-row__icon">${icon('sound', 21)}</span>
        <div class="settings-row__copy">
          <strong>Efek suara</strong>
          <span>Bunyi antarmuka, ikatan, dan jawaban.</span>
        </div>
        ${settingToggle('sfx', settings.sfx, 'Efek suara')}
      </div>
      <div class="settings-row">
        <span class="settings-row__icon">${icon('spark', 21)}</span>
        <div class="settings-row__copy">
          <strong>Kurangi animasi</strong>
          <span>Matikan gerak tambahan dan animasi dekoratif.</span>
        </div>
        ${settingToggle('reducedMotion', settings.reducedMotion, 'Kurangi animasi')}
      </div>
    </div>
    <div class="settings-tip">
      ${icon('info', 17)}
      <p>Progres tersimpan otomatis di browser setelah kamu menyelesaikan level. Pengaturan tetap dipertahankan saat progres direset.</p>
    </div>
    <div class="settings-danger">
      <div>
        <strong>Reset arsip</strong>
        <span>Hapus semua bintang, XP, dan level yang sudah terbuka.</span>
      </div>
      <button type="button" class="btn btn--danger btn--sm" data-reset-progress>${icon('trash', 15)}<span>Reset progres</span></button>
    </div>
  `;

  return openModal({
    eyebrow: 'SYSTEM CONFIGURATION',
    title: 'Pengaturan',
    body,
    className: 'modal--settings',
    actions: [{ label: 'Tutup', variant: 'secondary' }],
    onMount(overlay) {
      overlay.querySelectorAll('[data-setting]').forEach((button) => {
        button.addEventListener('click', () => {
          const key = button.dataset.setting;
          const next = toggleSetting(key);
          button.classList.toggle('is-on', Boolean(next[key]));
          button.setAttribute('aria-checked', String(Boolean(next[key])));
          const label = button.querySelector('.switch__label');
          if (label) label.textContent = next[key] ? 'ON' : 'OFF';
        });
      });

      overlay.querySelector('[data-reset-progress]')?.addEventListener('click', () => {
        openResetConfirm({
          onConfirm: () => {
            resetProgress();
            applySettings();
            closeAllModals();
            showToast('Arsip telah direset. Mulai perjalanan baru.', { type: 'success' });
            if (onReset) onReset();
            else navigate('menu');
          },
        });
      });
    },
  });
}

export function openResetConfirm({ onConfirm }) {
  return openModal({
    eyebrow: 'DANGER ZONE',
    title: 'Reset seluruh arsip?',
    body: `
      <div class="confirm-panel confirm-panel--danger">
        <span class="confirm-panel__icon">${icon('trash', 25)}</span>
        <div>
          <strong>Tindakan ini tidak bisa dibatalkan.</strong>
          <p>Semua bintang, XP, dan level yang telah terbuka akan dihapus. Pengaturan suara dan animasi tetap disimpan.</p>
        </div>
      </div>
    `,
    className: 'modal--narrow',
    actions: [
      { label: 'Batal', variant: 'secondary' },
      {
        label: 'Ya, reset arsip',
        variant: 'danger',
        icon: 'trash',
        onClick: () => {
          onConfirm?.();
          return false;
        },
      },
    ],
  });
}

export function confirmNewGame({ onConfirm }) {
  return openModal({
    eyebrow: 'ARCHIVE RESET',
    title: 'Mulai petualangan baru?',
    body: `
      <div class="confirm-panel">
        <span class="confirm-panel__icon">${icon('reset', 25)}</span>
        <div>
          <strong>Progres saat ini akan diganti.</strong>
          <p>Kamu akan kembali ke Level 1. Bintang dan level yang sudah terbuka akan dihapus, sedangkan pengaturan tetap dipertahankan.</p>
        </div>
      </div>
    `,
    className: 'modal--narrow',
    actions: [
      { label: 'Batal', variant: 'secondary' },
      {
        label: 'Mulai baru',
        variant: 'primary',
        icon: 'play',
        onClick: () => {
          onConfirm?.();
        },
      },
    ],
  });
}

export function openControlsModal() {
  return openModal({
    eyebrow: 'FIELD MANUAL',
    title: 'Kontrol laboratorium',
    body: `
      <div class="controls-grid">
        <div class="control-row"><span class="key-group"><kbd>Klik</kbd></span><div><strong>Pilih atom</strong><span>Klik dua atom untuk menghubungkannya.</span></div></div>
        <div class="control-row"><span class="key-group"><kbd>Seret</kbd></span><div><strong>Pindahkan atom</strong><span>Posisi visual tidak mengubah konektivitas kimia.</span></div></div>
        <div class="control-row"><span class="key-group"><kbd>Klik kanan</kbd></span><div><strong>Hapus atom</strong><span>Ikatan yang terhubung juga akan dihapus.</span></div></div>
        <div class="control-row"><span class="key-group"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd></span><div><strong>Jenis ikatan</strong><span>Pilih ikatan tunggal, rangkap dua, atau rangkap tiga.</span></div></div>
        <div class="control-row"><span class="key-group"><kbd>A</kbd></span><div><strong>Tambah karbon</strong><span>Menempatkan atom C baru di grid.</span></div></div>
        <div class="control-row"><span class="key-group"><kbd>Ctrl</kbd><kbd>Z</kbd></span><div><strong>Undo</strong><span>Membatalkan perubahan terakhir.</span></div></div>
        <div class="control-row"><span class="key-group"><kbd>Del</kbd></span><div><strong>Hapus atom terpilih</strong><span>Alternatif tombol hapus di action bar.</span></div></div>
        <div class="control-row"><span class="key-group"><kbd>Esc</kbd></span><div><strong>Jeda</strong><span>Membuka menu pause saat berada di level.</span></div></div>
      </div>
      <div class="settings-tip">${icon('info', 17)}<p>Puzzle tata nama disusun dengan mengklik potongan nama. Klik slot untuk mengembalikan potongan ke bank.</p></div>
    `,
    className: 'modal--wide',
    actions: [{ label: 'Mengerti', variant: 'secondary' }],
  });
}

export function openCreditsModal() {
  return openModal({
    eyebrow: 'CREDITS // ARCHIVE TEAM',
    title: 'Carbon Code',
    body: `
      <div class="credits-hero">
        <span class="credits-mark">${icon('atom', 32)}</span>
        <div>
          <span class="eyebrow">THE HYDROCARBON MYSTERY</span>
          <h3>Belajar kimia melalui puzzle.</h3>
          <p>Sebuah game edukasi tentang hubungan antara struktur, rumus molekul, dan tata nama hidrokarbon.</p>
        </div>
      </div>
      <div class="credits-grid">
        <div><span>Desain & program</span><strong>Carbon Code Lab</strong></div>
        <div><span>Karakter mentor</span><strong>Dr. Nova</strong></div>
        <div><span>Mesin game</span><strong>Phaser 3</strong></div>
        <div><span>Materi</span><strong>Tata nama hidrokarbon SMA</strong></div>
        <div><span>Dokumen acuan</span><strong>GDD Carbon Code v1.0</strong></div>
        <div><span>Versi MVP</span><strong>1.0.0 • 8 level</strong></div>
      </div>
      <p class="credits-note">Dibuat untuk pengalaman belajar yang interaktif. Materi dibatasi pada hidrokarbon rantai terbuka dan disederhanakan untuk kebutuhan level.</p>
    `,
    className: 'modal--wide',
    actions: [{ label: 'Tutup', variant: 'secondary' }],
  });
}

export function openPauseModal({ onRestart, onExit }) {
  return openModal({
    eyebrow: 'LAB PAUSED',
    title: 'Jeda sejenak',
    body: `
      <div class="pause-hero">
        <span class="pause-hero__icon">${icon('pause', 24)}</span>
        <div>
          <strong>Reaktor sedang dijeda.</strong>
          <p>Progres puzzle saat ini belum tersimpan. Selesaikan level untuk mencatat bintang dan XP.</p>
        </div>
      </div>
      <div class="pause-actions">
        <button type="button" class="pause-btn pause-btn--primary" data-pause-action="resume">
          <span>${icon('play', 19)}<strong>Lanjutkan</strong></span>
          <kbd>Esc</kbd>
        </button>
        <button type="button" class="pause-btn" data-pause-action="restart">
          <span>${icon('reset', 19)}<strong>Ulangi level</strong></span>
          ${icon('chevron-right', 16)}
        </button>
        <button type="button" class="pause-btn" data-pause-action="controls">
          <span>${icon('help', 19)}<strong>Kontrol</strong></span>
          ${icon('chevron-right', 16)}
        </button>
        <button type="button" class="pause-btn" data-pause-action="settings">
          <span>${icon('gear', 19)}<strong>Pengaturan</strong></span>
          ${icon('chevron-right', 16)}
        </button>
        <button type="button" class="pause-btn" data-pause-action="levels">
          <span>${icon('map', 19)}<strong>Peta level</strong></span>
          ${icon('chevron-right', 16)}
        </button>
        <button type="button" class="pause-btn pause-btn--muted" data-pause-action="menu">
          <span>${icon('home', 19)}<strong>Menu utama</strong></span>
          ${icon('chevron-right', 16)}
        </button>
      </div>
    `,
    className: 'modal--pause',
    onMount(overlay, { close }) {
      overlay.querySelector('[data-pause-action="resume"]')?.addEventListener('click', () => close());
      overlay.querySelector('[data-pause-action="restart"]')?.addEventListener('click', () => {
        close();
        onRestart?.();
      });
      overlay.querySelector('[data-pause-action="controls"]')?.addEventListener('click', () => {
        openControlsModal();
      });
      overlay.querySelector('[data-pause-action="settings"]')?.addEventListener('click', () => {
        openSettingsModal({
          onReset: () => {
            closeAllModals();
            onExit?.('menu');
          },
        });
      });
      overlay.querySelector('[data-pause-action="levels"]')?.addEventListener('click', () => {
        close();
        onExit?.('levels');
      });
      overlay.querySelector('[data-pause-action="menu"]')?.addEventListener('click', () => {
        close();
        onExit?.('menu');
      });
    },
  });
}

export function openIntroModal({ onClose } = {}) {
  return openModal({
    eyebrow: 'BRIEFING // DR. NOVA',
    title: 'Selamat datang di Carbon Code',
    body: `
      <div class="mentor-dialog">
        <div class="mentor-dialog__portrait">
          <img src="${NOVA_PORTRAIT}" alt="Dr. Nova, mentor laboratorium Carbon Code" />
          <div class="mentor-dialog__id"><span>DR. NOVA</span><strong>MENTOR LAB</strong></div>
        </div>
        <div class="mentor-dialog__copy">
          <p class="mentor-dialog__quote">“Arsip molekul kita rusak. Aku butuh asisten yang teliti untuk menyusun ulang strukturnya.”</p>
          <p>Setiap misi memintamu menyusun atau mengenali hidrokarbon. Ikuti tiga langkah ini:</p>
          <ol class="step-list">
            <li><span>1</span><div><strong>Bangun struktur</strong><p>Tambahkan atom C, lalu pilih jenis ikatan dan hubungkan atom.</p></div></li>
            <li><span>2</span><div><strong>Awasi inspector</strong><p>Jumlah H dan rumus molekul dihitung otomatis dari valensi karbon.</p></div></li>
            <li><span>3</span><div><strong>Periksa jawaban</strong><p>Jika belum tepat, ikuti petunjuk dan perbaiki struktur tanpa mengulang semuanya.</p></div></li>
          </ol>
          <div class="mentor-dialog__tip">${icon('bulb', 17)}<span>Gunakan tombol Petunjuk hanya jika benar-benar buntu. Bintangmu akan tetap dihitung.</span></div>
        </div>
      </div>
    `,
    className: 'modal--wide modal--mentor',
    actions: [{ label: 'Mulai misi', variant: 'primary', icon: 'play' }],
    onClose: () => {
      markIntroSeen();
      onClose?.();
    },
  });
}
