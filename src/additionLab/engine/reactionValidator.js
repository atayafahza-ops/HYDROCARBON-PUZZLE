import {
  analyzeMolecule,
  areGraphsIsomorphic,
  elementOf,
} from '../../chemistry/graph.js';
import { identifyMolecule, getMolecule } from '../data/molecules.js';

function countsEqual(a, b) {
  const elements = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const element of elements) {
    if ((a[element] ?? 0) !== (b[element] ?? 0)) return false;
  }
  return true;
}

export function validateProduct(graph, expectedCounts, targetGraph) {
  const layers = [];
  const analysis = analyzeMolecule(graph);

  if (!graph.nodes.length) {
    return {
      valid: false,
      layers: [{ id: 'empty', label: 'Struktur', ok: false, message: 'Kanvas masih kosong. Bangun produk terlebih dahulu.' }],
      analysis,
      structureFailures: 1,
      valenceErrors: 0,
    };
  }
  layers.push({ id: 'empty', label: 'Struktur', ok: true, message: 'Molekul terdeteksi.' });

  if (!analysis.connected) {
    layers.push({
      id: 'connectivity',
      label: 'Konektivitas',
      ok: false,
      message: 'Produk harus satu molekul terhubung. Sambungkan semua atom dengan ikatan.',
    });
    return { valid: false, layers, analysis, structureFailures: 1, valenceErrors: 0 };
  }
  layers.push({ id: 'connectivity', label: 'Konektivitas', ok: true, message: 'Satu molekul utuh.' });

  if (analysis.invalidValence) {
    layers.push({
      id: 'valence',
      label: 'Valensi',
      ok: false,
      message: 'Ada atom dengan ikatan melebihi valensinya. Periksa atom yang ditandai merah.',
    });
    return {
      valid: false,
      layers,
      analysis,
      structureFailures: 0,
      valenceErrors: analysis.overValentAtoms.length + analysis.invalidAtoms.length,
    };
  }
  layers.push({ id: 'valence', label: 'Valensi', ok: true, message: 'Semua atom memenuhi valensi.' });

  if (!countsEqual(analysis.elementCounts, expectedCounts)) {
    const missing = [];
    for (const [element, amount] of Object.entries(expectedCounts)) {
      const actual = analysis.elementCounts[element] ?? 0;
      if (actual < amount) missing.push(`${amount - actual} ${element}`);
    }
    const extra = [];
    for (const [element, amount] of Object.entries(analysis.elementCounts)) {
      const expected = expectedCounts[element] ?? 0;
      if (amount > expected) extra.push(`${amount - expected} ${element}`);
    }
    const parts = [];
    if (missing.length) parts.push(`kurang ${missing.join(', ')}`);
    if (extra.length) parts.push(`berlebih ${extra.join(', ')}`);
    layers.push({
      id: 'atom-balance',
      label: 'Neraca atom',
      ok: false,
      message: `Jumlah atom tidak sesuai reaksi (${parts.join('; ')}). Pastikan semua atom reagen masuk ke produk.`,
    });
    return { valid: false, layers, analysis, structureFailures: 1, valenceErrors: 0 };
  }
  layers.push({ id: 'atom-balance', label: 'Neraca atom', ok: true, message: 'Jumlah atom sesuai dengan reaktan + reagen.' });

  const matches = areGraphsIsomorphic(graph, targetGraph);
  if (!matches) {
    const identified = identifyMolecule(graph);
    const target = identifyMolecule(targetGraph);
    const hint = identified
      ? `Struktur yang kamu bangun adalah ${identified.name}, bukan ${target?.name ?? 'produk target'}. Periksa posisi gugus dan orde ikatan.`
      : 'Konektivitas atau orde ikatan belum sesuai produk target. Periksa posisi gugus (Markovnikov) dan jenis ikatan.';
    layers.push({
      id: 'identity',
      label: 'Identitas produk',
      ok: false,
      message: hint,
    });
    return { valid: false, layers, analysis, structureFailures: 1, valenceErrors: 0 };
  }
  layers.push({ id: 'identity', label: 'Identitas produk', ok: true, message: 'Struktur cocok dengan produk target.' });

  return { valid: true, layers, analysis, structureFailures: 0, valenceErrors: 0 };
}

export function scoreExperiment({
  reagentCorrect,
  conditionsCorrect,
  hasConditionControls,
  structureFailures,
  valenceErrors,
  hintsUsed,
}) {
  const reagent = reagentCorrect ? 20 : 12;
  const conditions = hasConditionControls ? (conditionsCorrect ? 15 : 8) : 15;
  const structure = Math.max(10, 40 - 10 * structureFailures);
  const formula = Math.max(5, 15 - 4 * valenceErrors);
  const understanding = hintsUsed <= 0 ? 10 : hintsUsed === 1 ? 6 : hintsUsed === 2 ? 2 : 0;
  const total = reagent + conditions + structure + formula + understanding;
  const stars = total >= 90 ? 3 : total >= 70 ? 2 : 1;
  return {
    breakdown: { reagent, conditions, structure, formula, understanding },
    total,
    stars,
  };
}

export function experimentXp(difficulty, stars, hintsUsed) {
  const base = { 1: 80, 2: 100, 3: 120 }[difficulty] ?? 80;
  return base + stars * 20 + (hintsUsed === 0 ? 25 : 0);
}