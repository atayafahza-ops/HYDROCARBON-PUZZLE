export const ZONES = [
  {
    id: 'alkene-fundamentals',
    index: 1,
    title: 'Alkene Fundamentals',
    subtitle: 'Dasar reaksi adisi alkena',
    icon: 'atom',
    accent: 'green',
    tier: 'inti',
    tierLabel: 'Inti',
    theory:
      'Alkena memiliki ikatan rangkap dua C=C yang kaya elektron. Reaksi adisi memutus satu ikatan π dan menambahkan dua gugus baru ke karbon rangkap, menghasilkan ikatan tunggal C–C.',
  },
  {
    id: 'hydrogenation-lab',
    index: 2,
    title: 'Hydrogenation Lab',
    subtitle: 'Hidrogenasi alkena & alkuna',
    icon: 'spark',
    accent: 'blue',
    tier: 'inti',
    tierLabel: 'Inti',
    theory:
      'Hidrogenasi menambahkan H₂ melintasi ikatan rangkap dengan katalis logam (Ni/Pt/Pd). Alkena berhenti di alkana; alkuna butuh 2 ekuivalen H₂ untuk menjadi alkana penuh.',
  },
  {
    id: 'halogenation-lab',
    index: 3,
    title: 'Halogenation Lab',
    subtitle: 'Adisi halogen X₂',
    icon: 'bond2',
    accent: 'amber',
    tier: 'inti',
    tierLabel: 'Inti',
    theory:
      'Br₂ dan Cl₂ menambahkan satu atom halogen ke setiap karbon ikatan rangkap. Produk alkena adalah dihalida vicinal (halogen di karbon bersebelahan).',
  },
  {
    id: 'hydrohalogenation-lab',
    index: 4,
    title: 'Hydrohalogenation Lab',
    subtitle: 'Markovnikov & anti-Markovnikov',
    icon: 'target',
    accent: 'violet',
    tier: 'inti-pengayaan',
    tierLabel: 'Inti → Pengayaan',
    theory:
      'HX menambahkan H ke karbon dengan lebih banyak H (Markovnikov: X ke karbon yang lebih tersubstitusi). Khusus HBr, peroksida membalik orientasi menjadi anti-Markovnikov.',
  },
  {
    id: 'hydration-research',
    index: 5,
    title: 'Hydration Research',
    subtitle: 'Hidrasi menjadi alkohol',
    icon: 'flask',
    accent: 'cyan',
    tier: 'inti',
    tierLabel: 'Inti',
    theory:
      'Air menambahkan H dan OH melintasi C=C dengan katalis asam (H₂SO₄). OH masuk mengikuti Markovnikov, menghasilkan alkohol pada karbon yang lebih tersubstitusi.',
  },
  {
    id: 'alkyne-research',
    index: 6,
    title: 'Alkyne Research',
    subtitle: 'Adisi alkuna & tautomerisasi',
    icon: 'bond3',
    accent: 'teal',
    tier: 'inti-pengayaan',
    tierLabel: 'Inti → Pengayaan',
    theory:
      'Alkuna (C≡C) dapat berhenti di tahap alkena dengan kontrol ekuivalen atau katalis Lindlar. Hidrasi alkuna (HgSO₄/H₂SO₄) menghasilkan enol yang bertautomerisasi menjadi aldehida/keton.',
  },
  {
    id: 'selective-reaction-lab',
    index: 7,
    title: 'Selective Reaction Lab',
    subtitle: 'Kontrol ekuivalen & selektivitas',
    icon: 'branch',
    accent: 'rose',
    tier: 'pengayaan',
    tierLabel: 'Pengayaan',
    theory:
      'Jumlah ekuivalen menentukan hasil: 1 ekuivalen menambah sekali, 2 ekuivalen menambah dua kali. HX berlebih pada alkuna menghasilkan dihalida geminal (dua X di karbon yang sama).',
  },
  {
    id: 'master-reaction-chamber',
    index: 8,
    title: 'Master Reaction Chamber',
    subtitle: 'Ujian akhir peneliti',
    icon: 'crown',
    accent: 'gold',
    tier: 'campuran',
    tierLabel: 'Campuran',
    theory:
      'Gabungkan semua aturan: orientasi, ekuivalen, katalis selektif, dan tautomerisasi. Beberapa eksperimen menyembunyikan reagen target — analisis produknya untuk menyimpulkan reagen yang benar.',
  },
];

export function getZone(id) {
  return ZONES.find((zone) => zone.id === id) ?? null;
}