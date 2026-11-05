import { analyzeMolecule } from '../chemistry/graph.js';
import { describeStructure, tokenType } from '../chemistry/nomenclature.js';
import { formulaUnicode } from '../chemistry/formula.js';

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

const zigzag = (count, startX = 62, step = 66) =>
  Array.from({ length: count }, (_, index) =>
    atom(index, startX + index * step, index % 2 === 0 ? 118 : 78),
  );

function chain(count) {
  return graph(
    zigzag(count),
    Array.from({ length: count - 1 }, (_, index) => bond(index, index + 1)),
  );
}

function chainWithBond(count, locant, order) {
  return graph(
    zigzag(count),
    Array.from({ length: count - 1 }, (_, index) =>
      bond(index, index + 1, index === locant - 1 ? order : 1),
    ),
  );
}

function branched(parentLength, branches, bondSpec = null) {
  const nodes = zigzag(parentLength);
  const edges = Array.from({ length: parentLength - 1 }, (_, index) =>
    bond(index, index + 1, bondSpec && index === bondSpec.locant - 1 ? bondSpec.order : 1),
  );
  const used = new Map();
  let nextId = parentLength;

  branches.forEach(({ at, size = 1 }) => {
    const anchorIndex = at - 1;
    const anchor = nodes[anchorIndex];
    const slot = used.get(anchorIndex) ?? 0;
    used.set(anchorIndex, slot + 1);
    const direction = slot % 2 === 0 ? -1 : 1;
    const side = slot % 2 === 0 ? -1 : 1;
    const distance = 62 + Math.floor(slot / 2) * 56;
    let previous = anchorIndex;

    for (let step = 1; step <= size; step += 1) {
      const id = nextId;
      nextId += 1;
      nodes.push(
        atom(
          id,
          anchor.x + side * 14 * step,
          anchor.y + direction * (distance + (step - 1) * 56),
        ),
      );
      edges.push(bond(previous, id));
      previous = id;
    }
  });

  return graph(nodes, edges);
}

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
    slotStart: 11,
  },
  {
    id: 'naming-database',
    name: 'Naming Database',
    shortName: 'Naming Database',
    index: 3,
    icon: 'database',
    accent: 'amber',
    status: 'available',
    description: 'Menyusun nama dari rantai induk, posisi, dan substituen.',
    slotStart: 21,
  },
  {
    id: 'isomer-chamber',
    name: 'Isomer Chamber',
    shortName: 'Isomer Chamber',
    index: 4,
    icon: 'branch',
    accent: 'violet',
    status: 'available',
    description: 'Membandingkan struktur berbeda dengan rumus yang sama.',
    slotStart: 31,
  },
  {
    id: 'master-lab',
    name: 'Master Chemistry Lab',
    shortName: 'Master Chemistry Lab',
    index: 5,
    icon: 'crown',
    accent: 'rose',
    status: 'available',
    description: 'Menggabungkan semua mekanik menjadi tantangan akhir.',
    slotStart: 41,
  },
  {
    id: 'heavy-chain',
    name: 'Heavy Chain Vault',
    shortName: 'Heavy Chain',
    index: 6,
    icon: 'atom',
    accent: 'cyan',
    status: 'available',
    description: 'Rantai sembilan dan sepuluh karbon beserta cabang metil dan etil pertama.',
    slotStart: 51,
  },
  {
    id: 'naming-forge',
    name: 'Naming Forge',
    shortName: 'Naming Forge',
    index: 7,
    icon: 'target',
    accent: 'teal',
    status: 'available',
    description: 'Bolak-balik nama dan struktur dengan lebih dari satu cabang.',
    slotStart: 61,
  },
  {
    id: 'isomer-lab',
    name: 'Isomer Analysis Lab',
    shortName: 'Isomer Analysis',
    index: 8,
    icon: 'eye',
    accent: 'lime',
    status: 'available',
    description: 'Kerangka berbeda dengan rumus yang sama, lengkap dengan penomoran.',
    slotStart: 71,
  },
  {
    id: 'bond-spectrum',
    name: 'Bond Spectrum Wing',
    shortName: 'Bond Spectrum',
    index: 9,
    icon: 'spark',
    accent: 'orange',
    status: 'available',
    description: 'Alkana, alkena, dan alkuna pada rantai panjang.',
    slotStart: 81,
  },
  {
    id: 'master-archive',
    name: 'Master Archive',
    shortName: 'Master Archive',
    index: 10,
    icon: 'trophy',
    accent: 'gold',
    status: 'available',
    description: 'Tantangan gabungan multi-langkah memakai seluruh aturan tata nama.',
    slotStart: 91,
  },
];

const ZONE_INDEX = new Map(ZONES.map((zone) => [zone.id, zone.index]));
const fileFor = (zoneId, id) =>
  `CC-${String(ZONE_INDEX.get(zoneId) ?? 1).padStart(2, '0')}-${String(id).padStart(2, '0')}`;

export const DIFFICULTY_LABELS = [
  'Pemula',
  'Dasar',
  'Terampil',
  'Menengah',
  'Mahir',
  'Lanjutan',
  'Profesional',
  'Elite',
  'Ahli',
  'Master',
];

const difficultyFor = (id) => Math.min(DIFFICULTY_LABELS.length, Math.ceil(id / 10));

export const NAME_TOKEN_BANK = {
  numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  substituents: ['metil', 'dimetil', 'trimetil', 'tetrametil', 'etil', 'dietil', 'propil'],
  stems: ['met', 'et', 'prop', 'but', 'pent', 'heks', 'hept', 'okt', 'non', 'dek'],
  suffixes: ['-ana', '-ena', '-una'],
};

const locantOrder = (a, b) =>
  Number(a.split(',')[0]) - Number(b.split(',')[0]) || a.length - b.length || a.localeCompare(b);

// Every answer token is guaranteed to be in the bank; the neighbouring stems, base
// substituent words and extra positions stay as deliberate distractors.
function bankFor(tokens) {
  const numbers = new Set(['1', '2', '3']);
  const substituents = new Set(['metil', 'etil']);
  const stems = new Set();

  for (const token of tokens) {
    const type = tokenType(token);
    if (type === 'locant') {
      numbers.add(token);
      for (const digit of token.split(',')) numbers.add(digit);
    } else if (type === 'substituent') {
      substituents.add(token);
      substituents.add(token.replace(/^(?:di|tri|tetra)/, ''));
    } else if (type === 'stem') {
      stems.add(token);
    }
  }

  for (const stem of [...stems]) {
    const index = NAME_TOKEN_BANK.stems.indexOf(stem);
    for (const offset of [-1, 1]) {
      const neighbor = NAME_TOKEN_BANK.stems[index + offset];
      if (neighbor) stems.add(neighbor);
    }
  }

  return {
    numbers: [...numbers].sort(locantOrder),
    substituents: NAME_TOKEN_BANK.substituents.filter((token) => substituents.has(token)),
    stems: NAME_TOKEN_BANK.stems.filter((stem) => stems.has(stem)),
    suffixes: NAME_TOKEN_BANK.suffixes,
  };
}

export const METHANE = chain(1);
export const PROPANE = chain(3);
export const BUTANE = chain(4);
const PENTANE = chain(5);
const HEXANE = chain(6);
const HEPTANE = chain(7);
const OCTANE = chain(8);

export const ETHENE = chainWithBond(2, 1, 2);
const BUTENE = chainWithBond(4, 1, 2);
const BUT_2_ENE = chainWithBond(4, 2, 2);
const PENT_2_ENE = chainWithBond(5, 2, 2);
const HEX_3_ENE = chainWithBond(6, 3, 2);
export const ETHYNE = chainWithBond(2, 1, 3);
const BUTYNE = chainWithBond(4, 1, 3);
const PENTYNE = chainWithBond(5, 1, 3);
const HEXYNE = chainWithBond(6, 1, 3);
const HEX_2_YNE = chainWithBond(6, 2, 3);
const HEPT_3_YNE = chainWithBond(7, 3, 3);
const OCT_3_YNE = chainWithBond(8, 3, 3);
const OCT_4_YNE = chainWithBond(8, 4, 3);

export const ISOBUTANE = branched(3, [{ at: 2, size: 1 }]);
export const METHYLBUTANE = branched(4, [{ at: 2, size: 1 }]);
const METHYLPENTANE_2 = branched(5, [{ at: 2, size: 1 }]);
const METHYLPENTANE_3 = branched(5, [{ at: 3, size: 1 }]);
const METHYLHEXANE_2 = branched(6, [{ at: 2, size: 1 }]);
const METHYLHEXANE_3 = branched(6, [{ at: 3, size: 1 }]);
const METHYLHEPTANE_2 = branched(7, [{ at: 2, size: 1 }]);
const METHYLHEPTANE_3 = branched(7, [{ at: 3, size: 1 }]);
const METHYLHEPTANE_4 = branched(7, [{ at: 4, size: 1 }]);
const ETHYLPENTANE_3 = branched(5, [{ at: 3, size: 2 }]);
const ETHYLHEXANE_3 = branched(6, [{ at: 3, size: 2 }]);
const NEOPENTANE = branched(3, [{ at: 2 }, { at: 2 }]);
const DIMETHYLBUTANE_22 = branched(4, [{ at: 2 }, { at: 2 }]);
const DIMETHYLBUTANE_23 = branched(4, [{ at: 2 }, { at: 3 }]);
const DIMETHYLPENTANE_23 = branched(5, [{ at: 2 }, { at: 3 }]);
const DIMETHYLPENTANE_24 = branched(5, [{ at: 2 }, { at: 4 }]);
const DIMETHYLPENTANE_33 = branched(5, [{ at: 3 }, { at: 3 }]);
const TRIMETHYLBUTANE_223 = branched(4, [{ at: 2 }, { at: 2 }, { at: 3 }]);
const TRIMETHYLPENTANE_224 = branched(5, [{ at: 2 }, { at: 2 }, { at: 4 }]);
const TRIMETHYLPENTANE_234 = branched(5, [{ at: 2 }, { at: 3 }, { at: 4 }]);
const TETRAMETHYLBUTANE = branched(4, [{ at: 2 }, { at: 2 }, { at: 3 }, { at: 3 }]);

