import { resolveReaction, expectedAtomCounts } from '../src/additionLab/engine/reactionEngine.js';
import { validateProduct, scoreExperiment, experimentXp } from '../src/additionLab/engine/reactionValidator.js';
import { moleculeGraph, identifyMolecule, getMolecule } from '../src/additionLab/data/molecules.js';
import { EXPERIMENTS } from '../src/additionLab/data/experiments.js';
import { getZone } from '../src/additionLab/data/zones.js';
import { getReagent } from '../src/additionLab/data/reagents.js';
import { analyzeMolecule } from '../src/chemistry/graph.js';

const failures = [];
let cases = 0;

function check(label, condition, detail = '') {
  cases += 1;
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

function countsEqual(a, b) {
  const elements = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const element of elements) {
    if ((a[element] ?? 0) !== (b[element] ?? 0)) return false;
  }
  return true;
}

// Runs a reaction and checks the product against the expected molecule end to end.
function reactionCase(label, reactantId, reagentId, conditions, expectedId) {
  const result = resolveReaction(moleculeGraph(reactantId), reagentId, conditions);
  check(`${label}: resolve ok`, result.ok, result.ok ? '' : `${result.error}: ${result.message}`);
  if (!result.ok) return;
  const identified = identifyMolecule(result.product);
  check(`${label}: product identity`, identified?.id === expectedId, `got ${identified?.id ?? 'unknown'}, want ${expectedId}`);
  const expected = expectedAtomCounts(moleculeGraph(reactantId), reagentId, result.rule);
  const targetAnalysis = analyzeMolecule(moleculeGraph(expectedId));
  check(`${label}: atom balance`, countsEqual(expected, targetAnalysis.elementCounts), `expected ${JSON.stringify(expected)}, target ${JSON.stringify(targetAnalysis.elementCounts)}`);
  const validation = validateProduct(result.product, expected, moleculeGraph(expectedId));
  check(`${label}: validator accepts`, validation.valid, validation.layers.find((layer) => !layer.ok)?.message ?? '');
}

function rejectionCase(label, reactantId, reagentId, conditions, expectedError) {
  const result = resolveReaction(moleculeGraph(reactantId), reagentId, conditions);
  check(`${label}: rejected`, !result.ok, 'reaction unexpectedly succeeded');
  if (!result.ok && expectedError) {
    check(`${label}: error code`, result.error === expectedError, `got ${result.error}, want ${expectedError}`);
  }
}

// ---- GDD 18.1: the ten canonical test cases ----
reactionCase('GDD etena + H2/Ni', 'ethene', 'H2', { catalyst: 'Ni', equivalents: 1 }, 'ethane');
reactionCase('GDD etena + Br2', 'ethene', 'Br2', { catalyst: 'none', equivalents: 1 }, '1,2-dibromoethane');
reactionCase('GDD propena + HBr ionik', 'propene', 'HBr', { peroxide: false }, '2-bromopropane');
reactionCase('GDD propena + HBr peroksida', 'propene', 'HBr', { peroxide: true }, '1-bromopropane');
reactionCase('GDD propena + H2O/H2SO4', 'propene', 'H2O', { catalyst: 'H2SO4' }, 'propan-2-ol');
reactionCase('GDD etuna + 2H2/Ni', 'ethyne', 'H2', { catalyst: 'Ni', equivalents: 2 }, 'ethane');
reactionCase('GDD etuna + H2/Lindlar', 'ethyne', 'H2', { catalyst: 'Lindlar', equivalents: 1 }, 'ethene');
reactionCase('GDD etuna + Br2 (1 eq)', 'ethyne', 'Br2', { equivalents: 1 }, '1,2-dibromoethene');
reactionCase('GDD etuna + 2Br2', 'ethyne', 'Br2', { equivalents: 2 }, '1,1,2,2-tetrabromoethane');
reactionCase('GDD etuna + H2O/HgSO4', 'ethyne', 'H2O', { catalyst: 'HgSO4/H2SO4' }, 'ethanal');

// ---- Selectivity and condition guards ----
rejectionCase('H2 tanpa katalis', 'ethene', 'H2', { catalyst: 'none' }, 'missing-catalyst');
rejectionCase('Lindlar pada alkena', 'ethene', 'H2', { catalyst: 'Lindlar' }, 'wrong-catalyst');
rejectionCase('Alkuna + H2 kurang ekuivalen', 'ethyne', 'H2', { catalyst: 'Ni', equivalents: 1 }, 'equivalents');
rejectionCase('Peroksida + HCl', 'propene', 'HCl', { peroxide: true }, 'peroxide-only-hbr');
rejectionCase('Peroksida + HI', 'propene', 'HI', { peroxide: true }, 'peroxide-only-hbr');
rejectionCase('Peroksida + Br2', 'ethene', 'Br2', { peroxide: true }, 'peroxide-irrelevant');
rejectionCase('Hidrasi alkena tanpa asam', 'propene', 'H2O', { catalyst: 'none' }, 'missing-catalyst');
rejectionCase('Hidrasi alkuna tanpa Hg', 'ethyne', 'H2O', { catalyst: 'H2SO4' }, 'missing-catalyst');
rejectionCase('Adisi pada alkana', 'ethane', 'Br2', {}, 'no-multiple-bond');
rejectionCase('Reagen tak dikenal', 'ethene', 'Xe', {}, 'unknown-reagent');

