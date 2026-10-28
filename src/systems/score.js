export const MAX_STARS = 3;
export const XP_BY_STARS = { 1: 100, 2: 150, 3: 200 };

export function calculateStars(hintsUsed, failedChecks) {
  if (hintsUsed === 0 && failedChecks === 0) return 3;
  if (hintsUsed <= 1 && failedChecks <= 2) return 2;
  return 1;
}

export function xpForStars(stars) {
  return XP_BY_STARS[stars] ?? 0;
}

export function starCaption(stars) {
  if (stars === 3) return 'Sempurna — tanpa petunjuk';
  if (stars === 2) return 'Baik — sedikit bantuan';
  return 'Selesai — dengan bantuan';
}

export function hintCostLabel(stars) {
  if (stars === 3) return 'Tiga bintang masih mungkin';
  if (stars === 2) return 'Potensi bintang berkurang';
  return 'Bintang maksimal saat ini: 1';
}
