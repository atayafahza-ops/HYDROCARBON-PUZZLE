import { icon } from './icons.js';

let root = null;
let activeToasts = 0;

function getRoot() {
  if (!root) root = document.querySelector('#toast-root');
  return root;
}

export function clearToasts() {
  const container = getRoot();
  if (!container) return;
  container.querySelectorAll('.toast').forEach((toast) => toast.remove());
  activeToasts = 0;
}

export function showToast(message, options = {}) {
  const container = getRoot();
  if (!container) return null;
  const type = options.type ?? 'info';
  const duration = options.duration ?? 2800;
  if (activeToasts >= 3) {
    const first = container.querySelector('.toast');
    first?.remove();
    activeToasts = Math.max(0, activeToasts - 1);
  }

  const toneIcon = type === 'success' ? 'check' : type === 'error' ? 'close' : 'info';
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `
    <span class="toast__icon">${icon(toneIcon, 17)}</span>
    <span class="toast__message"></span>
    <button type="button" class="toast__close" aria-label="Tutup notifikasi">${icon('close', 14)}</button>
  `;
  toast.querySelector('.toast__message').textContent = message;
  container.append(toast);
  activeToasts += 1;

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    activeToasts = Math.max(0, activeToasts - 1);
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 220);
  };

  toast.querySelector('.toast__close').addEventListener('click', remove);
  const timer = window.setTimeout(remove, duration);
  toast.addEventListener('mouseenter', () => window.clearTimeout(timer), { once: true });
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  return { remove };
}
