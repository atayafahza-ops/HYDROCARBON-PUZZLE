import { analyzeMolecule, areGraphsIsomorphic } from './graph.js';
import { formulaHTML } from './formula.js';
import {
  formatNameTokens,
  normalizeName,
  tokenType,
  validateTokenOrder,
} from './nomenclature.js';

const CATEGORY_LABEL = {
  alkana: 'alkana',
  alkena: 'alkena',
  alkuna: 'alkuna',
};

function fail(step, title, message, analysis, extra = {}) {
  return {
    ok: false,
    step,
    title,
    message,
    analysis,
    highlight: [],
    ...extra,
  };
}

export function validateBuild(level, molecule) {
  const rule = level.validation ?? {};
  const analysis = analyzeMolecule(molecule);

  if (analysis.carbonCount === 0) {
    return fail(
      'empty',
      'Grid masih kosong',
      'Tambahkan atom karbon terlebih dahulu, lalu hubungkan sesuai target.',
      analysis,
    );
  }

  if (!analysis.connected) {
    return fail(
      'connectivity',
      'Molekul belum terhubung',
      'Hubungkan semua atom C menjadi satu molekul. Tidak boleh ada atom yang terpisah.',
      analysis,
      { highlight: analysis.disconnectedAtoms },
    );
  }

  if (analysis.invalidValence) {
    return fail(
      'valence',
      'Valensi karbon terlampaui',
      'Total orde ikatan pada satu karbon tidak boleh melebihi 4. Kurangi salah satu ikatan yang ditandai.',
      analysis,
      { highlight: analysis.overValentAtoms },
    );
  }

  const targetCarbon =
    rule.carbonCount ?? (rule.graph ? rule.graph.nodes.length : null);

  if (targetCarbon !== null && analysis.carbonCount !== targetCarbon) {
    return fail(
      'carbon-count',
      'Jumlah karbon belum tepat',
      `Target membutuhkan ${targetCarbon} atom C, sedangkan struktumu memiliki ${analysis.carbonCount}.`,
      analysis,
    );
  }

  if (rule.formula && analysis.formula !== rule.formula) {
    return fail(
      'formula',
      'Rumus molekul belum cocok',
      `Rumus target belum terpenuhi. Periksa jumlah karbon dan jenis ikatan.`,
      analysis,
    );
  }

  if (!analysis.acyclic && rule.requireAcyclic !== false) {
    return fail(
      'cycle',
      'Struktur siklik terdeteksi',
      'Misi ini memakai hidrokarbon rantai terbuka. Lepaskan satu ikatan agar tidak membentuk lingkaran.',
      analysis,
    );
  }

  if (rule.category && analysis.category !== rule.category) {
    return fail(
      'category',
      'Jenis senyawa belum sesuai',
      `Target adalah ${CATEGORY_LABEL[rule.category] ?? rule.category}. Periksa jenis ikatan pada struktur.`,
      analysis,
    );
  }

  if (rule.graph && !areGraphsIsomorphic(molecule, rule.graph)) {
    const targetAnalysis = analyzeMolecule(rule.graph);
    const targetName = level.result?.name ?? 'struktur target';
    let detail = `Kerangka karbon belum cocok dengan ${targetName}. Periksa panjang rantai utama dan posisi cabang.`;

    if (targetAnalysis.branchPoints.length > analysis.branchPoints.length) {
      detail = `Kerangka belum memiliki cabang yang diminta. Struktur ${targetName} memiliki percabangan pada rantai karbonnya.`;
    } else if (targetAnalysis.branchPoints.length < analysis.branchPoints.length) {
      detail = `Ada cabang berlebih. Struktur ${targetName} tidak memerlukan percabangan sebanyak itu.`;
    }

    return fail('graph', 'Kerangka belum cocok', detail, analysis);
  }

  const formula = formulaHTML(analysis.carbonCount, analysis.hydrogenCount);
  return {
    ok: true,
    step: 'success',
    title: 'Struktur valid',
    message: `Struktur memenuhi aturan kimia dan target misi (${formula.replace(/<[^>]+>/g, '')}).`,
    analysis,
    highlight: [],
  };
}

