export const REAGENTS = {
  H2: {
    id: 'H2',
    name: 'Hidrogen',
    formula: 'H₂',
    atoms: { H: 2 },
    description: 'Gas hidrogen untuk hidrogenasi. Memutus ikatan rangkap dan menambah atom H.',
  },
  Br2: {
    id: 'Br2',
    name: 'Bromin',
    formula: 'Br₂',
    atoms: { Br: 2 },
    description: 'Halogen bromin. Menambah satu Br ke tiap karbon ikatan rangkap (halogenasi).',
  },
  Cl2: {
    id: 'Cl2',
    name: 'Klorin',
    formula: 'Cl₂',
    atoms: { Cl: 2 },
    description: 'Halogen klorin. Menambah satu Cl ke tiap karbon ikatan rangkap (halogenasi).',
  },
  HCl: {
    id: 'HCl',
    name: 'Asam klorida',
    formula: 'HCl',
    atoms: { H: 1, Cl: 1 },
    description: 'Hidrohalogenasi: menambah H dan Cl mengikuti aturan Markovnikov.',
  },
  HBr: {
    id: 'HBr',
    name: 'Asam bromida',
    formula: 'HBr',
    atoms: { H: 1, Br: 1 },
    description: 'Hidrohalogenasi Markovnikov; dengan peroksida menjadi anti-Markovnikov.',
  },
  HI: {
    id: 'HI',
    name: 'Asam iodida',
    formula: 'HI',
    atoms: { H: 1, I: 1 },
    description: 'Hidrohalogenasi: menambah H dan I mengikuti aturan Markovnikov.',
  },
  H2O: {
    id: 'H2O',
    name: 'Air',
    formula: 'H₂O',
    atoms: { H: 2, O: 1 },
    description: 'Hidrasi: menambah H dan OH. Perlu katalis asam (alkena) atau HgSO₄ (alkuna).',
  },
  Hplus: {
    id: 'Hplus',
    name: 'Katalis asam (H⁺)',
    formula: 'H⁺',
    atoms: {},
    description: 'Proton katalitik untuk tautomerisasi enol menjadi karbonil. Tidak ikut ke dalam produk.',
  },
  Sia2BH: {
    id: 'Sia2BH',
    name: 'Disiamilborana (Sia₂BH)',
    formula: 'Sia₂BH',
    atoms: {},
    description: 'Borana bercabang untuk hidroborasi selektif alkuna terminal (pasca-MVP). Diikuti oksidasi H₂O₂/OH⁻.',
  },
  H2O2OH: {
    id: 'H2O2OH',
    name: 'Oksidasi H₂O₂/OH⁻',
    formula: 'H₂O₂/OH⁻',
    atoms: {},
    description: 'Oksidasi lanjutan hidroborasi yang mengganti B dengan OH (pasca-MVP).',
  },
};

export const CATALYSTS = [
  { id: 'none', name: 'Tanpa katalis' },
  { id: 'Ni', name: 'Ni (nikel)' },
  { id: 'Pt', name: 'Pt (platina)' },
  { id: 'Pd', name: 'Pd (paladium)' },
  { id: 'Lindlar', name: 'Lindlar' },
  { id: 'H2SO4', name: 'H₂SO₄' },
  { id: 'HgSO4/H2SO4', name: 'HgSO₄ / H₂SO₄' },
];

export function getReagent(id) {
  return REAGENTS[id] ?? null;
}

export function getCatalyst(id) {
  return CATALYSTS.find((catalyst) => catalyst.id === id) ?? null;
}

export function catalystName(id) {
  return getCatalyst(id)?.name ?? 'Tanpa katalis';
}