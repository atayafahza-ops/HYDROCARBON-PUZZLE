import { icon } from './icons.js';

const stack = [];

function getRoot() {
  let root = document.querySelector('#modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.append(root);
  }
  return root;
}

function focusableElements(element) {
  return [
    ...element.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((node) => node.offsetParent !== null);
}

export function openModal(options = {}) {
  const root = getRoot();
  const previousFocus = document.activeElement;
  const closable = options.closable !== false;
  const overlay = document.createElement('div');
  overlay.className = `modal-overlay ${options.overlayClass ?? ''}`.trim();
  overlay.style.zIndex = String(100 + stack.length);

  const actionMarkup = (options.actions ?? [])
    .map(
      (action, index) => `
        <button type="button" class="btn ${action.variant ? `btn--${action.variant}` : 'btn--secondary'}" data-modal-action="${index}" ${action.disabled ? 'disabled' : ''}>
          ${action.icon ? icon(action.icon, 17) : ''}<span>${action.label}</span>
        </button>
      `,
    )
    .join('');

  overlay.innerHTML = `
    <div class="modal ${options.className ?? ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title-${stack.length}">
      <div class="modal__corner modal__corner--tl" aria-hidden="true"></div>
      <div class="modal__corner modal__corner--br" aria-hidden="true"></div>
      <header class="modal__head">
        <div>
          ${options.eyebrow ? `<span class="eyebrow">${options.eyebrow}</span>` : ''}
          <h2 class="modal__title" id="modal-title-${stack.length}">${options.title ?? ''}</h2>
        </div>
        ${
          closable
            ? `<button type="button" class="icon-btn icon-btn--ghost modal__close" data-modal-close aria-label="Tutup dialog">${icon('close', 20)}</button>`
            : ''
        }
      </header>
      <div class="modal__body">${options.body ?? ''}</div>
      ${
        actionMarkup
          ? `<footer class="modal__actions">${actionMarkup}</footer>`
          : ''
      }
    </div>
  `;

  let closed = false;
  const close = (reason = 'close') => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown, true);
    overlay.classList.remove('is-open');
    overlay.classList.add('is-closing');
    const entryIndex = stack.findIndex((entry) => entry.overlay === overlay);
    if (entryIndex >= 0) stack.splice(entryIndex, 1);
    if (!stack.length) document.body.classList.remove('has-modal');
    window.setTimeout(() => overlay.remove(), 180);
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    options.onClose?.(reason);
  };

  const onKeydown = (event) => {
    const topEntry = stack[stack.length - 1];
    if (!topEntry || topEntry.overlay !== overlay) return;
    if (event.key === 'Escape' && closable) {
      event.preventDefault();
      event.stopPropagation();
      close('escape');
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = focusableElements(overlay);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  root.append(overlay);
  document.body.classList.add('has-modal');
  stack.push({ overlay, close });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay && closable) close('overlay');
  });

  overlay.querySelector('[data-modal-close]')?.addEventListener('click', () => close('close-button'));

  (options.actions ?? []).forEach((action, index) => {
    overlay.querySelector(`[data-modal-action="${index}"]`)?.addEventListener('click', () => {
      const result = action.onClick?.({ close, overlay });
      if (result === false) return;
      if (!action.keepOpen) close('action');
    });
  });

  document.addEventListener('keydown', onKeydown, true);
  requestAnimationFrame(() => {
    overlay.classList.add('is-open');
    const focusTarget =
      overlay.querySelector('[autofocus]') ??
      overlay.querySelector('.modal__close') ??
      focusableElements(overlay)[0];
    focusTarget?.focus({ preventScroll: true });
  });

  options.onMount?.(overlay, { close });

  return { close, overlay };
}

export function closeAllModals(reason = 'route') {
  [...stack].reverse().forEach((entry) => entry.close(reason));
}

export function isModalOpen() {
  return stack.length > 0;
}