// ---- Advanced chemistry: tautomerization, geminal dihalides, equivalents ----
reactionCase('But-1-una hidrasi → butanon (keto)', 'but-1-yne', 'H2O', { catalyst: 'HgSO4/H2SO4' }, 'butanone');
reactionCase('Propuna hidrasi → propanon', 'propyne', 'H2O', { catalyst: 'HgSO4/H2SO4' }, 'propanone');
reactionCase('Propuna + 2HBr → geminal', 'propyne', 'HBr', { equivalents: 2 }, '2,2-dibromopropane');
reactionCase('But-1-una + 2H2 → butana', 'but-1-yne', 'H2', { catalyst: 'Pd', equivalents: 2 }, 'butane');
reactionCase('But-2-una + Br2 (1 eq)', 'but-2-yne', 'Br2', { equivalents: 1 }, '2,3-dibromobut-2-ene');
reactionCase('2-metilpropena + H2O → tersier alkohol', '2-methylpropene', 'H2O', { catalyst: 'H2SO4' }, '2-methylpropan-2-ol');
reactionCase('2-metilpropena + HBr/peroksida → anti', '2-methylpropene', 'HBr', { peroxide: true }, '1-bromo-2-methylpropane');

// The enol intermediate must exist for alkyne hydration and differ from the keto product.
const hydration = resolveReaction(moleculeGraph('ethyne'), 'H2O', { catalyst: 'HgSO4/H2SO4' });
check('Hidrasi alkuna: zat antara enol', Boolean(hydration.intermediate), 'intermediate missing');
if (hydration.intermediate) {
  const enolId = identifyMolecule(hydration.intermediate)?.id ?? null;
  check('Enol bukan produk keto', enolId !== 'ethanal', `enol identified as ${enolId}`);
  const enolAnalysis = analyzeMolecule(hydration.intermediate);
  check('Enol: rumus sama dengan keto', enolAnalysis.formula === analyzeMolecule(moleculeGraph('ethanal')).formula, `${enolAnalysis.formula}`);
}

// ---- Validator rejects wrong products with the right layer ----
const br2Expected = expectedAtomCounts(moleculeGraph('ethene'), 'Br2', { pathway: 'halogenation', rounds: 1 });
const empty = validateProduct({ nodes: [], edges: [] }, br2Expected, moleculeGraph('1,2-dibromoethane'));
check('Validator: kanvas kosong', !empty.valid && empty.layers[0].id === 'empty');

const disconnected = {
  nodes: [{ id: 0, element: 'C', x: 0, y: 0 }, { id: 1, element: 'Br', x: 50, y: 0 }],
  edges: [],
};
const disconnectedResult = validateProduct(disconnected, { C: 1, H: 3, Br: 1 }, moleculeGraph('ethane'));
check('Validator: tidak terhubung', !disconnectedResult.valid && disconnectedResult.layers.some((layer) => layer.id === 'connectivity' && !layer.ok));

const overValent = {
  nodes: [{ id: 0, element: 'C', x: 0, y: 0 }, { id: 1, element: 'C', x: 50, y: 0 }, { id: 2, element: 'C', x: 100, y: 0 }, { id: 3, element: 'C', x: 150, y: 0 }, { id: 4, element: 'C', x: 200, y: 0 }],
  edges: [{ a: 0, b: 1, order: 3 }, { a: 0, b: 2, order: 1 }, { a: 0, b: 3, order: 1 }, { a: 0, b: 4, order: 1 }],
};
const overValentResult = validateProduct(overValent, analyzeMolecule(overValent).elementCounts, moleculeGraph('ethane'));
check('Validator: valensi terlampaui', !overValentResult.valid && overValentResult.valenceErrors > 0);

const wrongIsomer = validateProduct(moleculeGraph('1-bromopropane'), { C: 3, H: 7, Br: 1 }, moleculeGraph('2-bromopropane'));
check('Validator: isomer salah ditolak', !wrongIsomer.valid && wrongIsomer.layers.some((layer) => layer.id === 'identity' && !layer.ok));

const imbalance = validateProduct(moleculeGraph('ethane'), br2Expected, moleculeGraph('1,2-dibromoethane'));
check('Validator: neraca atom salah', !imbalance.valid && imbalance.layers.some((layer) => layer.id === 'atom-balance' && !layer.ok));

