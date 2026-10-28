import { analyzeMolecule } from '../chemistry/graph.js';

const atom = (id, x, y) => ({ id, x, y });
const bond = (a, b, order = 1) => ({ a, b, order });
const graph = (nodes, edges) => ({ nodes, edges });
const formulaOf = (molecule) => {
  const analysis = analyzeMolecule(molecule);
  return { carbon: analysis.carbonCount, hydrogen: analysis.hydrogenCount, plain: analysis.formula };
};
const exactRule = (molecule, category) => ({
  graph: molecule,
  carbonCount: molecule.nodes.length,
  formula: formulaOf(molecule).plain,
  category,
  requireAcyclic: true,
});

export const METHANE = graph([atom(0, 180, 100)], []);
export const PROPANE = graph(
  [atom(0, 65, 112), atom(1, 180, 72), atom(2, 295, 112)],
  [bond(0, 1), bond(1, 2)],
);
export const ETHENE = graph(
  [atom(0, 112, 100), atom(1, 248, 100)],
  [bond(0, 1, 2)],
);
export const ETHYNE = graph(
  [atom(0, 112, 100), atom(1, 248, 100)],
  [bond(0, 1, 3)],
);
export const BUTANE = graph(
  [atom(0, 48, 118), atom(1, 132, 82), atom(2, 216, 118), atom(3, 300, 82)],
  [bond(0, 1), bond(1, 2), bond(2, 3)],
);
export const ISOBUTANE = graph(
  [atom(0, 180, 105), atom(1, 180, 25), atom(2, 84, 172), atom(3, 276, 172)],
  [bond(0, 1), bond(0, 2), bond(0, 3)],
);
export const BUTENE = graph(
  [atom(0, 52, 120), atom(1, 134, 82), atom(2, 216, 120), atom(3, 298, 82)],
  [bond(0, 1, 2), bond(1, 2), bond(2, 3)],
);
export const METHYLBUTANE = graph(
  [
    atom(0, 48, 135),
    atom(1, 132, 98),
    atom(2, 216, 135),
    atom(3, 300, 98),
    atom(4, 132, 18),
  ],
  [bond(0, 1), bond(1, 2), bond(2, 3), bond(1, 4)],
);
export const PENTANE = graph(
  [
    atom(0, 36, 120),
    atom(1, 112, 84),
    atom(2, 188, 120),
    atom(3, 264, 84),
    atom(4, 340, 120),
  ],
  [bond(0, 1), bond(1, 2), bond(2, 3), bond(3, 4)],
);

const NAME_TOKEN_BANK = {
  numbers: ['1', '2', '3', '4'],
  substituents: ['metil', 'etil', 'propil'],
  stems: ['met', 'et', 'prop', 'but', 'pent'],
  suffixes: ['-ana', '-ena', '-una'],
};

export const ZONES = [
  {
    id: 'carbon-basics',
    name: 'Carbon Basics Lab',
    shortName: 'Carbon Basics',
    index: 1,
    icon: 'flask',
    accent: 'green',
    status: 'available',
    description: 'Memulihkan arsip atom, valensi, rumus, dan alkana dasar.',
    slotStart: 1,
  },
  {
    id: 'bond-research',
    name: 'Bond Research Lab',
    shortName: 'Bond Research',
    index: 2,
    icon: 'bond',
    accent: 'blue',
    status: 'available',
    description: 'Meneliti ikatan tunggal, rangkap dua, dan rangkap tiga.',
    slotStart: 6,
  },
  {
    id: 'naming-database',
    name: 'Naming Database',
    shortName: 'Naming Database',
    index: 3,
    icon: 'database',
    accent: 'amber',
    status: 'soon',
    description: 'Menyusun nama dari rantai induk, posisi, dan substituen.',
    slotStart: 11,
  },
  {
    id: 'isomer-chamber',
    name: 'Isomer Chamber',
    shortName: 'Isomer Chamber',
    index: 4,
    icon: 'branch',
    accent: 'violet',
    status: 'soon',
    description: 'Membandingkan struktur berbeda dengan rumus yang sama.',
    slotStart: 16,
  },
  {
    id: 'master-lab',
    name: 'Master Chemistry Lab',
    shortName: 'Master Chemistry Lab',
    index: 5,
    icon: 'crown',
    accent: 'rose',
    status: 'soon',
    description: 'Menggabungkan semua mekanik menjadi tantangan akhir.',
    slotStart: 21,
  },
];