// Rantai panjang (zona 6 dan seterusnya): nonana, dekana, serta turunannya.
const NONANE = chain(9);
const DEKANA = chain(10);
const METHYLNONANE_2 = branched(9, [{ at: 2 }]);
const METHYLNONANE_3 = branched(9, [{ at: 3 }]);
const METHYLNONANE_4 = branched(9, [{ at: 4 }]);
const METHYLDEKANE_2 = branched(10, [{ at: 2 }]);
const METHYLDEKANE_3 = branched(10, [{ at: 3 }]);
const ETHYLNONANE_2 = branched(9, [{ at: 2, size: 2 }]);
const ETHYLOCTANE_3 = branched(8, [{ at: 3, size: 2 }]);
const ETHYLOCTANE_4 = branched(8, [{ at: 4, size: 2 }]);
const ETHYLHEPTANE_3 = branched(7, [{ at: 3, size: 2 }]);
const ETHYLHEPTANE_4 = branched(7, [{ at: 4, size: 2 }]);
const DIMETHYLHEXANE_23 = branched(6, [{ at: 2 }, { at: 3 }]);
const DIMETHYLHEPTANE_23 = branched(7, [{ at: 2 }, { at: 3 }]);
const DIMETHYLHEPTANE_25 = branched(7, [{ at: 2 }, { at: 5 }]);
const DIMETHYLHEPTANE_34 = branched(7, [{ at: 3 }, { at: 4 }]);
const DIMETHYLOCTANE_22 = branched(8, [{ at: 2 }, { at: 2 }]);
const DIMETHYLOCTANE_26 = branched(8, [{ at: 2 }, { at: 6 }]);
const DIMETHYLOCTANE_35 = branched(8, [{ at: 3 }, { at: 5 }]);
const DIMETHYLNONANE_22 = branched(9, [{ at: 2 }, { at: 2 }]);
const DIMETHYLNONANE_24 = branched(9, [{ at: 2 }, { at: 4 }]);
const DIMETHYLNONANE_26 = branched(9, [{ at: 2 }, { at: 6 }]);
const TRIMETHYLHEXANE_235 = branched(6, [{ at: 2 }, { at: 3 }, { at: 5 }]);
const TRIMETHYLHEPTANE_223 = branched(7, [{ at: 2 }, { at: 2 }, { at: 3 }]);
const TRIMETHYLHEPTANE_234 = branched(7, [{ at: 2 }, { at: 3 }, { at: 4 }]);
const TRIMETHYLOCTANE_246 = branched(8, [{ at: 2 }, { at: 4 }, { at: 6 }]);
const TRIMETHYLNONANE_235 = branched(9, [{ at: 2 }, { at: 3 }, { at: 5 }]);
const TETRAMETHYLHEXANE_2345 = branched(6, [
  { at: 2 },
  { at: 3 },
  { at: 4 },
  { at: 5 },
]);
const ETHYLDIMETHYLHEXANE_33 = branched(6, [{ at: 3, size: 2 }, { at: 3 }]);
const ETHYLMETHYLOCTANE_35 = branched(8, [{ at: 3, size: 2 }, { at: 5 }]);
const ETHYLMETHYLOCTANE_42 = branched(8, [{ at: 4, size: 2 }, { at: 2 }]);
const DIETHYLHEPTANE_34 = branched(7, [{ at: 3, size: 2 }, { at: 4, size: 2 }]);
const DIETHYLHEPTANE_35 = branched(7, [{ at: 3, size: 2 }, { at: 5, size: 2 }]);

const NONEN_2 = chainWithBond(9, 2, 2);
const NONEN_3 = chainWithBond(9, 3, 2);
const NONEN_4 = chainWithBond(9, 4, 2);
const DEKEN_3 = chainWithBond(10, 3, 2);
const DEKEN_5 = chainWithBond(10, 5, 2);
const NONUN_2 = chainWithBond(9, 2, 3);
const DEKUN_1 = chainWithBond(10, 1, 3);
const DEKUN_3 = chainWithBond(10, 3, 3);
const DEKUN_4 = chainWithBond(10, 4, 3);
const METHYLHEPTENE_4 = branched(7, [{ at: 4 }], { locant: 2, order: 2 });
const METHYLNONENE_2 = branched(9, [{ at: 2 }], { locant: 1, order: 2 });
const METHYLHEPTYNE_4 = branched(7, [{ at: 4 }], { locant: 1, order: 3 });

function defaultTagline(category) {
  return {
    alkana: 'Rantai tunggal, valensi terpenuhi.',
    alkena: 'Satu ikatan rangkap mengubah rumus.',
    alkuna: 'Ikatan rangkap tiga menuntut ketelitian.',
  }[category] ?? 'Latihan struktur hidrokarbon.';
}

function buildScaffold(name, molecule, category, categoryLabel) {
  const analysis = analyzeMolecule(molecule);
  const formula = formulaUnicode(analysis.carbonCount, analysis.hydrogenCount);
  const branchCount = analysis.branchPoints.length;
  const bondInstruction =
    analysis.bondCounts.double > 0
      ? 'Gunakan ikatan rangkap dua pada posisi yang diminta.'
      : analysis.bondCounts.triple > 0
        ? 'Gunakan ikatan rangkap tiga pada posisi yang diminta.'
        : 'Gunakan ikatan tunggal untuk semua ikatan C–C.';
  const chainInstruction = branchCount
    ? 'Rantai terpanjang adalah rantai induk; cabang menempel pada karbon bernomor sesuai nama.'
    : 'Susun semua karbon dalam satu rantai lurus tanpa cabang.';

  return {
    guide: [
      `Tambahkan ${analysis.carbonCount} atom C, lalu hubungkan menjadi satu molekul.`,
      `${bondInstruction} ${chainInstruction}`,
      `Periksa inspector: target ${formula}, kategori ${categoryLabel}, dan rantai terbuka.`,
    ],
    hints: [
      `${name} memiliki ${analysis.carbonCount} atom karbon dan ${analysis.hydrogenCount} atom hidrogen (${formula}).`,
      bondInstruction,
      branchCount
        ? `Struktur ini membutuhkan ${branchCount} titik percabangan. Hitung ulang posisi cabang sebelum menekan Periksa.`
        : 'Urutan koneksi yang dinilai, bukan bentuk gambarnya. Zigzag atau bengkok tetap sah.',
    ],
  };
}

function formulaScaffold(carbon, hydrogen, category, categoryLabel) {
  const formula = formulaUnicode(carbon, hydrogen);
  const bondInstruction =
    category === 'alkena'
      ? 'Bentuk tepat satu ikatan rangkap dua; sisanya ikatan tunggal.'
      : category === 'alkuna'
        ? 'Bentuk tepat satu ikatan rangkap tiga; sisanya ikatan tunggal.'
        : 'Gunakan hanya ikatan tunggal.';

  return {
    guide: [
      `Tambahkan ${carbon} atom C dan hubungkan semuanya menjadi satu molekul.`,
      bondInstruction,
      `Cocokkan rumus ${formula} dan pastikan tidak ada ikatan yang membentuk lingkaran.`,
    ],
    hints: [
      `Target membutuhkan ${carbon} atom karbon dan ${hydrogen} atom hidrogen (${formula}).`,
      bondInstruction,
      'Beberapa isomer dapat memenuhi target. Struktur lurus maupun bercabang sama-sama diterima.',
    ],
  };
}

function namingScaffold(displayGraph, tokens) {
  const description = describeStructure(displayGraph);
  const analysis = analyzeMolecule(displayGraph);
  const parentLength = description?.parentLength ?? analysis.carbonCount;
  const multiple = description?.multipleLocant;
  const substituents = description?.substituents ?? [];
  const multipleLabel = analysis.bondCounts.triple > 0 ? 'ikatan rangkap tiga' : 'ikatan rangkap dua';
  const hints = [`Rantai induk memiliki ${parentLength} atom karbon.`];

  if (multiple) {
    hints.push(`${multipleLabel} berada pada posisi ${multiple} jika penomoran dimulai dari ujung terdekat.`);
  } else if (substituents.length) {
    hints.push(
      `Cabang menempel pada posisi ${substituents
        .map((item) => `${item.locant}-${item.name}`)
        .join(', ')}.`,
    );
  } else {
    hints.push('Tidak ada cabang; fokus pada posisi ikatan dan akhiran yang tepat.');
  }
  hints.push(`Susun token: ${tokens.join(' · ')}.`);

  return {
    guide: [
      'Temukan rantai terpanjang yang memuat ikatan rangkap (jika ada).',
      'Beri nomor dari ujung yang memberi posisi terkecil pada ikatan rangkap atau cabang.',
      'Susun nama dari posisi, substituen, rantai induk, lalu akhiran.',
    ],
    hints,
  };
}

