const ICONS = {
  atom: `
    <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/>
    <path d="M4 12a8 8 0 0 1 14.9-3.9M20 12a8 8 0 0 1-14.9 3.9"/>
    <circle cx="18.9" cy="8.1" r="1.3" fill="currentColor" stroke="none"/>
    <circle cx="5.1" cy="15.9" r="1.3" fill="currentColor" stroke="none"/>
  `,
  flask: `
    <path d="M9 3h6M10 3v6l-5.5 9.2A1.8 1.8 0 0 0 6 21h12a1.8 1.8 0 0 0 1.5-2.8L14 9V3"/>
    <path d="M8 15h8M10 18h4"/>
  `,
  bond1: `
    <circle cx="4.5" cy="12" r="2.5"/><circle cx="19.5" cy="12" r="2.5"/>
    <path d="M7.5 12h9"/>
  `,
  bond2: `
    <circle cx="4.5" cy="12" r="2.5"/><circle cx="19.5" cy="12" r="2.5"/>
    <path d="M7.5 9.8h9M7.5 14.2h9"/>
  `,
  bond3: `
    <circle cx="4.5" cy="12" r="2.5"/><circle cx="19.5" cy="12" r="2.5"/>
    <path d="M7.5 8h9M7.5 12h9M7.5 16h9"/>
  `,
  book: `
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22.5z"/>
    <path d="M4 5.5v17M8 7h8M8 10.5h7M8 14h5"/>
  `,
  database: `
    <path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z"/>
    <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>
  `,
  branch: `
    <circle cx="6" cy="6" r="2.3"/><circle cx="18" cy="18" r="2.3"/>
    <path d="M8 6h3.5a2 2 0 0 1 2 2v8a2 2 0 0 0 2 2H18M12 12H5"/>
  `,
  crown: `
    <path d="M3 8l4.5 3L12 4l4.5 7L21 8l-2 10H5z"/>
    <path d="M6 21h12"/>
  `,
  gear: `
    <path d="M9.5 3h5l.7 2.5 2.3 1 2.4-1 2.5 4.3-1.8 1.8v2.8l1.8 1.8-2.5 4.3-2.4-1-2.3 1L14.5 23h-5l-.7-2.5-2.3-1-2.4 1L1.6 16l1.8-1.8v-2.8L1.6 9.6l2.5-4.3 2.4 1 2.3-1z"/>
    <circle cx="12" cy="13" r="3.2"/>
  `,
  users: `
    <circle cx="9" cy="8" r="3.2"/><path d="M3 20v-1.6A4.4 4.4 0 0 1 7.4 14h3.2a4.4 4.4 0 0 1 4.4 4.4V20"/>
    <circle cx="17" cy="8.5" r="2.4"/><path d="M17 13h.5a3.5 3.5 0 0 1 3.5 3.5V18"/>
  `,
  lock: `
    <rect x="5" y="10" width="14" height="11" rx="1.5"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>
  `,
  unlock: `
    <rect x="5" y="10" width="14" height="11" rx="1.5"/>
    <path d="M8 10V7a4 4 0 0 1 7.4-2.1M12 14v3"/>
  `,
  star: `<path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.7 1.2 6.7L12 17.7l-5.9 3.2 1.2-6.7-4.8-4.7 6.6-.9z"/>`,
  'arrow-left': `<path d="M20 12H5M11 6l-6 6 6 6"/>`,
  'arrow-right': `<path d="M4 12h15M13 6l6 6-6 6"/>`,
  'chevron-right': `<path d="M9 5l7 7-7 7"/>`,
  'chevron-left': `<path d="M15 5l-7 7 7 7"/>`,
  check: `<path d="M4 12l5 5L20 6"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18"/>`,
  pause: `<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" stroke="none"/>`,
  play: `<path d="M7 4l13 8-13 8z"/>`,
  undo: `<path d="M8 7H4V3M4.5 7A8.5 8.5 0 1 1 6 17.5"/>`,
  reset: `<path d="M20 11a8 8 0 1 0-2.3 6M20 4v7h-7"/>`,
  bulb: `
    <path d="M8 14.5c-1.3-1-2-2.6-2-4.3a6 6 0 1 1 12 0c0 1.7-.7 3.3-2 4.3-.8.6-1.2 1.3-1.2 2.2H9.2c0-.9-.4-1.6-1.2-2.2Z"/>
    <path d="M9 20h6M10 23h4M12 1v2M4.2 4.2l1.4 1.4M19.8 4.2l-1.4 1.4"/>
  `,
  trash: `
    <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>
  `,
  plus: `<path d="M12 4v16M4 12h16"/>`,
  map: `
    <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/>
    <path d="M9 3v15M15 6v15"/>
  `,
  target: `
    <circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
  `,
  info: `<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 6.5v1"/><circle cx="12" cy="6.4" r="1" fill="currentColor" stroke="none"/>`,
  spark: `<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>`,
  sound: `<path d="M4 10v4h4l5 4V6z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>`,
  muted: `<path d="M4 10v4h4l5 4V6z"/><path d="M17 9l4 6M21 9l-4 6"/>`,
  home: `<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/>`,
  trophy: `
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/>
  `,
  help: `<circle cx="12" cy="12" r="9"/><path d="M9.2 9a3 3 0 1 1 4.5 2.7c-.9.6-1.7 1.2-1.7 2.3M12 17.5v.5"/><circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none"/>`,
  terminal: `<path d="M3 4h18v16H3zM7 9l3 3-3 3M13 15h4"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>`,
  'arrow-up-right': `<path d="M7 17L17 7M8 7h9v9"/>`,
  eye: `<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>`,
};

export function icon(name, size = 20, className = '') {
  const path = ICONS[name] ?? ICONS.info;
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">${path}</svg>`;
}

export function starIcon(size = 18, className = '') {
  return `<svg class="icon icon-star ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">${ICONS.star}</svg>`;
}

export function moleculeMark(size = 40, className = '') {
  return `<svg class="molecule-mark ${className}" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <path d="M32 8l18 11v21L32 51 14 40V19z" stroke="currentColor" stroke-width="2.5"/>
    <path d="M32 19l10 6v12l-10 6-10-6V25z" stroke="currentColor" stroke-width="1.5" opacity=".5"/>
    <circle cx="32" cy="34" r="3.5" fill="currentColor"/>
    <circle cx="32" cy="8" r="2.5" fill="currentColor"/>
    <circle cx="50" cy="19" r="2.5" fill="currentColor"/>
    <circle cx="50" cy="40" r="2.5" fill="currentColor"/>
    <circle cx="32" cy="51" r="2.5" fill="currentColor"/>
    <circle cx="14" cy="40" r="2.5" fill="currentColor"/>
    <circle cx="14" cy="19" r="2.5" fill="currentColor"/>
  </svg>`;
}
