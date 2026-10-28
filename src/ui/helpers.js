import { formulaHTML } from '../chemistry/formula.js';
import { icon, starIcon } from './icons.js';

export function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function formulaMarkup(formula, fallback = '—') {
  if (!formula) return fallback;
  if (typeof formula === 'string') {
    const match = formula.match(/^C(\d*)H(\d+)$/);
    if (match) {
      return formulaHTML(Number(match[1] || 1), Number(match[2]), { empty: fallback });
    }
    return escapeHTML(formula);
  }
  if (typeof formula.carbon === 'number') {
    return formulaHTML(formula.carbon, formula.hydrogen, { empty: fallback });
  }
  return fallback;
}

export function starsHTML(stars, options = {}) {
  const max = options.max ?? 3;
  const size = options.size ?? 18;
  const label = options.label ?? `${stars} dari ${max} bintang`;
  const pieces = [];
  for (let index = 0; index < max; index += 1) {
    pieces.push(
      `<span class="star ${index < stars ? 'is-filled' : 'is-empty'}">${starIcon(size)}</span>`,
    );
  }
  return `<span class="star-row" role="img" aria-label="${label}">${pieces.join('')}</span>`;
}

export function divider() {
  return '<span class="divider" aria-hidden="true"></span>';
}

export function badge(label, variant = 'neutral', iconName = null) {
  return `<span class="badge badge--${variant}">${iconName ? icon(iconName, 13) : ''}<span>${label}</span></span>`;
}

export function emptyState(iconName, title, text) {
  return `<div class="empty-state">${icon(iconName, 34)}<strong>${title}</strong><span>${text}</span></div>`;
}