function slotLabelsFor(tokens) {
  const branched = tokens.some((token) => tokenType(token) === 'substituent');
  return tokens.map((token) => {
    switch (tokenType(token)) {
      case 'locant':
        return branched ? 'Posisi cabang' : 'Posisi ikatan';
      case 'substituent':
        return 'Substituen';
      case 'stem':
        return 'Rantai induk';
      case 'suffix':
        return 'Akhiran';
      default:
        return 'Bagian nama';
    }
  });
}

function buildExplanation(name, molecule, category, extra = '') {
  const analysis = analyzeMolecule(molecule);
  const formula = formulaUnicode(analysis.carbonCount, analysis.hydrogenCount);
  const bondSentence =
    category === 'alkena'
      ? 'Ikatan rangkap dua memakai dua valensi, sehingga jumlah hidrogen lebih sedikit daripada alkana.'
      : category === 'alkuna'
        ? 'Ikatan rangkap tiga memakai tiga valensi, sehingga dua karbon pada ikatan C≡C hanya mengikat satu hidrogen.'
        : 'Semua ikatan C–C tunggal, sehingga setiap karbon mengisi sisa valensinya dengan hidrogen.';
  const branchSentence = analysis.branchPoints.length
    ? ' Rantai induk diambil dari rantai terpanjang, lalu cabang diberi nomor sekecil mungkin.'
    : '';
  return `${name} (${formula}) memiliki ${analysis.carbonCount} atom karbon. ${bondSentence}${branchSentence}${extra ? ` ${extra}` : ''}`;
}

function buildLevel(config) {
  const {
    id,
    zoneId,
    title,
    focus,
    mission,
    molecule,
    name,
    category,
    categoryLabel,
    tagline,
    extra = '',
  } = config;
  const analysis = analyzeMolecule(molecule);
  const scaffold = buildScaffold(name, molecule, category, categoryLabel);

  return {
    id,
    zoneId,
    file: fileFor(zoneId, id),
    title,
    tagline: tagline ?? defaultTagline(category),
    type: 'build',
    typeLabel: 'Structure Builder',
    focus,
    mission: mission ?? `Susun struktur ${name} dari ${analysis.carbonCount} atom karbon.`,
    target: {
      kind: 'name',
      label: 'NAMA TARGET',
      name,
      formula: { carbon: analysis.carbonCount, hydrogen: analysis.hydrogenCount },
      category: categoryLabel,
    },
    guide: scaffold.guide,
    hints: scaffold.hints,
    validation: exactRule(molecule, category),
    displayGraph: molecule,
    result: {
      name,
      category: categoryLabel,
      explanation: buildExplanation(name, molecule, category, extra),
    },
  };
}

function formulaLevel(config) {
  const {
    id,
    zoneId,
    title,
    focus,
    mission,
    carbon,
    hydrogen,
    category,
    categoryLabel,
    clue,
    displayGraph,
    explanation,
    bonus = '',
    requireBranched = false,
  } = config;
  const scaffold = formulaScaffold(carbon, hydrogen, category, categoryLabel);

  return {
    id,
    zoneId,
    file: fileFor(zoneId, id),
    title,
    tagline: defaultTagline(category),
    type: 'formula',
    typeLabel: 'Formula Detective',
    focus,
    mission,
    target: {
      kind: 'formula',
      label: 'RUMUS TARGET',
      formula: { carbon, hydrogen },
      category: categoryLabel,
      clue,
    },
    guide: scaffold.guide,
    hints: scaffold.hints,
    validation: {
      carbonCount: carbon,
      formula: `C${carbon}H${hydrogen}`,
      category,
      requireAcyclic: true,
      ...(requireBranched ? { requireBranched: true } : {}),
    },
    displayGraph,
    dynamicResult: true,
    result: {
      name: `Isomer ${formulaUnicode(carbon, hydrogen)}`,
      category: categoryLabel,
      explanation,
      bonus,
    },
  };
}

function nameLevel(config) {
  const {
    id,
    zoneId,
    title,
    focus,
    mission,
    displayGraph,
    answerName,
    tokens,
    altNames = [],
    category,
    categoryLabel,
    clue,
    extra = '',
  } = config;
  const scaffold = namingScaffold(displayGraph, tokens);

  return {
    id,
    zoneId,
    file: fileFor(zoneId, id),
    title,
    tagline: defaultTagline(category),
    type: 'name',
    typeLabel: 'Name Decoder',
    focus,
    mission: mission ?? 'Tentukan nama senyawa dari struktur yang ditampilkan.',
    target: {
      kind: 'structure',
      label: 'STRUKTUR TARGET',
      category: categoryLabel,
      clue,
    },
    guide: scaffold.guide,
    hints: scaffold.hints,
    namePuzzle: {
      displayGraph,
      expectedTokens: tokens,
      answerName,
      altNames,
      bank: bankFor(tokens),
      slotLabels: slotLabelsFor(tokens),
    },
    displayGraph,
    result: {
      name: answerName,
      category: categoryLabel,
      explanation: buildExplanation(answerName, displayGraph, category, extra),
    },
  };
}

function comboLevel(config) {
  const {
    id,
    zoneId,
    title,
    focus,
    mission,
    molecule,
    buildName,
    answerName,
    tokens,
    altNames = [],
    category,
    categoryLabel,
    clue,
    extra = '',
  } = config;
  const analysis = analyzeMolecule(molecule);
  const buildScaffoldData = buildScaffold(buildName, molecule, category, categoryLabel);
  const namingScaffoldData = namingScaffold(molecule, tokens);

  return {
    id,
    zoneId,
    file: fileFor(zoneId, id),
    title,
    tagline: defaultTagline(category),
    type: 'combo',
    typeLabel: 'Lab Challenge',
    focus,
    mission,
    target: {
      kind: 'formula',
      label: 'RUMUS TARGET',
      formula: { carbon: analysis.carbonCount, hydrogen: analysis.hydrogenCount },
      category: categoryLabel,
      clue,
    },
    guide: buildScaffoldData.guide,
    hints: buildScaffoldData.hints,
    validation: exactRule(molecule, category),
    displayGraph: molecule,
    combo: true,
    nameGuide: namingScaffoldData.guide,
    nameHints: namingScaffoldData.hints,
    namePuzzle: {
      displayGraph: molecule,
      expectedTokens: tokens,
      answerName,
      altNames,
      bank: bankFor(tokens),
      slotLabels: slotLabelsFor(tokens),
    },
    result: {
      name: answerName,
      category: categoryLabel,
      explanation: buildExplanation(answerName, molecule, category, extra),
    },
  };
}