// ---- All 40 experiments are chemically solvable and well-formed ----
check('Jumlah eksperimen', EXPERIMENTS.length === 40, `got ${EXPERIMENTS.length}`);
const ids = new Set();
for (const experiment of EXPERIMENTS) {
  const label = experiment.id;
  check(`${label}: id unik`, !ids.has(experiment.id));
  ids.add(experiment.id);
  check(`${label}: zona ada`, Boolean(getZone(experiment.zone)));
  check(`${label}: reaktan ada`, Boolean(getMolecule(experiment.reactant)));
  check(`${label}: produk ada`, Boolean(getMolecule(experiment.targetProduct)));
  check(`${label}: reagen ada`, Boolean(getReagent(experiment.reagent)));
  check(`${label}: 4 petunjuk`, experiment.hints?.length === 4, `got ${experiment.hints?.length}`);
  check(`${label}: penjelasan lengkap`, Boolean(experiment.explanation?.summary && experiment.explanation?.mechanism?.length));
  check(`${label}: tujuan belajar`, Boolean(experiment.learningObjectives?.length));
  check(`${label}: kesulitan 1-3`, [1, 2, 3].includes(experiment.difficulty));

  const controls = experiment.conditionControls;
  if (controls.catalyst) {
    check(`${label}: opsi katalis memuat jawaban`, controls.catalyst.includes(experiment.conditions.catalyst), `${JSON.stringify(controls.catalyst)}`);
  }
  if (controls.equivalents) {
    check(`${label}: opsi ekuivalen memuat jawaban`, controls.equivalents.includes(experiment.conditions.equivalents), `${JSON.stringify(controls.equivalents)}`);
  }
  if (experiment.conditions.peroxide) {
    check(`${label}: kontrol peroksida tersedia`, controls.peroxide === true);
  }

  const result = resolveReaction(moleculeGraph(experiment.reactant), experiment.reagent, experiment.conditions);
  check(`${label}: reaksi benar`, result.ok, result.ok ? '' : `${result.error}: ${result.message}`);
  if (!result.ok) continue;
  check(`${label}: produk sesuai target`, identifyMolecule(result.product)?.id === experiment.targetProduct, `got ${identifyMolecule(result.product)?.id}`);
  const expected = expectedAtomCounts(moleculeGraph(experiment.reactant), experiment.reagent, result.rule);
  const validation = validateProduct(moleculeGraph(experiment.targetProduct), expected, moleculeGraph(experiment.targetProduct));
  check(`${label}: validator menerima target`, validation.valid, validation.layers.find((layer) => !layer.ok)?.message ?? '');
}

// ---- Scoring follows the GDD weights and star thresholds ----
const perfect = scoreExperiment({ reagentCorrect: true, conditionsCorrect: true, hasConditionControls: true, structureFailures: 0, valenceErrors: 0, hintsUsed: 0 });
check('Skor sempurna = 100', perfect.total === 100, `got ${perfect.total}`);
check('Skor sempurna = 3 bintang', perfect.stars === 3);
check('Bobot reagen 20', perfect.breakdown.reagent === 20);
check('Bobot kondisi 15', perfect.breakdown.conditions === 15);
check('Bobot struktur 40', perfect.breakdown.structure === 40);
check('Bobot rumus 15', perfect.breakdown.formula === 15);
check('Bobot pemahaman 10', perfect.breakdown.understanding === 10);

const oneHint = scoreExperiment({ reagentCorrect: true, conditionsCorrect: true, hasConditionControls: true, structureFailures: 0, valenceErrors: 0, hintsUsed: 1 });
check('1 petunjuk masih 3 bintang (96)', oneHint.total === 96 && oneHint.stars === 3, `got ${oneHint.total}/${oneHint.stars}`);
const twoStars = scoreExperiment({ reagentCorrect: true, conditionsCorrect: false, hasConditionControls: true, structureFailures: 1, valenceErrors: 1, hintsUsed: 2 });
check('Skor 70-89 = 2 bintang', twoStars.total >= 70 && twoStars.total < 90 && twoStars.stars === 2, `got ${twoStars.total}/${twoStars.stars}`);
const oneStar = scoreExperiment({ reagentCorrect: false, conditionsCorrect: false, hasConditionControls: true, structureFailures: 4, valenceErrors: 3, hintsUsed: 4 });
check('Skor rendah = 1 bintang', oneStar.stars === 1, `got ${oneStar.total}/${oneStar.stars}`);
check('XP tanpa petunjuk lebih besar', experimentXp(2, 3, 0) > experimentXp(2, 3, 1));
check('XP naik sesuai kesulitan', experimentXp(3, 3, 0) > experimentXp(1, 3, 0));

console.log(`reaction cases=${cases} failures=${failures.length}`);
for (const failure of failures) console.log('  FAIL ' + failure);
process.exit(failures.length ? 1 : 0);