import {
  analyzeMolecule,
  areGraphsIsomorphic,
  elementOf,
  findEdge,
} from '../../chemistry/graph.js';
import { hasEnolDoubleBond } from './reactionMatcher.js';
import { identifyMolecule } from '../data/molecules.js';

// GDD v1.1 §7: sembilan kode galat lintas 7 lapis validasi.
export const ERROR_CODES = {
  WRONG_REAGENT: 'Reagen tidak sesuai dengan substrate/kondisi',
  WRONG_CONDITION: 'Kondisi reaksi (katalis/peroksida) tidak sesuai',
  WRONG_EQUIVALENT: 'Jumlah ekuivalen tidak sesuai',
  WRONG_REGIOISOMER: 'Regioisomer keliru — gugus menempel pada karbon yang salah',
  WRONG_BOND_ORDER: 'Perubahan ikatan belum sesuai',
  INVALID_VALENCE: 'Ada atom melanggar kaidah valensi',
  UNBALANCED_ATOMS: 'Jumlah atom tidak seimbang dengan reaktan + reagen',
  WRONG_CONNECTIVITY: 'Kerangka karbon / konektivitas tidak sesuai produk',
  WRONG_STEREOCHEMISTRY: 'Stereokimia belum dinilai dengan benar',
};

function countsEqual(a, b) {
  const elements = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const element of elements) {
    if ((a[element] ?? 0) !== (b[element] ?? 0)) return false;
  }
  return true;
}

function flattenOrders(graph) {
  return {
    nodes: graph.nodes.map((node) => ({ ...node })),
    edges: graph.edges.map((edge) => ({ ...edge, order: 1 })),
  };
}

function carbonSkeleton(graph) {
  const carbons = graph.nodes.filter((node) => elementOf(node) === 'C');
  const ids = new Set(carbons.map((node) => node.id));
  return {
    nodes: carbons.map((node) => ({ ...node })),
    edges: graph.edges
      .filter((edge) => ids.has(edge.a) && ids.has(edge.b))
      .map((edge) => ({ a: edge.a, b: edge.b, order: 1 })),
  };
}

function describeImbalance(actual, expected) {
  const missing = [];
  for (const [element, amount] of Object.entries(expected)) {
    const current = actual[element] ?? 0;
    if (current < amount) missing.push(`${amount - current} ${element}`);
  }
  const extra = [];
  for (const [element, amount] of Object.entries(actual)) {
    const expectedAmount = expected[element] ?? 0;
    if (amount > expectedAmount) extra.push(`${amount - expectedAmount} ${element}`);
  }
  const parts = [];
  if (missing.length) parts.push(`kurang ${missing.join(', ')}`);
  if (extra.length) parts.push(`berlebih ${extra.join(', ')}`);
  return parts.join('; ');
}