export const LEVELS = [
  buildLevel({
    id: 1,
    zoneId: 'carbon-basics',
    title: 'Metana Pertama',
    focus: 'Valensi karbon',
    mission: 'Susun struktur metana dari satu atom karbon.',
    molecule: METHANE,
    name: 'Metana',
    category: 'alkana',
    categoryLabel: 'Alkana',
    extra: 'Metana adalah hidrokarbon paling sederhana dan menjadi titik awal seluruh deret alkana.',
  }),
  buildLevel({
    id: 2,
    zoneId: 'carbon-basics',
    title: 'Rantai Karbon',
    focus: 'Rantai alkana',
    molecule: PROPANE,
    name: 'Propana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  formulaLevel({
    id: 3,
    zoneId: 'carbon-basics',
    title: 'Detektor Ikatan',
    focus: 'Ikatan rangkap dua',
    mission: 'Bentuk hidrokarbon rantai terbuka dengan rumus C₂H₄ dan satu ikatan rangkap dua.',
    carbon: 2,
    hydrogen: 4,
    category: 'alkena',
    categoryLabel: 'Alkena',
    clue: 'Dua karbon • satu ikatan rangkap dua',
    displayGraph: ETHENE,
    explanation:
      'C₂H₄ hanya dapat dipenuhi oleh etena dengan satu ikatan rangkap dua. Setiap karbon memakai dua valensi untuk ikatan C=C dan dua valensi sisanya untuk hidrogen.',
  }),
  buildLevel({
    id: 4,
    zoneId: 'carbon-basics',
    title: 'Struktur Butana',
    focus: 'Rantai utama',
    molecule: BUTANE,
    name: 'Butana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  buildLevel({
    id: 5,
    zoneId: 'carbon-basics',
    title: 'Titik Percabangan',
    focus: 'Percabangan & penomoran',
    molecule: ISOBUTANE,
    name: '2-metilpropana',
    category: 'alkana',
    categoryLabel: 'Alkana',
    extra: 'Senyawa ini juga dikenal sebagai isobutana.',
  }),
  buildLevel({
    id: 6,
    zoneId: 'carbon-basics',
    title: 'Rantai Lima Karbon',
    focus: 'Alkana rantai lurus',
    molecule: PENTANE,
    name: 'Pentana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  formulaLevel({
    id: 7,
    zoneId: 'carbon-basics',
    title: 'Formula Isomer',
    focus: 'Isomer struktur',
    mission: 'Bentuk salah satu alkana rantai terbuka dengan rumus C₄H₁₀.',
    carbon: 4,
    hydrogen: 10,
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Empat karbon • semua ikatan tunggal',
    displayGraph: BUTANE,
    explanation:
      'C₄H₁₀ memiliki dua isomer struktur: butana dengan rantai lurus dan 2-metilpropana dengan rantai bercabang. Keduanya memakai ikatan tunggal dan tidak membentuk lingkaran.',
    bonus: 'Coba ulangi misi ini dan bangun isomer satunya.',
  }),
  buildLevel({
    id: 8,
    zoneId: 'carbon-basics',
    title: 'Rantai Heksana',
    focus: 'Alkana rantai panjang',
    molecule: HEXANE,
    name: 'Heksana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  formulaLevel({
    id: 9,
    zoneId: 'carbon-basics',
    title: 'Rumus C₅H₁₂',
    focus: 'Isomer alkana',
    mission: 'Bentuk salah satu alkana rantai terbuka dengan rumus C₅H₁₂.',
    carbon: 5,
    hydrogen: 12,
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Lima karbon • semua ikatan tunggal',
    displayGraph: PENTANE,
    explanation:
      'C₅H₁₂ memiliki tiga isomer struktur: pentana lurus, 2-metilbutana, dan 2,2-dimetilpropana. Semua isomer ini sah selama kerangkanya terhubung dan tidak melingkar.',
    bonus: 'Tiga isomer tersedia. Bangun setidaknya dua di antaranya.',
  }),
  buildLevel({
    id: 10,
    zoneId: 'carbon-basics',
    title: 'Rantai Heptana',
    focus: 'Alkana rantai panjang',
    molecule: HEPTANE,
    name: 'Heptana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),

  nameLevel({
    id: 11,
    zoneId: 'bond-research',
    title: 'Name Decoder',
    focus: 'Tata nama alkena',
    displayGraph: BUTENE,
    answerName: '1-butena',
    tokens: ['1', 'but', '-ena'],
    altNames: ['but-1-ena'],
    category: 'alkena',
    categoryLabel: 'Alkena',
    clue: 'Empat karbon • satu ikatan rangkap',
    extra: 'Penulisan but-1-ena juga diterima sebagai variasi yang setara.',
  }),
  buildLevel({
    id: 12,
    zoneId: 'bond-research',
    title: 'Alkena Posisi Dua',
    focus: 'Posisi ikatan rangkap',
    molecule: BUT_2_ENE,
    name: '2-butena',
    category: 'alkena',
    categoryLabel: 'Alkena',
    extra: 'Penulisan but-2-ena juga digunakan untuk senyawa yang sama.',
  }),
  formulaLevel({
    id: 13,
    zoneId: 'bond-research',
    title: 'Rumus C₅H₁₀',
    focus: 'Alkena rantai terbuka',
    mission: 'Bentuk salah satu alkena rantai terbuka dengan rumus C₅H₁₀.',
    carbon: 5,
    hydrogen: 10,
    category: 'alkena',
    categoryLabel: 'Alkena',
    clue: 'Lima karbon • satu ikatan rangkap dua',
    displayGraph: PENT_2_ENE,
    explanation:
      'C₅H₁₀ dengan satu ikatan rangkap dua memiliki beberapa isomer posisi dan kerangka. Selama jumlah karbon, jumlah hidrogen, dan kategori alkena terpenuhi, strukturmu sah.',
  }),
  nameLevel({
    id: 14,
    zoneId: 'bond-research',
    title: 'Nama Alkena',
    focus: 'Penomoran alkena',
    displayGraph: BUT_2_ENE,
    answerName: '2-butena',
    tokens: ['2', 'but', '-ena'],
    altNames: ['but-2-ena'],
    category: 'alkena',
    categoryLabel: 'Alkena',
    clue: 'Empat karbon • ikatan rangkap di tengah',
  }),
  buildLevel({
    id: 15,
    zoneId: 'bond-research',
    title: 'Alkuna Pertama',
    focus: 'Ikatan rangkap tiga',
    molecule: BUTYNE,
    name: '1-butuna',
    category: 'alkuna',
    categoryLabel: 'Alkuna',
  }),
  formulaLevel({
    id: 16,
    zoneId: 'bond-research',
    title: 'Rumus C₄H₆',
    focus: 'Alkuna rantai terbuka',
    mission: 'Bentuk salah satu alkuna rantai terbuka dengan rumus C₄H₆.',
    carbon: 4,
    hydrogen: 6,
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    clue: 'Empat karbon • satu ikatan rangkap tiga',
    displayGraph: BUTYNE,
    explanation:
      'C₄H₆ dengan satu ikatan rangkap tiga dapat berupa 1-butuna atau 2-butuna. Keduanya memakai kerangka empat karbon dengan posisi ikatan rangkap tiga yang berbeda.',
  }),
  nameLevel({
    id: 17,
    zoneId: 'bond-research',
    title: 'Pentena Posisi Dua',
    focus: 'Tata nama alkena',
    displayGraph: PENT_2_ENE,
    answerName: '2-pentena',
    tokens: ['2', 'pent', '-ena'],
    altNames: ['pent-2-ena'],
    category: 'alkena',
    categoryLabel: 'Alkena',
    clue: 'Lima karbon • ikatan rangkap posisi 2',
  }),
  buildLevel({
    id: 18,
    zoneId: 'bond-research',
    title: 'Alkuna Lima Karbon',
    focus: 'Alkuna rantai lurus',
    molecule: PENTYNE,
    name: '1-pentuna',
    category: 'alkuna',
    categoryLabel: 'Alkuna',
  }),
  nameLevel({
    id: 19,
    zoneId: 'bond-research',
    title: 'Heksuna Pertama',
    focus: 'Tata nama alkuna',
    displayGraph: HEXYNE,
    answerName: '1-heksuna',
    tokens: ['1', 'heks', '-una'],
    altNames: ['heks-1-una'],
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    clue: 'Enam karbon • ikatan rangkap tiga di ujung',
  }),
  comboLevel({
    id: 20,
    zoneId: 'bond-research',
    title: 'Lab Challenge',
    focus: 'Struktur + tata nama',
    mission: 'Susun hidrokarbon C₅H₁₂ dengan rantai utama empat karbon dan satu cabang metil.',
    molecule: METHYLBUTANE,
    buildName: '2-metilbutana',
    answerName: '2-metilbutana',
    tokens: ['2', 'metil', 'but', '-ana'],
    altNames: ['2-metil-butana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Rantai utama 4 karbon • 1 cabang metil',
    extra: 'Menyusun struktur dan menamainya adalah dua keterampilan yang saling melengkapi.',
  }),

  nameLevel({
    id: 21,
    zoneId: 'naming-database',
    title: 'Metilpentana',
    focus: 'Tata nama alkana',
    displayGraph: METHYLPENTANE_2,
    answerName: '2-metilpentana',
    tokens: ['2', 'metil', 'pent', '-ana'],
    altNames: ['2-metil-pentana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Rantai lima karbon • satu cabang metil',
  }),
  nameLevel({
    id: 22,
    zoneId: 'naming-database',
    title: 'Posisi Tiga',
    focus: 'Penomoran cabang',
    displayGraph: METHYLPENTANE_3,
    answerName: '3-metilpentana',
    tokens: ['3', 'metil', 'pent', '-ana'],
    altNames: ['3-metil-pentana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Rantai lima karbon • cabang di tengah',
  }),
  buildLevel({
    id: 23,
    zoneId: 'naming-database',
    title: 'Cabang Heksana',
    focus: 'Membangun cabang',
    molecule: METHYLHEXANE_3,
    name: '3-metilheksana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  nameLevel({
    id: 24,
    zoneId: 'naming-database',
    title: 'Heksuna Posisi Dua',
    focus: 'Tata nama alkuna',
    displayGraph: HEX_2_YNE,
    answerName: '2-heksuna',
    tokens: ['2', 'heks', '-una'],
    altNames: ['heks-2-una'],
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    clue: 'Enam karbon • ikatan rangkap tiga posisi 2',
  }),
  formulaLevel({
    id: 25,
    zoneId: 'naming-database',
    title: 'Rumus C₆H₁₀',
    focus: 'Alkuna & isomer',
    mission: 'Bentuk salah satu alkuna rantai terbuka dengan rumus C₆H₁₀.',
    carbon: 6,
    hydrogen: 10,
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    clue: 'Enam karbon • satu ikatan rangkap tiga',
    displayGraph: HEX_2_YNE,
    explanation:
      'C₆H₁₀ dengan satu ikatan rangkap tiga memiliki beberapa isomer posisi dan kerangka bercabang. Pastikan hanya ada satu ikatan rangkap tiga dan tidak ada lingkaran.',
  }),
  comboLevel({
    id: 26,
    zoneId: 'naming-database',
    title: 'Nama Heksana Bercabang',
    focus: 'Struktur + nama',
    mission: 'Bangun 2-metilheksana, lalu susun namanya dari token yang tersedia.',
    molecule: METHYLHEXANE_2,
    buildName: '2-metilheksana',
    answerName: '2-metilheksana',
    tokens: ['2', 'metil', 'heks', '-ana'],
    altNames: ['2-metil-heksana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Enam karbon pada rantai induk • cabang metil',
  }),
  nameLevel({
    id: 27,
    zoneId: 'naming-database',
    title: 'Heptuna Posisi Tiga',
    focus: 'Tata nama alkuna',
    displayGraph: HEPT_3_YNE,
    answerName: '3-heptuna',
    tokens: ['3', 'hept', '-una'],
    altNames: ['hept-3-una'],
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    clue: 'Tujuh karbon • ikatan rangkap tiga posisi 3',
  }),
  comboLevel({
    id: 28,
    zoneId: 'naming-database',
    title: 'Etil di Rantai',
    focus: 'Substituen etil',
    mission: 'Bangun 3-etilpentana, lalu tentukan nama sistematisnya.',
    molecule: ETHYLPENTANE_3,
    buildName: '3-etilpentana',
    answerName: '3-etilpentana',
    tokens: ['3', 'etil', 'pent', '-ana'],
    altNames: ['3-etil-pentana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Rantai lima karbon • cabang etil dua karbon',
  }),
  nameLevel({
    id: 29,
    zoneId: 'naming-database',
    title: 'Heksena Posisi Tiga',
    focus: 'Tata nama alkena',
    displayGraph: HEX_3_ENE,
    answerName: '3-heksena',
    tokens: ['3', 'heks', '-ena'],
    altNames: ['heks-3-ena'],
    category: 'alkena',
    categoryLabel: 'Alkena',
    clue: 'Enam karbon • ikatan rangkap dua posisi 3',
  }),
  comboLevel({
    id: 30,
    zoneId: 'naming-database',
    title: 'Metilheptana',
    focus: 'Struktur + nama',
    mission: 'Bangun 2-metilheptana dan susun nama lengkapnya.',
    molecule: METHYLHEPTANE_2,
    buildName: '2-metilheptana',
    answerName: '2-metilheptana',
    tokens: ['2', 'metil', 'hept', '-ana'],
    altNames: ['2-metil-heptana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Tujuh karbon pada rantai induk • cabang metil',
  }),

  formulaLevel({
    id: 31,
    zoneId: 'isomer-chamber',
    title: 'Rumus C₆H₁₄',
    focus: 'Isomer alkana',
    mission: 'Bentuk salah satu alkana rantai terbuka dengan rumus C₆H₁₄.',
    carbon: 6,
    hydrogen: 14,
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Enam karbon • semua ikatan tunggal',
    displayGraph: HEXANE,
    explanation:
      'C₆H₁₄ memiliki lima isomer struktur alkana, mulai dari heksana lurus hingga 2,2-dimetilbutana. Semua isomer memakai ikatan tunggal dan kerangka yang terhubung.',
  }),
  buildLevel({
    id: 32,
    zoneId: 'isomer-chamber',
    title: 'Neopentana',
    focus: 'Isomer bercabang',
    mission: 'Susun neopentana, isomer bercabang paling simetris dari C₅H₁₂.',
    molecule: NEOPENTANE,
    name: '2,2-dimetilpropana',
    category: 'alkana',
    categoryLabel: 'Alkana',
    extra: 'Nama umum senyawa ini adalah neopentana.',
  }),
  buildLevel({
    id: 33,
    zoneId: 'isomer-chamber',
    title: 'Dimetilbutana',
    focus: 'Dua cabang metil',
    molecule: DIMETHYLBUTANE_23,
    name: '2,3-dimetilbutana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  formulaLevel({
    id: 34,
    zoneId: 'isomer-chamber',
    title: 'Rumus C₇H₁₆',
    focus: 'Isomer alkana',
    mission: 'Bentuk salah satu alkana rantai terbuka dengan rumus C₇H₁₆.',
    carbon: 7,
    hydrogen: 16,
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Tujuh karbon • semua ikatan tunggal',
    displayGraph: HEPTANE,
    explanation:
      'C₇H₁₆ memiliki sembilan isomer struktur alkana. Kamu dapat memilih rantai lurus atau salah satu kerangka bercabang selama valensi dan rumusnya terpenuhi.',
  }),
  buildLevel({
    id: 35,
    zoneId: 'isomer-chamber',
    title: 'Dua Cabang Satu Karbon',
    focus: 'Posisi cabang',
    molecule: DIMETHYLBUTANE_22,
    name: '2,2-dimetilbutana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  buildLevel({
    id: 36,
    zoneId: 'isomer-chamber',
    title: 'Dimetilpentana',
    focus: 'Isomer bercabang',
    molecule: DIMETHYLPENTANE_23,
    name: '2,3-dimetilpentana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  formulaLevel({
    id: 37,
    zoneId: 'isomer-chamber',
    title: 'Rumus C₈H₁₈',
    focus: 'Isomer alkana',
    mission: 'Bentuk salah satu alkana rantai terbuka dengan rumus C₈H₁₈.',
    carbon: 8,
    hydrogen: 18,
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Delapan karbon • semua ikatan tunggal',
    displayGraph: OCTANE,
    explanation:
      'C₈H₁₈ memiliki delapan belas isomer struktur alkana. Target ini menguji kemampuanmu menjaga jumlah karbon, valensi, dan kerangka tetap konsisten.',
  }),
  buildLevel({
    id: 38,
    zoneId: 'isomer-chamber',
    title: 'Trimetilbutana',
    focus: 'Tiga cabang',
    molecule: TRIMETHYLBUTANE_223,
    name: '2,2,3-trimetilbutana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  buildLevel({
    id: 39,
    zoneId: 'isomer-chamber',
    title: 'Isooktana',
    focus: 'Isomer bercabang',
    molecule: TRIMETHYLPENTANE_224,
    name: '2,2,4-trimetilpentana',
    category: 'alkana',
    categoryLabel: 'Alkana',
    extra: 'Senyawa ini dikenal sebagai isooktana dan menjadi acuan nilai oktan bensin.',
  }),
  comboLevel({
    id: 40,
    zoneId: 'isomer-chamber',
    title: 'Metilheptana Posisi Tiga',
    focus: 'Struktur + nama',
    mission: 'Bangun 3-metilheptana, lalu susun namanya dengan token yang tepat.',
    molecule: METHYLHEPTANE_3,
    buildName: '3-metilheptana',
    answerName: '3-metilheptana',
    tokens: ['3', 'metil', 'hept', '-ana'],
    altNames: ['3-metil-heptana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Tujuh karbon pada rantai induk • cabang di posisi 3',
  }),

  buildLevel({
    id: 41,
    zoneId: 'master-lab',
    title: 'Dimetil di Posisi Tiga',
    focus: 'Percabangan kompleks',
    molecule: DIMETHYLPENTANE_33,
    name: '3,3-dimetilpentana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  nameLevel({
    id: 42,
    zoneId: 'master-lab',
    title: 'Oktuna Posisi Empat',
    focus: 'Tata nama alkuna',
    displayGraph: OCT_4_YNE,
    answerName: '4-oktuna',
    tokens: ['4', 'okt', '-una'],
    altNames: ['okt-4-una'],
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    clue: 'Delapan karbon • ikatan rangkap tiga posisi 4',
  }),
  comboLevel({
    id: 43,
    zoneId: 'master-lab',
    title: 'Metil di Posisi Empat',
    focus: 'Struktur + nama',
    mission: 'Bangun 4-metilheptana dan tentukan nama sistematisnya.',
    molecule: METHYLHEPTANE_4,
    buildName: '4-metilheptana',
    answerName: '4-metilheptana',
    tokens: ['4', 'metil', 'hept', '-ana'],
    altNames: ['4-metil-heptana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Tujuh karbon pada rantai induk • cabang di posisi 4',
  }),
  formulaLevel({
    id: 44,
    zoneId: 'master-lab',
    title: 'Rumus C₈H₁₄',
    focus: 'Alkuna rantai terbuka',
    mission: 'Bentuk salah satu alkuna rantai terbuka dengan rumus C₈H₁₄.',
    carbon: 8,
    hydrogen: 14,
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    clue: 'Delapan karbon • satu ikatan rangkap tiga',
    displayGraph: OCT_3_YNE,
    explanation:
      'C₈H₁₄ dengan satu ikatan rangkap tiga dapat memiliki berbagai posisi ikatan dan kerangka bercabang. Pastikan hanya ada satu ikatan rangkap tiga dan tidak ada lingkaran.',
  }),
  buildLevel({
    id: 45,
    zoneId: 'master-lab',
    title: 'Bangun 4-Oktuna',
    focus: 'Alkuna panjang',
    molecule: OCT_4_YNE,
    name: '4-oktuna',
    category: 'alkuna',
    categoryLabel: 'Alkuna',
  }),
  comboLevel({
    id: 46,
    zoneId: 'master-lab',
    title: 'Etilheksana',
    focus: 'Substituen etil',
    mission: 'Bangun 3-etilheksana, lalu susun namanya dari token yang tersedia.',
    molecule: ETHYLHEXANE_3,
    buildName: '3-etilheksana',
    answerName: '3-etilheksana',
    tokens: ['3', 'etil', 'heks', '-ana'],
    altNames: ['3-etil-heksana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Rantai enam karbon • cabang etil dua karbon',
  }),
  nameLevel({
    id: 47,
    zoneId: 'master-lab',
    title: 'Oktuna Posisi Tiga',
    focus: 'Tata nama alkuna',
    displayGraph: OCT_3_YNE,
    answerName: '3-oktuna',
    tokens: ['3', 'okt', '-una'],
    altNames: ['okt-3-una'],
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    clue: 'Delapan karbon • ikatan rangkap tiga posisi 3',
  }),
  buildLevel({
    id: 48,
    zoneId: 'master-lab',
    title: 'Dua Cabang Terpisah',
    focus: 'Dua cabang terpisah',
    molecule: DIMETHYLPENTANE_24,
    name: '2,4-dimetilpentana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  buildLevel({
    id: 49,
    zoneId: 'master-lab',
    title: 'Trimetilpentana',
    focus: 'Tiga cabang',
    molecule: TRIMETHYLPENTANE_234,
    name: '2,3,4-trimetilpentana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  buildLevel({
    id: 50,
    zoneId: 'master-lab',
    title: 'Master Molekul',
    focus: 'Tantangan akhir',
    mission: 'Susun 2,2,3,3-tetrametilbutana, struktur paling bercabang pada rangkaian ini.',
    molecule: TETRAMETHYLBUTANE,
    name: '2,2,3,3-tetrametilbutana',
    category: 'alkana',
    categoryLabel: 'Alkana',
    extra: 'Dengan delapan karbon dan empat cabang metil, struktur ini merangkum seluruh aturan valensi dan penomoran yang telah dipelajari.',
  }),
  buildLevel({
    id: 51,
    zoneId: 'heavy-chain',
    title: 'Sembilan Karbon Lurus',
    focus: 'Rantai nonana',
    mission: 'Susun nonana: sembilan atom karbon dalam satu rantai lurus tanpa cabang.',
    molecule: NONANE,
    name: 'Nonana',
    category: 'alkana',
    categoryLabel: 'Alkana',
    extra: 'Nonana mengikuti rumus alkana CₙH₂ₙ₊₂: sembilan karbon mengikat 2 × 9 + 2 = 20 hidrogen.',
  }),
  nameLevel({
    id: 52,
    zoneId: 'heavy-chain',
    title: 'Nama Rantai Sembilan',
    focus: 'Tata nama nonana',
    mission: 'Arsip hanya menyisakan strukturnya. Susun nama IUPAC senyawa ini.',
    displayGraph: NONANE,
    answerName: 'nonana',
    tokens: ['non', '-ana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Sembilan karbon • hanya ikatan tunggal',
  }),
  formulaLevel({
    id: 53,
    zoneId: 'heavy-chain',
    title: 'Detektor C₉H₂₀',
    focus: 'Rumus alkana panjang',
    mission: 'Bentuk salah satu alkana rantai terbuka dengan rumus C₉H₂₀.',
    carbon: 9,
    hydrogen: 20,
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Sembilan karbon • alkana rantai terbuka',
    displayGraph: NONANE,
    explanation:
      'C₉H₂₀ dipenuhi oleh nonana dan seluruh isomernya. Yang dinilai adalah jumlah atom, seluruh ikatan tunggal, dan rantai terbuka — bukan bentuk gambarnya.',
    bonus: 'Alkana rantai terbuka selalu memakai CₙH₂ₙ₊₂.',
  }),
  buildLevel({
    id: 54,
    zoneId: 'heavy-chain',
    title: 'Rantai Terpanjang',
    focus: 'Rantai dekana',
    mission: 'Susun dekana, rantai lurus terpanjang yang dipelajari di laboratorium ini.',
    molecule: DEKANA,
    name: 'Dekana',
    category: 'alkana',
    categoryLabel: 'Alkana',
    extra: 'Dekana adalah alkana C₁₀H₂₂: sepuluh karbon mengikat 2 × 10 + 2 = 22 hidrogen.',
  }),
  nameLevel({
    id: 55,
    zoneId: 'heavy-chain',
    title: 'Sepuluh Karbon Tunggal',
    focus: 'Tata nama dekana',
    mission: 'Sepuluh karbon tersusun dalam satu rantai lurus. Tentukan namanya.',
    displayGraph: DEKANA,
    answerName: 'dekana',
    tokens: ['dek', '-ana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Sepuluh karbon • hanya ikatan tunggal',
  }),
  buildLevel({
    id: 56,
    zoneId: 'heavy-chain',
    title: 'Metil di Ujung Rantai',
    focus: 'Cabang pada nonana',
    mission: 'Bangun 2-metilnonana: induk sembilan karbon dengan satu cabang metil di posisi 2.',
    molecule: METHYLNONANE_2,
    name: '2-metilnonana',
    category: 'alkana',
    categoryLabel: 'Alkana',
    extra:
      'Meskipun totalnya sepuluh karbon, rantai terpanjangnya sembilan karbon — jadi senyawa ini turunan nonana, bukan dekana lurus.',
  }),
  nameLevel({
    id: 57,
    zoneId: 'heavy-chain',
    title: 'Cabang Posisi Tiga',
    focus: 'Penomoran cabang',
    mission: 'Pilih rantai induk terpanjang lebih dulu, lalu beri nomor dari ujung terdekat dengan cabang.',
    displayGraph: METHYLNONANE_3,
    answerName: '3-metilnonana',
    tokens: ['3', 'metil', 'non', '-ana'],
    altNames: ['3-metil-nonana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk sembilan karbon • satu cabang metil',
  }),
  comboLevel({
    id: 58,
    zoneId: 'heavy-chain',
    title: 'Metildekana Posisi Dua',
    focus: 'Struktur + nama C11',
    mission: 'Bangun 2-metildekana, lalu susun namanya dari token yang tersedia.',
    molecule: METHYLDEKANE_2,
    buildName: '2-metildekana',
    answerName: '2-metildekana',
    tokens: ['2', 'metil', 'dek', '-ana'],
    altNames: ['2-metil-dekana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk sepuluh karbon • cabang metil posisi 2',
  }),
  buildLevel({
    id: 59,
    zoneId: 'heavy-chain',
    title: 'Metildekana Posisi Tiga',
    focus: 'Cabang di tengah rantai',
    mission: 'Susun 3-metildekana: induk sepuluh karbon dengan cabang metil pada karbon ketiga.',
    molecule: METHYLDEKANE_3,
    name: '3-metildekana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  nameLevel({
    id: 60,
    zoneId: 'heavy-chain',
    title: 'Etil yang Menjebak',
    focus: 'Menentukan rantai induk',
    mission: 'Cabang etil tampak memanjangkan rantai. Temukan jalur terpanjang yang sah, lalu namai.',
    displayGraph: ETHYLOCTANE_3,
    answerName: '3-etiloktana',
    tokens: ['3', 'etil', 'okt', '-ana'],
    altNames: ['3-etil-oktana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk delapan karbon • cabang etil dua karbon',
  }),
  nameLevel({
    id: 61,
    zoneId: 'naming-forge',
    title: 'Dua Cabang Berdekatan',
    focus: 'Posisi berkelompok',
    mission: 'Dua cabang menempel pada karbon yang bersebelahan. Tulis kedua posisi dalam satu token.',
    displayGraph: DIMETHYLHEPTANE_23,
    answerName: '2,3-dimetilheptana',
    tokens: ['2,3', 'dimetil', 'hept', '-ana'],
    altNames: ['2,3-dimetil-heptana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk tujuh karbon • dua cabang metil',
  }),
  buildLevel({
    id: 62,
    zoneId: 'naming-forge',
    title: 'Cabang di Dua Ujung',
    focus: 'Simetri cabang',
    mission: 'Bangun 2,6-dimetiloktana dengan kedua cabang metil di ujung yang berlawanan.',
    molecule: DIMETHYLOCTANE_26,
    name: '2,6-dimetiloktana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  comboLevel({
    id: 63,
    zoneId: 'naming-forge',
    title: 'Tiga Cabang Sekaligus',
    focus: 'Struktur + nama bercabang',
    mission: 'Susun kerangka 2,3,4-trimetilheptana, lalu tuliskan namanya.',
    molecule: TRIMETHYLHEPTANE_234,
    buildName: '2,3,4-trimetilheptana',
    answerName: '2,3,4-trimetilheptana',
    tokens: ['2,3,4', 'trimetil', 'hept', '-ana'],
    altNames: ['2,3,4-trimetil-heptana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk tujuh karbon • tiga cabang metil',
  }),
  nameLevel({
    id: 64,
    zoneId: 'naming-forge',
    title: 'Dua Cabang Satu Karbon',
    focus: 'Urutan abjad substituen',
    mission: 'Dua cabang berbagi satu karbon induk. Sebutkan substituen sesuai urutan abjad.',
    displayGraph: ETHYLDIMETHYLHEXANE_33,
    answerName: '3-etil-3-metilheksana',
    tokens: ['3', 'etil', '3', 'metil', 'heks', '-ana'],
    altNames: ['3-etil-3-metil-heksana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk enam karbon • etil dan metil di posisi 3',
  }),
  buildLevel({
    id: 65,
    zoneId: 'naming-forge',
    title: 'Tiga dan Empat',
    focus: 'Cabang berdampingan',
    mission: 'Susun 3,4-dimetilheptana: dua cabang metil pada karbon yang berdampingan.',
    molecule: DIMETHYLHEPTANE_34,
    name: '3,4-dimetilheptana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  nameLevel({
    id: 66,
    zoneId: 'naming-forge',
    title: 'Rangkaian Posisi Terkecil',
    focus: 'First point of difference',
    mission: 'Bandingkan dua arah penomoran, lalu pilih rangkaian posisi yang lebih kecil.',
    displayGraph: TRIMETHYLHEXANE_235,
    answerName: '2,3,5-trimetilheksana',
    tokens: ['2,3,5', 'trimetil', 'heks', '-ana'],
    altNames: ['2,3,5-trimetil-heksana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk enam karbon • tiga cabang metil',
  }),
  comboLevel({
    id: 67,
    zoneId: 'naming-forge',
    title: 'Etil dan Metil Berbarengan',
    focus: 'Dua jenis cabang',
    mission: 'Bangun strukturnya lebih dulu, lalu urutkan substituen secara abjad.',
    molecule: ETHYLMETHYLOCTANE_35,
    buildName: '3-etil-5-metiloktana',
    answerName: '3-etil-5-metiloktana',
    tokens: ['3', 'etil', '5', 'metil', 'okt', '-ana'],
    altNames: ['3-etil-5-metil-oktana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk delapan karbon • satu etil dan satu metil',
  }),
  buildLevel({
    id: 68,
    zoneId: 'naming-forge',
    title: 'Dua Etil Bersebelahan',
    focus: 'Cabang etil ganda',
    mission: 'Bangun 3,4-dietilheptana: dua cabang etil pada karbon 3 dan 4.',
    molecule: DIETHYLHEPTANE_34,
    name: '3,4-dietilheptana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  nameLevel({
    id: 69,
    zoneId: 'naming-forge',
    title: 'Dua dan Lima',
    focus: 'Penomoran simetris',
    mission: 'Cabang tersebar simetris di sepanjang rantai. Tetap mulai penomoran dari ujung terdekat.',
    displayGraph: DIMETHYLHEPTANE_25,
    answerName: '2,5-dimetilheptana',
    tokens: ['2,5', 'dimetil', 'hept', '-ana'],
    altNames: ['2,5-dimetil-heptana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk tujuh karbon • metil di posisi 2 dan 5',
  }),
  comboLevel({
    id: 70,
    zoneId: 'naming-forge',
    title: 'Tiga dan Lima',
    focus: 'Struktur + nama C10',
    mission: 'Susun 3,5-dimetiloktana, lalu pasang namanya pada slot.',
    molecule: DIMETHYLOCTANE_35,
    buildName: '3,5-dimetiloktana',
    answerName: '3,5-dimetiloktana',
    tokens: ['3,5', 'dimetil', 'okt', '-ana'],
    altNames: ['3,5-dimetil-oktana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk delapan karbon • dua cabang metil',
  }),
  formulaLevel({
    id: 71,
    zoneId: 'isomer-lab',
    title: 'Berburu Isomer C₈H₁₈',
    focus: 'Isomer alkana',
    mission: 'Bentuk salah satu isomer C₈H₁₈ dengan kerangka bercabang.',
    carbon: 8,
    hydrogen: 18,
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Delapan karbon • kerangka bercabang',
    displayGraph: DIMETHYLHEXANE_23,
    requireBranched: true,
    explanation:
      'C₈H₁₈ memiliki banyak isomer: oktana lurus, metilheptana, sampai dimetilheksana. Semua sah selama valensi terpenuhi dan rantainya terbuka — misi ini hanya meminta kerangka yang bercabang.',
    bonus: 'Isomer = rumus molekul sama, susunan atom berbeda.',
  }),
  buildLevel({
    id: 72,
    zoneId: 'isomer-lab',
    title: 'Dimetilheksana',
    focus: 'Kerangka bercabang C8',
    mission: 'Bangun salah satu isomer C₈H₁₈: 2,3-dimetilheksana.',
    molecule: DIMETHYLHEXANE_23,
    name: '2,3-dimetilheksana',
    category: 'alkana',
    categoryLabel: 'Alkana',
    extra: 'Rantai induk diambil dari jalur terpanjang, bukan dari rantai yang tampak lurus di gambar.',
  }),
  nameLevel({
    id: 73,
    zoneId: 'isomer-lab',
    title: 'Isomer Nonana',
    focus: 'Bandingkan isomer',
    mission: 'Struktur ini salah satu isomer nonana: rumus sama, kerangka berbeda. Tentukan rantai induknya.',
    displayGraph: ETHYLHEPTANE_3,
    answerName: '3-etilheptana',
    tokens: ['3', 'etil', 'hept', '-ana'],
    altNames: ['3-etil-heptana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk tujuh karbon • cabang etil posisi 3',
  }),
  buildLevel({
    id: 74,
    zoneId: 'isomer-lab',
    title: 'Etil di Tengah',
    focus: 'Isomer dengan etil',
    mission: 'Susun 4-etilheptana, isomer C₉H₂₀ dengan cabang etil di tengah rantai.',
    molecule: ETHYLHEPTANE_4,
    name: '4-etilheptana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  nameLevel({
    id: 75,
    zoneId: 'isomer-lab',
    title: 'Empat Cabang Metil',
    focus: 'Pengali tetra',
    mission: 'Empat cabang metil menempel pada induk enam karbon. Kelompokkan seluruh posisinya.',
    displayGraph: TETRAMETHYLHEXANE_2345,
    answerName: '2,3,4,5-tetrametilheksana',
    tokens: ['2,3,4,5', 'tetrametil', 'heks', '-ana'],
    altNames: ['2,3,4,5-tetrametil-heksana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk enam karbon • empat cabang metil',
  }),
  buildLevel({
    id: 76,
    zoneId: 'isomer-lab',
    title: 'Sebelas Karbon',
    focus: 'Isomer C₁₁H₂₄',
    mission: 'Bangun 2,4-dimetilnonana: sebelas karbon dengan rantai induk sembilan.',
    molecule: DIMETHYLNONANE_24,
    name: '2,4-dimetilnonana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  nameLevel({
    id: 77,
    zoneId: 'isomer-lab',
    title: 'Isomer Lain C₁₁H₂₄',
    focus: 'Isomer dengan posisi berbeda',
    mission: 'Kedua cabang berada jauh di ujung. Rantai induknya tetap sembilan karbon.',
    displayGraph: DIMETHYLNONANE_26,
    answerName: '2,6-dimetilnonana',
    tokens: ['2,6', 'dimetil', 'non', '-ana'],
    altNames: ['2,6-dimetil-nonana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk sembilan karbon • metil di posisi 2 dan 6',
  }),
  formulaLevel({
    id: 78,
    zoneId: 'isomer-lab',
    title: 'Kerangka C₁₀H₂₂',
    focus: 'Isomer alkana panjang',
    mission: 'Bentuk alkana rantai terbuka C₁₀H₂₂ yang bercabang.',
    carbon: 10,
    hydrogen: 22,
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Sepuluh karbon • minimal satu cabang',
    displayGraph: TRIMETHYLHEPTANE_223,
    requireBranched: true,
    explanation:
      'C₁₀H₂₂ memenuhi CₙH₂ₙ₊₂ untuk n = 10. Banyak kerangka bercabang sah, misalnya 2,2,3-trimetilheptana — selama sepuluh karbon tersatu, terbuka, dan bercabang.',
    bonus: 'Rumus CₙH₂ₙ₊₂ berlaku untuk alkana lurus maupun bercabang.',
  }),
  comboLevel({
    id: 79,
    zoneId: 'isomer-lab',
    title: 'Selang Satu Karbon',
    focus: 'Struktur + nama isomer',
    mission: 'Susun 2,4,6-trimetiloktana, lalu tulis namanya dengan posisi berkelompok.',
    molecule: TRIMETHYLOCTANE_246,
    buildName: '2,4,6-trimetiloktana',
    answerName: '2,4,6-trimetiloktana',
    tokens: ['2,4,6', 'trimetil', 'okt', '-ana'],
    altNames: ['2,4,6-trimetil-oktana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk delapan karbon • tiga cabang metil berselang-seling',
  }),
  nameLevel({
    id: 80,
    zoneId: 'isomer-lab',
    title: 'Dua Cabang di Karbon Sama',
    focus: 'Mengulang satu posisi',
    mission: 'Dua cabang menempel pada karbon yang sama. Tetap tulis posisinya untuk setiap substituen.',
    displayGraph: DIMETHYLOCTANE_22,
    answerName: '2,2-dimetiloktana',
    tokens: ['2,2', 'dimetil', 'okt', '-ana'],
    altNames: ['2,2-dimetil-oktana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk delapan karbon • dua metil di posisi 2',
  }),
  buildLevel({
    id: 81,
    zoneId: 'bond-spectrum',
    title: 'Nonena Rangkap Dua',
    focus: 'Alkena rantai panjang',
    mission: 'Bangun 2-nonena: rantai sembilan karbon dengan ikatan rangkap dua mulai karbon 2.',
    molecule: NONEN_2,
    name: '2-nonena',
    category: 'alkena',
    categoryLabel: 'Alkena',
    extra: 'Alkena rantai terbuka dengan satu ikatan rangkap dua memakai CₙH₂ₙ, sehingga nonena mengikat 18 hidrogen.',
  }),
  nameLevel({
    id: 82,
    zoneId: 'bond-spectrum',
    title: 'Posisi Ikatan Rangkap',
    focus: 'Penomoran alkena',
    mission: 'Nomor rantai dari ujung yang paling dekat dengan ikatan rangkap dua.',
    displayGraph: NONEN_4,
    answerName: '4-nonena',
    tokens: ['4', 'non', '-ena'],
    altNames: ['non-4-ena'],
    category: 'alkena',
    categoryLabel: 'Alkena',
    clue: 'Sembilan karbon • ikatan rangkap dua posisi 4',
  }),
  buildLevel({
    id: 83,
    zoneId: 'bond-spectrum',
    title: 'Dekena',
    focus: 'Alkena sepuluh karbon',
    mission: 'Susun 3-dekena, alkena sepuluh karbon dengan ikatan rangkap dua pada posisi 3.',
    molecule: DEKEN_3,
    name: '3-dekena',
    category: 'alkena',
    categoryLabel: 'Alkena',
  }),
  formulaLevel({
    id: 84,
    zoneId: 'bond-spectrum',
    title: 'Rumus C₁₀H₂₀',
    focus: 'Alkena rantai terbuka',
    mission: 'Bentuk salah satu alkena rantai terbuka dengan rumus C₁₀H₂₀.',
    carbon: 10,
    hydrogen: 20,
    category: 'alkena',
    categoryLabel: 'Alkena',
    clue: 'Sepuluh karbon • satu ikatan rangkap dua',
    displayGraph: DEKEN_5,
    explanation:
      'C₁₀H₂₀ menuntut tepat satu ikatan rangkap dua dan rantai terbuka. 3-dekena, 5-dekena, serta kerangka bercabang sama-sama sah.',
    bonus: 'Alkena dengan satu C=C: CₙH₂ₙ.',
  }),
  nameLevel({
    id: 85,
    zoneId: 'bond-spectrum',
    title: 'Tepat di Tengah',
    focus: 'Ikatan rangkap simetris',
    mission: 'Ikatan rangkap dua berada di tengah rantai. Posisi terkecil yang mungkin tetap tercatat.',
    displayGraph: DEKEN_5,
    answerName: '5-dekena',
    tokens: ['5', 'dek', '-ena'],
    altNames: ['dek-5-ena'],
    category: 'alkena',
    categoryLabel: 'Alkena',
    clue: 'Sepuluh karbon • ikatan rangkap dua posisi 5',
  }),
  buildLevel({
    id: 86,
    zoneId: 'bond-spectrum',
    title: 'Nonena Rangkap Tiga',
    focus: 'Alkuna rantai panjang',
    mission: 'Bangun 2-nonuna: alkuna sembilan karbon dengan ikatan rangkap tiga pada posisi 2.',
    molecule: NONUN_2,
    name: '2-nonuna',
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    extra: 'Alkuna dengan satu ikatan rangkap tiga mengikuti CₙH₂ₙ₋₂: sembilan karbon mengikat 16 hidrogen.',
  }),
  comboLevel({
    id: 87,
    zoneId: 'bond-spectrum',
    title: 'Ujung Rantai Aktif',
    focus: 'Struktur + nama alkuna',
    mission: 'Bangun 1-dekuna, alkuna sepuluh karbon dengan ikatan rangkap tiga di ujung, lalu susun namanya.',
    molecule: DEKUN_1,
    buildName: '1-dekuna',
    answerName: '1-dekuna',
    tokens: ['1', 'dek', '-una'],
    altNames: ['dek-1-una'],
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    clue: 'Sepuluh karbon • ikatan rangkap tiga posisi 1',
  }),
  nameLevel({
    id: 88,
    zoneId: 'bond-spectrum',
    title: 'Dekuna Posisi Tiga',
    focus: 'Tata nama alkuna',
    mission: 'Tentukan posisi ikatan rangkap tiga dari ujung terdekat, lalu pasang tokennya.',
    displayGraph: DEKUN_3,
    answerName: '3-dekuna',
    tokens: ['3', 'dek', '-una'],
    altNames: ['dek-3-una'],
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    clue: 'Sepuluh karbon • ikatan rangkap tiga posisi 3',
  }),
  buildLevel({
    id: 89,
    zoneId: 'bond-spectrum',
    title: 'Cabang pada Alkena',
    focus: 'Alkena bercabang',
    mission: 'Bangun 4-metil-2-heptena: induk tujuh karbon, ikatan rangkap dua di posisi 2, cabang metil di posisi 4.',
    molecule: METHYLHEPTENE_4,
    name: '4-metil-2-heptena',
    category: 'alkena',
    categoryLabel: 'Alkena',
  }),
  nameLevel({
    id: 90,
    zoneId: 'bond-spectrum',
    title: 'Induk Wajib Memuat Rangkap Tiga',
    focus: 'Alkuna bercabang',
    mission: 'Rantai induk harus memuat ikatan rangkap tiga, walau jalur lain terlihat lebih panjang.',
    displayGraph: METHYLHEPTYNE_4,
    answerName: '4-metil-1-heptuna',
    tokens: ['4', 'metil', '1', 'hept', '-una'],
    altNames: ['4-metil-hept-1-una'],
    category: 'alkuna',
    categoryLabel: 'Alkuna',
    clue: 'Tujuh karbon pada induk • rangkap tiga di ujung',
  }),
  comboLevel({
    id: 91,
    zoneId: 'master-archive',
    title: 'Cabang di Tengah Nonana',
    focus: 'Bangun lalu namai',
    mission: 'Bangun 4-metilnonana dari sembilan karbon induk, lalu susun namanya.',
    molecule: METHYLNONANE_4,
    buildName: '4-metilnonana',
    answerName: '4-metilnonana',
    tokens: ['4', 'metil', 'non', '-ana'],
    altNames: ['4-metil-nonana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk sembilan karbon • satu cabang metil di tengah',
  }),
  nameLevel({
    id: 92,
    zoneId: 'master-archive',
    title: 'Sepuluh Karbon, Induk Delapan',
    focus: 'Rantai induk vs total karbon',
    mission: 'Total sepuluh karbon, tetapi rantai induk hanya delapan. Jelaskan lewat nama.',
    displayGraph: ETHYLOCTANE_4,
    answerName: '4-etiloktana',
    tokens: ['4', 'etil', 'okt', '-ana'],
    altNames: ['4-etil-oktana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk delapan karbon • cabang etil posisi 4',
  }),
  nameLevel({
    id: 93,
    zoneId: 'master-archive',
    title: 'Koreksi Label Arsip',
    focus: 'Nama yang salah tulis',
    mission: 'Label arsip tertulis \u201c2-etilnonana\u201d. Periksa ulang rantai terpanjang, lalu koreksi namanya.',
    displayGraph: ETHYLNONANE_2,
    answerName: '3-metildekana',
    tokens: ['3', 'metil', 'dek', '-ana'],
    altNames: ['3-metil-dekana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Cabang di posisi dua membuat rantai induk ikut memanjang',
    extra: 'Nama \u201c2-etilnonana\u201d menyalahi aturan: jalur terpanjang pada kerangka ini mencapai sepuluh karbon, sehingga senyawa tersebut adalah 3-metildekana.',
  }),
  buildLevel({
    id: 94,
    zoneId: 'master-archive',
    title: 'Cabang Kembar di Ujung',
    focus: 'Dua cabang satu posisi',
    mission: 'Susun 2,2-dimetilnonana: sebelas karbon dengan dua cabang metil pada karbon yang sama.',
    molecule: DIMETHYLNONANE_22,
    name: '2,2-dimetilnonana',
    category: 'alkana',
    categoryLabel: 'Alkana',
  }),
  nameLevel({
    id: 95,
    zoneId: 'master-archive',
    title: 'Cabang Banyak pada C12',
    focus: 'Rangkaian posisi lengkap',
    mission: 'Tiga cabang pada induk sembilan karbon. Urutkan posisi dari terkecil dan pakai pengali yang tepat.',
    displayGraph: TRIMETHYLNONANE_235,
    answerName: '2,3,5-trimetilnonana',
    tokens: ['2,3,5', 'trimetil', 'non', '-ana'],
    altNames: ['2,3,5-trimetil-nonana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk sembilan karbon • tiga cabang metil',
  }),
  formulaLevel({
    id: 96,
    zoneId: 'master-archive',
    title: 'Batas Rumus C₁₁H₂₄',
    focus: 'Alkana di atas dekana',
    mission: 'Bentuk alkana rantai terbuka C₁₁H₂₄ dengan paling sedikit satu cabang.',
    carbon: 11,
    hydrogen: 24,
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Sebelas karbon • kerangka bercabang',
    displayGraph: ETHYLMETHYLOCTANE_42,
    requireBranched: true,
    explanation:
      'C₁₁H₂₄ tetap memenuhi CₙH₂ₙ₊₂ (n = 11). Kerangka bercabang seperti 4-etil-2-metiloktana sama sahnya dengan undekana lurus — yang diminta di sini yang bercabang.',
    bonus: 'Pola rumus tidak berhenti di dekana: setiap alkana rantai terbuka memakai CₙH₂ₙ₊₂.',
  }),
  comboLevel({
    id: 97,
    zoneId: 'master-archive',
    title: 'Ikatan di Posisi Tiga',
    focus: 'Alkena C9 + nama',
    mission: 'Bangun 3-nonena, lalu namai dengan posisi ikatan rangkap dua dari ujung terdekat.',
    molecule: NONEN_3,
    buildName: '3-nonena',
    answerName: '3-nonena',
    tokens: ['3', 'non', '-ena'],
    altNames: ['non-3-ena'],
    category: 'alkena',
    categoryLabel: 'Alkena',
    clue: 'Sembilan karbon • ikatan rangkap dua posisi 3',
  }),
  nameLevel({
    id: 98,
    zoneId: 'master-archive',
    title: 'Cabang di Karbon Rangkap Dua',
    focus: 'Nama alkena bercabang',
    mission: 'Temukan jalur terpanjang yang memuat C=C, lalu susun nama lengkapnya.',
    displayGraph: METHYLNONENE_2,
    answerName: '2-metil-1-nonena',
    tokens: ['2', 'metil', '1', 'non', '-ena'],
    altNames: ['2-metil-non-1-ena'],
    category: 'alkena',
    categoryLabel: 'Alkena',
    clue: 'Induk sembilan karbon • rangkap dua di ujung • metil posisi 2',
  }),
  buildLevel({
    id: 99,
    zoneId: 'master-archive',
    title: 'Dekuna Tengah',
    focus: 'Alkuna sepuluh karbon',
    mission: 'Susun 4-dekuna: ikatan rangkap tiga tepat di tengah rantai sepuluh karbon.',
    molecule: DEKUN_4,
    name: '4-dekuna',
    category: 'alkuna',
    categoryLabel: 'Alkuna',
  }),
  comboLevel({
    id: 100,
    zoneId: 'master-archive',
    title: 'Arsip Terakhir',
    focus: 'Tantangan gabungan',
    mission: 'Bangun kerangka dua cabang etil ini, lalu susun nama lengkapnya dari token.',
    molecule: DIETHYLHEPTANE_35,
    buildName: '3,5-dietilheptana',
    answerName: '3,5-dietilheptana',
    tokens: ['3,5', 'dietil', 'hept', '-ana'],
    altNames: ['3,5-dietil-heptana'],
    category: 'alkana',
    categoryLabel: 'Alkana',
    clue: 'Induk tujuh karbon • dua cabang etil',
    extra: 'Seluruh aturan bertemu di sini: rantai terpanjang, penomoran terkecil, pengali, dan urutan abjad substituen.',
  }),
];

LEVELS.forEach((level) => {
  level.difficulty = difficultyFor(level.id);
  level.difficultyLabel = DIFFICULTY_LABELS[level.difficulty - 1];
});

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
