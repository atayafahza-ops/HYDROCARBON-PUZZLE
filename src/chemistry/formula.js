const SUBSCRIPT_DIGITS = {
  0: '₀',
  1: '₁',
  2: '₂',
  3: '₃',
  4: '₄',
  5: '₅',
  6: '₆',
  7: '₇',
  8: '₈',
  9: '₉',
};

export function toSubscript(value) {
  return String(value)
    .split('')
    .map((digit) => SUBSCRIPT_DIGITS[digit] ?? digit)
    .join('');
}

export function formulaPlain(carbon, hydrogen) {
  if (!carbon) return '';
  return `C${carbon > 1 ? carbon : ''}H${hydrogen > 1 ? hydrogen : hydrogen === 0 ? '0' : ''}`;
}

export function formulaUnicode(carbon, hydrogen) {
  if (!carbon) return '—';
  const cPart = `C${carbon > 1 ? toSubscript(carbon) : ''}`;
  if (hydrogen === 0) return `${cPart}H${toSubscript(0)}`;
  const hPart = `H${hydrogen > 1 ? toSubscript(hydrogen) : hydrogen < 0 ? toSubscript(Math.abs(hydrogen)) : ''}`;
  return hydrogen < 0 ? `${cPart}H${toSubscript(Math.abs(hydrogen))}⁻` : `${cPart}${hPart}`;
}

export function formulaHTML(carbon, hydrogen, options = {}) {
  const empty = options.empty ?? '—';
  if (!carbon) return empty;
  const cPart = `C${carbon > 1 ? `<sub>${carbon}</sub>` : ''}`;
  if (hydrogen < 0) {
    return `${cPart}H<sup>${hydrogen}</sup>`;
  }
  const hPart = `H${hydrogen > 1 ? `<sub>${hydrogen}</sub>` : hydrogen === 0 ? '<sub>0</sub>' : ''}`;
  return `${cPart}${hPart}`;
}

export function formatAtomHydrogens(hydrogen) {
  return `H${hydrogen}`;
}