// GDD v1.1 §7 — 7 lapis validasi produk reaksi:
// 1 neraca atom, 2 valensi, 3 perubahan ikatan, 4 aturan reaksi,
// 5 regioselektivitas, 6 identitas produk, 7 stereokimia (hanya informatif).
export function validateProduct({
  builtGraph,
  expectedGraph,
  expectedCounts,
  rule,
  reactiveBond,
  stageEnol = false,
}) {
  const layers = [];
  const analysis = analyzeMolecule(builtGraph);
  let structureFailures = 0;
  let valenceErrors = 0;
  let firstCode = null;

  const fail = (layer, code) => {
    if (!firstCode) firstCode = code;
    structureFailures += 1;
    layers.push(layer);
    return {
      valid: false,
      layers,
      analysis,
      structureFailures,
      valenceErrors,
      code: firstCode,
      identifiedName: identifyMolecule(builtGraph)?.name ?? null,
    };
  };

  if (!builtGraph.nodes.length) {
    return fail({
      id: 'empty', label: 'Struktur', code: 'WRONG_CONNECTIVITY', ok: false,
      message: 'Kanvas masih kosong. Bangun produk terlebih dahulu.',
    }, 'WRONG_CONNECTIVITY');
  }
  layers.push({ id: 'empty', label: 'Struktur', ok: true, message: 'Molekul terdeteksi.' });

  // Lapis 1 — neraca atom.
  if (!countsEqual(analysis.elementCounts, expectedCounts)) {
    return fail({
      id: 'atom-balance', label: 'Neraca atom', code: 'UNBALANCED_ATOMS', ok: false,
      message: `Jumlah atom tidak sesuai reaksi (${describeImbalance(analysis.elementCounts, expectedCounts)}). Pastikan seluruh atom reagen masuk ke produk.`,
    }, 'UNBALANCED_ATOMS');
  }
  layers.push({ id: 'atom-balance', label: 'Neraca atom', ok: true, message: 'Jumlah atom sesuai reaktan + reagen.' });

  // Lapis 2 — valensi.
  if (analysis.invalidValence) {
    valenceErrors = analysis.overValentAtoms.length + analysis.invalidAtoms.length;
    return fail({
      id: 'valence', label: 'Valensi', code: 'INVALID_VALENCE', ok: false,
      message: 'Ada atom dengan ikatan melebihi valensinya. Periksa atom yang ditandai merah.',
    }, 'INVALID_VALENCE');
  }
  layers.push({ id: 'valence', label: 'Valensi', ok: true, message: 'Semua atom memenuhi kaidah valensi.' });

  // Lapis 3 — perubahan ikatan pada ikatan reaktif.
  if (reactiveBond && rule) {
    const builtEdge = findEdge(builtGraph, reactiveBond.a, reactiveBond.b);
    const expectedEdge = findEdge(expectedGraph, reactiveBond.a, reactiveBond.b);
    if (builtEdge && expectedEdge && builtEdge.order !== expectedEdge.order) {
      const tautomerMessage = rule.tautomerize && !stageEnol && hasEnolDoubleBond(builtGraph);
      return fail({
        id: 'bond-change', label: 'Perubahan ikatan', code: 'WRONG_BOND_ORDER', ok: false,
        message: tautomerMessage
          ? 'Enol yang kamu bangun belum bertautomerisasi menjadi karbonil: ubah C=C menjadi C–C dan C–OH menjadi C=O.'
          : 'Perubahan ikatan belum sesuai target — periksa ikatan rangkap yang harus berubah tingkatannya.',
      }, 'WRONG_BOND_ORDER');
    }
  }
  layers.push({ id: 'bond-change', label: 'Perubahan ikatan', ok: true, message: 'Ikatan reaktif berubah sesuai target.' });

  // Lapis 4 — aturan reaksi (sudah dicocokkan matcher sebelum reaksi berjalan).
  layers.push({
    id: 'reaction-rule', label: 'Aturan reaksi', ok: true,
    message: rule ? `Aturan "${rule.label}" berlaku.` : 'Aturan reaksi sesuai.',
  });

  const identityMatch = areGraphsIsomorphic(builtGraph, expectedGraph);

  // Lapis 5 — regioselektivitas (dinilai dari klasifikasi kegagalan identitas).
  if (identityMatch) {
    layers.push({
      id: 'regioselectivity', label: 'Regioselektivitas', ok: true,
      message: rule?.orientation
        ? `Orientasi ${rule.orientation === 'anti-markovnikov' ? 'anti-Markovnikov' : 'Markovnikov'} tercapai.`
        : 'Reaksi simetris — orientasi tidak berlaku.',
    });
  } else {
    const flatMatch = areGraphsIsomorphic(flattenOrders(builtGraph), flattenOrders(expectedGraph));
    const skeletonMatch = areGraphsIsomorphic(carbonSkeleton(builtGraph), carbonSkeleton(expectedGraph));
    if (flatMatch) {
      return fail({
        id: 'regioselectivity', label: 'Regioselektivitas', code: 'WRONG_BOND_ORDER', ok: false,
        message: 'Posisi gugus sudah benar, tetapi orde ikatan belum sesuai produk target.',
      }, 'WRONG_BOND_ORDER');
    }
    if (skeletonMatch) {
      const builtName = identifyMolecule(builtGraph)?.name;
      return fail({
        id: 'regioselectivity', label: 'Regioselektivitas', code: 'WRONG_REGIOISOMER', ok: false,
        message: builtName
          ? `Strukturmu adalah ${builtName} — gugus menempel pada karbon yang salah. Terapkan orientasi yang diajarkan (Markovnikov/anti-Markovnikov).`
          : 'Gugus menempel pada karbon yang salah. Terapkan orientasi yang diajarkan (Markovnikov/anti-Markovnikov).',
      }, 'WRONG_REGIOISOMER');
    }
    layers.push({ id: 'regioselectivity', label: 'Regioselektivitas', ok: true, message: 'Belum dapat dinilai karena konektivitas berbeda.' });

    // Lapis 6 — identitas produk.
    return fail({
      id: 'identity', label: 'Identitas produk', code: 'WRONG_CONNECTIVITY', ok: false,
      message: 'Kerangka karbon / konektivitas tidak sesuai produk target. Periksa susunan atom dan ikatan C–C.',
    }, 'WRONG_CONNECTIVITY');
  }

  // Lapis 6 — identitas produk.
  layers.push({ id: 'identity', label: 'Identitas produk', ok: true, message: 'Struktur cocok dengan produk target.' });

  // Lapis 7 — stereokimia: hanya informatif pada MVP (GDD §7, §13.4).
  if (rule?.stereo) {
    layers.push({
      id: 'stereo', label: 'Stereokimia', ok: true,
      message: `Catatan stereokimia: produk ${rule.stereo}. Model 2D tidak menilai geometri — penilaian dilakukan pada tahap tersendiri bila diajarkan.`,
    });
  }

  return { valid: true, layers, analysis, structureFailures: 0, valenceErrors: 0, code: null, identifiedName: identifyMolecule(builtGraph)?.name ?? null };
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

const HINT_PENALTY = { 1: 10, 2: 25 };
export function hintPenalty(hintsUsed) {
  if (!hintsUsed || hintsUsed <= 0) return 0;
  if (hintsUsed >= 3) return 40;
  return HINT_PENALTY[hintsUsed] ?? 0;
}

// Jenis identify: poin kuis per slot (total 100), dikurangi penalti petunjuk.
export function scoreIdentify({ experiment, answers = {}, hintsUsed = 0 }) {
  const perSlot = (experiment.quiz ?? []).map((slot) => ({
    slot: slot.slot,
    category: slot.category,
    points: slot.points,
    correct: answers[slot.slot] === slot.answer,
  }));
  const earned = perSlot.reduce((total, slot) => total + (slot.correct ? slot.points : 0), 0);
  const penalty = hintPenalty(hintsUsed);
  const total = Math.max(0, earned - penalty);
  const stars = total >= 90 ? 3 : total >= 70 ? 2 : 1;
  return { perSlot, earned, penalty, total, stars };
}

function optionSatisfied(option, reagentId, conditions) {
  if (option.reagent && option.reagent !== reagentId) return false;
  if (option.peroxide !== undefined && Boolean(option.peroxide) !== Boolean(conditions?.peroxide)) return false;
  if (option.catalyst) {
    const list = Array.isArray(option.catalyst) ? option.catalyst : [option.catalyst];
    if (!list.includes(conditions?.catalyst)) return false;
  }
  if (option.equivalents !== undefined && Number(option.equivalents) !== Number(conditions?.equivalents)) return false;
  return true;
}

function reagentConstraintMet(option, reagentId) {
  return !option.reagent || option.reagent === reagentId;
}

function conditionConstraintsMet(option, conditions) {
  if (option.peroxide !== undefined && Boolean(option.peroxide) !== Boolean(conditions?.peroxide)) return false;
  if (option.catalyst) {
    const list = Array.isArray(option.catalyst) ? option.catalyst : [option.catalyst];
    if (!list.includes(conditions?.catalyst)) return false;
  }
  if (option.equivalents !== undefined && Number(option.equivalents) !== Number(conditions?.equivalents)) return false;
  return true;
}

function validProductSet(experiment) {
  return new Set([experiment.targetProduct, ...(experiment.allowedAlternatives ?? [])].filter(Boolean));
}

// Jenis product-choice: pereaksi 25, kondisi 20, produk 45, pemahaman 10.
export function scoreProductChoice({ experiment, reagentId, conditions, chosenProductId, hintsUsed = 0 }) {
  const options = experiment.productOptions ?? [];
  const chosenOption = options.find((option) => option.id === chosenProductId) ?? null;
  const validSet = validProductSet(experiment);

  const reagent = chosenOption && reagentConstraintMet(chosenOption, reagentId) ? 25 : 0;
  const conditionPoints = chosenOption && conditionConstraintsMet(chosenOption, conditions) ? 20 : 0;
  const productOk = Boolean(
    chosenOption
    && validSet.has(chosenProductId)
    && optionSatisfied(chosenOption, reagentId, conditions),
  );
  const product = productOk ? 45 : 0;
  const understanding = hintsUsed <= 0 ? 10 : hintsUsed === 1 ? 6 : hintsUsed === 2 ? 2 : 0;
  const total = reagent + conditionPoints + product + understanding;
  const stars = total >= 90 ? 3 : total >= 70 ? 2 : 1;
  return {
    breakdown: { reagent, conditions: conditionPoints, product, understanding },
    total,
    stars,
    correct: productOk,
    matchedOption: productOk ? chosenOption : null,
  };
}

export function experimentXp(difficulty, stars, hintsUsed) {
  const base = { 1: 80, 2: 100, 3: 120 }[difficulty] ?? 80;
  return base + stars * 20 + (hintsUsed === 0 ? 25 : 0);
}