function missingNameFeedback(tokens, puzzle) {
  const types = tokens.filter(Boolean).map((token) => tokenType(token));
  const expected = puzzle.expectedTokens;
  const expectedTypes = expected.map((token) => tokenType(token));

  if (!types.includes('suffix')) {
    return 'Tambahkan akhiran yang sesuai: -ana, -ena, atau -una.';
  }
  if (!types.includes('stem')) {
    return 'Tambahkan potongan rantai induk berdasarkan jumlah atom C pada rantai terpanjang.';
  }
  if (!validateTokenOrder(tokens)) {
    return 'Urutan nama: posisi, substituen, rantai induk, lalu akhiran.';
  }

  const suffixIndex = expectedTypes.indexOf('suffix');
  const suffix = tokens.find((token) => tokenType(token) === 'suffix');
  if (suffix && expected[suffixIndex] && suffix !== expected[suffixIndex]) {
    return puzzle.suffixFeedback
      ?? 'Akhiran belum sesuai dengan jenis ikatan pada struktur.';
  }

  const stem = tokens.find((token) => tokenType(token) === 'stem');
  const expectedStem = expected.find((token) => tokenType(token) === 'stem');
  if (stem && expectedStem && stem !== expectedStem) {
    return puzzle.stemFeedback
      ?? 'Rantai induk belum tepat. Hitung atom C pada rantai terpanjang yang memuat ikatan rangkap.';
  }

  const locants = tokens.filter((token) => tokenType(token) === 'locant');
  const expectedLocants = expected.filter((token) => tokenType(token) === 'locant');
  if (locants.join(',') !== expectedLocants.join(',')) {
    return puzzle.locantFeedback
      ?? 'Nomor posisi belum tepat. Mulai penomoran dari ujung yang paling dekat dengan cabang atau ikatan rangkap.';
  }

  const substituents = tokens.filter((token) => tokenType(token) === 'substituent');
  const expectedSubstituents = expected.filter((token) => tokenType(token) === 'substituent');
  if (substituents.join(',') !== expectedSubstituents.join(',')) {
    return puzzle.substituentFeedback
      ?? 'Nama substituen belum tepat. Perhatikan atom cabang yang menempel pada rantai utama.';
  }

  return 'Susunan nama belum tepat. Periksa kembali aturan penomoran dan bagian-bagian nama.';
}

export function validateName(tokens, puzzle) {
  const incomplete = tokens.some((token) => !token);
  if (incomplete) {
    return {
      ok: false,
      step: 'incomplete',
      title: 'Nama belum lengkap',
      message: 'Isi semua slot nama terlebih dahulu sebelum memeriksa jawaban.',
      builtName: formatNameTokens(tokens),
    };
  }

  if (!validateTokenOrder(tokens)) {
    return {
      ok: false,
      step: 'order',
      title: 'Urutan nama belum tepat',
      message: 'Susun nama mulai dari posisi, substituen, rantai induk, lalu akhiran.',
      builtName: formatNameTokens(tokens),
    };
  }

  const builtName = formatNameTokens(tokens);
  const normalized = normalizeName(builtName);
  const acceptedNames = [puzzle.answerName, ...(puzzle.altNames ?? [])].map(normalizeName);

  if (acceptedNames.includes(normalized)) {
    return {
      ok: true,
      step: 'success',
      title: 'Nama benar',
      message: `${builtName} adalah nama yang sesuai dengan aturan tata nama.`,
      builtName,
    };
  }

  return {
    ok: false,
    step: 'name',
    title: 'Nama belum tepat',
    message: missingNameFeedback(tokens, puzzle),
    builtName,
  };
}