export const LEVELS = [
  {
    id: 1,
    zoneId: 'carbon-basics',
    file: 'CC-01-01',
    title: 'Metana Pertama',
    tagline: 'Satu karbon, empat ikatan.',
    type: 'build',
    typeLabel: 'Structure Builder',
    focus: 'Valensi karbon',
    mission: 'Susun struktur metana dari satu atom karbon.',
    target: {
      kind: 'name',
      label: 'NAMA TARGET',
      name: 'Metana',
      formula: { carbon: 1, hydrogen: 4 },
      category: 'Alkana',
    },
    guide: [
      'Tekan tombol Atom C untuk menempatkan karbon.',
      'Hidrogen dihitung otomatis dari sisa valensi karbon.',
      'Tekan Periksa setelah struktur siap.',
    ],
    hints: [
      'Setiap karbon memiliki empat elektron valensi. Sisa valensi akan diisi hidrogen.',
      'Metana hanya memiliki satu atom karbon, jadi tidak ada ikatan C–C.',
      'Cukup tambahkan satu atom C, lalu tekan Periksa.',
    ],
    validation: exactRule(METHANE, 'alkana'),
    displayGraph: METHANE,
    result: {
      name: 'Metana',
      category: 'Alkana',
      explanation:
        'Metana (CH₄) adalah hidrokarbon paling sederhana. Karbon membentuk empat ikatan kovalen tunggal dengan empat atom hidrogen untuk memenuhi valensinya.',
    },
  },
  {
    id: 2,
    zoneId: 'carbon-basics',
    file: 'CC-01-02',
    title: 'Rantai Karbon',
    tagline: 'Alkana mulai bertumbuh.',
    type: 'build',
    typeLabel: 'Structure Builder',
    focus: 'Rantai alkana',
    mission: 'Susun propana, alkana rantai lurus dengan tiga atom karbon.',
    target: {
      kind: 'name',
      label: 'NAMA TARGET',
      name: 'Propana',
      formula: { carbon: 3, hydrogen: 8 },
      category: 'Alkana',
    },
    guide: [
      'Tambahkan tiga atom karbon.',
      'Hubungkan atom berurutan dengan ikatan tunggal.',
      'Gunakan ujung rantai yang bebas untuk membentuk CH₃.',
    ],
    hints: [
      'Propana adalah alkana dengan tiga atom karbon dan hanya ikatan tunggal.',
      'Bentuk rantainya C–C–C. Butuh dua ikatan tunggal untuk menghubungkan tiga karbon.',
      'Rumus akhir propana adalah C₃H₈.',
    ],
    validation: exactRule(PROPANE, 'alkana'),
    displayGraph: PROPANE,
    result: {
      name: 'Propana',
      category: 'Alkana',
      explanation:
        'Propana memiliki tiga atom karbon berurutan. Setiap karbon mengisi sisa valensinya dengan hidrogen, sehingga rumus molekulnya menjadi C₃H₈.',
    },
  },
  {
    id: 3,
    zoneId: 'carbon-basics',
    file: 'CC-01-03',
    title: 'Detektor Ikatan',
    tagline: 'Valensi yang dipakai dua kali.',
    type: 'formula',
    typeLabel: 'Formula Detective',
    focus: 'Ikatan rangkap dua',
    mission: 'Bentuk hidrokarbon rantai terbuka dengan rumus C₂H₄ dan satu ikatan rangkap dua.',
    target: {
      kind: 'formula',
      label: 'RUMUS TARGET',
      formula: { carbon: 2, hydrogen: 4 },
      category: 'Alkena',
      clue: 'Satu ikatan rangkap dua',
    },
    guide: [
      'Tambahkan dua atom karbon.',
      'Pilih alat ikatan rangkap dua sebelum menghubungkan atom.',
      'Periksa rumus di inspector dan pastikan jumlah H = 4.',
    ],
    hints: [
      'Etena adalah alkena: dua karbon dihubungkan oleh satu ikatan C=C.',
      'Ikatan tunggal C–C pada dua karbon akan menghasilkan C₂H₆, bukan C₂H₄.',
      'Tambahkan dua atom C, pilih ikatan rangkap dua, lalu klik kedua atom.',
    ],
    validation: {
      ...exactRule(ETHENE, 'alkena'),
      formula: 'C2H4',
    },
    displayGraph: ETHENE,
    result: {
      name: 'Etena',
      category: 'Alkena',
      explanation:
        'Etena (C₂H₄) memiliki ikatan rangkap dua. Karena dua valensi setiap karbon dipakai untuk ikatan C=C, masing-masing karbon hanya mengikat dua hidrogen.',
    },
  },
  {
    id: 4,
    zoneId: 'carbon-basics',
    file: 'CC-01-04',
    title: 'Struktur Butana',
    tagline: 'Empat karbon, satu rantai.',
    type: 'build',
    typeLabel: 'Structure Builder',
    focus: 'Rantai utama',
    mission: 'Susun butana sebagai alkana rantai lurus dengan empat atom karbon.',
    target: {
      kind: 'name',
      label: 'NAMA TARGET',
      name: 'Butana',
      formula: { carbon: 4, hydrogen: 10 },
      category: 'Alkana',
    },
    guide: [
      'Butana membutuhkan empat atom C berurutan.',
      'Semua ikatan karbon–karbon adalah ikatan tunggal.',
      'Posisi gambar boleh bengkok; yang penting adalah urutan koneksinya.',
    ],
    hints: [
      'Rantai lurus berarti setiap karbon tengah terhubung ke dua karbon lain, tanpa cabang.',
      'Empat karbon dalam satu rantai membutuhkan tiga ikatan C–C tunggal.',
      'Struktur yang benar memiliki rumus C₄H₁₀ dan empat karbon terhubung berurutan.',
    ],
    validation: exactRule(BUTANE, 'alkana'),
    displayGraph: BUTANE,
    result: {
      name: 'Butana',
      category: 'Alkana',
      explanation:
        'Butana (C₄H₁₀) adalah alkana rantai lurus dengan empat karbon. Rantai boleh digambar zigzag atau bengkok selama urutan koneksinya tetap C–C–C–C.',
    },
  },
  {
    id: 5,
    zoneId: 'carbon-basics',
    file: 'CC-01-05',
    title: 'Titik Percabangan',
    tagline: 'Satu cabang mengubah nama.',
    type: 'build',
    typeLabel: 'Structure Builder',
    focus: 'Percabangan & penomoran',
    mission: 'Susun struktur 2-metilpropana.',
    target: {
      kind: 'name',
      label: 'NAMA TARGET',
      name: '2-metilpropana',
      formula: { carbon: 4, hydrogen: 10 },
      category: 'Alkana',
    },
    guide: [
      'Rantai utama propana terdiri dari tiga atom C.',
      'Cabang metil menempel pada karbon nomor dua.',
      'Periksa jumlah cabang dan panjang rantai utama.',
    ],
    hints: [
      'Struktur ini memiliki tiga karbon pada rantai utama dan satu karbon cabang.',
      'Satu karbon pusat terhubung langsung ke tiga karbon lain dalam kerangka bercabang.',
      'Totalnya tetap empat atom C dan sepuluh atom H. Cabang patut digambar pada posisi tengah rantai.',
    ],
    validation: exactRule(ISOBUTANE, 'alkana'),
    displayGraph: ISOBUTANE,
    result: {
      name: '2-metilpropana',
      category: 'Alkana',
      explanation:
        '2-metilpropana memiliki rantai utama tiga karbon dan satu cabang metil pada karbon nomor 2. Senyawa ini juga dikenal sebagai isobutana dan memiliki rumus C₄H₁₀.',
    },
  },
  {
    id: 6,
    zoneId: 'bond-research',
    file: 'CC-02-06',
    title: 'Formula Detective',
    tagline: 'Satu rumus, dua kemungkinan.',
    type: 'formula',
    typeLabel: 'Formula Detective',
    focus: 'Isomer struktur',
    mission: 'Bentuk salah satu alkana rantai terbuka dengan rumus C₄H₁₀.',
    target: {
      kind: 'formula',
      label: 'RUMUS TARGET',
      formula: { carbon: 4, hydrogen: 10 },
      category: 'Alkana',
      clue: 'Rantai terbuka • ikatan tunggal',
    },
    guide: [
      'Ada lebih dari satu struktur yang memenuhi rumus ini.',
      'Semua karbon harus terhubung dan semua ikatan harus tunggal.',
      'Bentuk lurus atau bercabang sama-sama diterima.',
    ],
    hints: [
      'C₄H₁₀ adalah alkana jenuh. Semua ikatan C–C harus tunggal.',
      'Ada dua isomer struktur: butana rantai lurus dan 2-metilpropana bercabang. Salah satunya cukup.',
      'Empat atom C, semua terhubung, dan selalu ingat rumus C₄H₁₀.',
    ],
    validation: {
      carbonCount: 4,
      formula: 'C4H10',
      category: 'alkana',
      requireAcyclic: true,
    },
    displayGraph: BUTANE,
    dynamicResult: true,
    result: {
      name: 'Isomer C₄H₁₀',
      category: 'Alkana',
      explanation:
        'C₄H₁₀ memiliki dua isomer struktur: butana dengan rantai lurus dan 2-metilpropana dengan rantai bercabang. Keduanya memiliki rumus molekul yang sama, tetapi konektivitas atomnya berbeda.',
      bonus: 'Coba ulangi misi ini dan temukan isomer satunya.',
    },
  },
  {
    id: 7,
    zoneId: 'bond-research',
    file: 'CC-02-07',
    title: 'Name Decoder',
    tagline: 'Baca struktur, susun nama.',
    type: 'name',
    typeLabel: 'Name Decoder',
    focus: 'Tata nama alkena',
    mission: 'Tentukan nama senyawa dari struktur yang ditampilkan.',
    target: {
      kind: 'structure',
      label: 'STRUKTUR TARGET',
      category: 'Alkena',
      clue: 'Empat karbon • satu ikatan rangkap',
    },
    guide: [
      'Temukan rantai terpanjang yang memuat ikatan rangkap.',
      'Beri nomor dari ujung yang paling dekat dengan ikatan rangkap.',
      'Susun nama dari posisi, rantai induk, dan akhiran.',
    ],
    hints: [
      'Rantai terpanjang yang memuat ikatan rangkap terdiri dari empat karbon.',
      'Ikatan rangkap berada paling dekat dengan ujung kiri, sehingga mendapat posisi 1.',
      'Gunakan potongan 1, but, dan -ena untuk membentuk nama.',
    ],
    namePuzzle: {
      displayGraph: BUTENE,
      expectedTokens: ['1', 'but', '-ena'],
      answerName: '1-butena',
      altNames: ['but-1-ena'],
      bank: NAME_TOKEN_BANK,
      slotLabels: ['Posisi', 'Rantai induk', 'Akhiran'],
    },
    displayGraph: BUTENE,
    result: {
      name: '1-butena',
      category: 'Alkena',
      explanation:
        'Ikatan rangkap pada struktur ini dimulai di karbon nomor 1. Rantai empat karbon dengan ikatan rangkap dua dinamai 1-butena. Penulisan but-1-ena juga diterima sebagai variasi yang setara.',
    },
  },
  {
    id: 8,
    zoneId: 'bond-research',
    file: 'CC-02-08',
    title: 'Lab Challenge',
    tagline: 'Bangun, lalu beri nama.',
    type: 'combo',
    typeLabel: 'Lab Challenge',
    focus: 'Struktur + tata nama',
    mission:
      'Susun hidrokarbon C₅H₁₂ dengan rantai utama empat karbon dan satu cabang metil.',
    target: {
      kind: 'formula',
      label: 'RUMUS TARGET',
      formula: { carbon: 5, hydrogen: 12 },
      category: 'Alkana',
      clue: 'Rantai utama 4 karbon • 1 cabang metil',
    },
    guide: [
      'Bangun rantai empat karbon terlebih dahulu.',
      'Tambahkan satu atom C sebagai cabang pada karbon nomor dua.',
      'Setelah struktur benar, lanjutkan ke tahap penamaan.',
    ],
    hints: [
      'Kerangka target memiliki lima karbon: empat pada rantai utama dan satu cabang metil di karbon 2.',
      'Buat rantai C–C–C–C, lalu hubungkan satu atom C tambahan ke karbon kedua.',
      'Nama struktur ini adalah 2-metilbutana: posisi 2, substituen metil, rantai induk butana.',
    ],
    validation: exactRule(METHYLBUTANE, 'alkana'),
    displayGraph: METHYLBUTANE,
    combo: true,
    nameGuide: [
      'Rantai utama adalah rantai terpanjang, yaitu empat karbon.',
      'Cabang metil berada pada karbon nomor 2.',
      'Gabungkan posisi cabang, nama substituen, rantai induk, dan akhiran -ana.',
    ],
    nameHints: [
      'Penomoran dimulai dari ujung yang membuat cabang mendapat nomor terkecil.',
      'Cabang pada karbon nomor 2 adalah gugus metil (–CH₃).',
      'Susun empat slot: 2 · metil · but · -ana.',
    ],
    namePuzzle: {
      displayGraph: METHYLBUTANE,
      expectedTokens: ['2', 'metil', 'but', '-ana'],
      answerName: '2-metilbutana',
      altNames: ['2-metil-butana'],
      bank: NAME_TOKEN_BANK,
      slotLabels: ['Posisi cabang', 'Substituen', 'Rantai induk', 'Akhiran'],
    },
    result: {
      name: '2-metilbutana',
      category: 'Alkana',
      explanation:
        '2-metilbutana memiliki rantai utama empat karbon dan cabang metil pada karbon nomor 2. Rumus molekulnya C₅H₁₂. Menyusun struktur dan menamainya adalah dua keterampilan yang saling melengkapi.',
    },
  },
];

export const LEVELS_BY_ID = new Map(LEVELS.map((level) => [level.id, level]));

export function getLevel(levelId) {
  return LEVELS_BY_ID.get(Number(levelId)) ?? null;
}

export function getLevelsForZone(zoneId) {
  return LEVELS.filter((level) => level.zoneId === zoneId);
}

export function getZone(zoneId) {
  return ZONES.find((zone) => zone.id === zoneId) ?? ZONES[0];
}

export function getZoneForLevel(level) {
  return getZone(level.zoneId);
}

export function getNextLevel(levelId) {
  return LEVELS.find((level) => level.id === Number(levelId) + 1) ?? null;
}

export function countFormulaForGraph(molecule) {
  return formulaOf(molecule);
}
