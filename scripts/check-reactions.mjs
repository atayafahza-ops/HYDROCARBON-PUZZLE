// Addition Lab v1.1 — engine unit tests per rule + database consistency + GDD §16.1 QA cases.
import { moleculeGraph, addSubstituentNode } from '../src/additionLab/data/molecules.js';
import { runReaction } from '../src/additionLab/engine/reactionEngine.js';
import {
  validateProduct,
  scoreIdentify,
  scoreProductChoice,
  scoreExperiment,
  experimentXp,
  hintPenalty,
} from '../src/additionLab/engine/reactionValidator.js';
import { getExperiment, EXPERIMENTS, PLAYABLE_EXPERIMENTS } from '../src/additionLab/data/experiments.js';
import { getReactionRule } from '../src/additionLab/data/reactionRules.js';
import { getReagent } from '../src/additionLab/data/reagents.js';
import { getMolecule } from '../src/additionLab/data/molecules.js';
import { ZONES } from '../src/additionLab/data/zones.js';

let pass = 0;
let failCount = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass += 1;
  else {
    failCount += 1;
    console.log(`FAIL ${label}\n  actual:   ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}`);
  }
};

const cond = (catalyst, equivalents = 1, peroxide = false) => ({ catalyst, equivalents, peroxide });
const run = (reactant, reagentId, conditions, stageEnol = false) =>
  runReaction({ reactantGraph: moleculeGraph(reactant), reagentId, conditions, stageEnol });

// ---------- §16.1 QA: hidrogenasi alkena ----------
let r = run('ethene', 'H2', cond('Ni'));
check('ethene+H2/Ni -> ethane', r.productId, 'ethane');
check('ethene+H2/Ni counts', r.expectedAtomCounts, { C: 2, H: 6 });

r = run('ethene', 'H2', cond('none'));
check('ethene+H2/none -> WRONG_CONDITION', [r.status, r.code], ['no_match', 'WRONG_CONDITION']);

r = run('ethane', 'Br2', cond('none'));
check('Br2 on alkane -> WRONG_REAGENT', [r.status, r.code], ['no_match', 'WRONG_REAGENT']);

r = run('propene', 'H2', cond('Pt', 1));
check('propene+H2/Pt -> propane', r.productId, 'propane');

r = run('but-1-ene', 'H2', cond('Pd', 1));
check('but-1-ene+H2/Pd -> butane', r.productId, 'butane');

// ---------- §16.1 QA: halogenasi ----------
r = run('ethene', 'Br2', cond('none'));
check('ethene+Br2 -> dibromide', r.productId, '1,2-dibromoethane');

r = run('propene', 'Br2', cond('none'));
check('propene+Br2 -> 1,2-dibromopropane', r.productId, '1,2-dibromopropane');

// ---------- §16.1 QA: hidrohalogenasi + Markovnikov/peroksida ----------
r = run('ethene', 'HCl', cond('none'));
check('ethene+HCl -> chloroethane', r.productId, 'chloroethane');

r = run('propene', 'HCl', cond('none'));
check('propene+HCl markovnikov', r.productId, '2-chloropropane');

r = run('propene', 'HBr', cond('none', 1, true));
check('propene+HBr/peroxide anti-Markovnikov', r.productId, '1-bromopropane');

r = run('propene', 'HCl', cond('none', 1, true));
check('HCl+peroxide rejected', [r.status, r.code], ['no_match', 'WRONG_CONDITION']);

r = run('2-methylpropene', 'HBr', cond('none'));
check('2-methylpropene+HBr markovnikov tersier (graph)', [r.status, r.expectedAtomCounts], ['matched', { C: 4, H: 9, Br: 1 }]);

// ---------- §13.4 QA: ambiguitas H2 + alkuna tanpa katalis ----------
r = run('ethyne', 'H2', cond('none'));
check('ethyne+H2/none -> AMBIGUOUS (GDD 13.4)', r.status, 'ambiguous');
check('ambiguity lists both rules', [...r.candidates].sort(), ['hydrogenation-alkyne-full', 'hydrogenation-alkyne-partial']);

// ---------- §16.1 QA: hidrogenasi alkuna + Lindlar ----------
r = run('ethyne', 'H2', cond('Lindlar'));
check('ethyne+H2/Lindlar -> ethene', r.productId, 'ethene');
check('Lindlar stereo cis note', r.rule.stereo, 'cis');

r = run('ethyne', 'H2', cond('Ni', 2));
check('ethyne+2H2/Ni -> ethane', r.productId, 'ethane');

r = run('ethyne', 'H2', cond('Lindlar', 2));
check('Lindlar with 2 equiv -> WRONG_CONDITION', [r.status, r.code], ['no_match', 'WRONG_CONDITION']);

r = run('but-2-yne', 'H2', cond('Pt', 2));
check('but-2-yne full hydrogenation', r.productId, 'butane');

r = run('but-2-yne', 'H2', cond('Pt', 1));
check('but-2-yne 1eq active metal -> WRONG_CONDITION', [r.status, r.code], ['no_match', 'WRONG_CONDITION']);

// ---------- §16.1 QA: halogenasi alkuna + ekuivalen ----------
r = run('ethyne', 'Br2', cond('none', 1));
check('ethyne+1Br2 -> dibromoethene', r.productId, '1,2-dibromoethene');
check('dibromoethene trans note', r.rule.stereo, 'trans');

r = run('ethyne', 'Br2', cond('none', 2));
check('ethyne+2Br2 -> tetrabromoethane', r.productId, '1,1,2,2-tetrabromoethane');

r = run('propyne', 'HBr', cond('none', 1));
check('propyne+1HBr -> 2-bromopropene', r.productId, '2-bromopropene');

r = run('propyne', 'HBr', cond('none', 2));
check('propyne+2HBr geminal', r.productId, '2,2-dibromopropane');

r = run('but-1-yne', 'HBr', cond('none', 1));
check('but-1-yne 1eq HBr regio markovnikov', r.expectedAtomCounts, { C: 4, H: 7, Br: 1 });

// ---------- §16.1 QA: hidrasi + tautomerisasi ----------
r = run('propene', 'H2O', cond('H2SO4'));
check('propene hydration markovnikov', r.productId, 'propan-2-ol');

r = run('2-methylpropene', 'H2O', cond('H2SO4'));
check('2-methylpropene hydration -> tert-butanol', r.productId, '2-methylpropan-2-ol');

r = run('propyne', 'H2O', cond('HgSO4/H2SO4'));
check('propyne hydration -> propanone', r.productId, 'propanone');
check('propyne hydration intermediate', r.intermediateId, 'propen-2-ol');

r = run('ethyne', 'H2O', cond('HgSO4/H2SO4'), true);
check('AL-31 stageEnol -> etenol', r.productId, 'etenol');

r = run('etenol', 'Hplus', cond('Hplus'));
check('etenol tautomerize -> ethanal', r.productId, 'ethanal');

// ---------- Validator: 7 lapis + kode error ----------
const v = (builtId, expectedId, counts, rule, reactiveBond, stageEnol = false) =>
  validateProduct({
    builtGraph: moleculeGraph(builtId),
    expectedGraph: moleculeGraph(expectedId),
    expectedCounts: counts,
    rule,
    reactiveBond,
    stageEnol,
  });

r = run('ethene', 'H2', cond('Ni'));
check('validate correct ethane', v('ethane', 'ethane', r.expectedAtomCounts, r.rule, r.reactiveBond).valid, true);
check('validate correct has 7+ layers', v('ethane', 'ethane', r.expectedAtomCounts, r.rule, r.reactiveBond).layers.length >= 7, true);
check('validate correct no code', v('ethane', 'ethane', r.expectedAtomCounts, r.rule, r.reactiveBond).code, null);

check('validate unconverted (ethene kept)', v('ethene', 'ethane', { C: 2, H: 6 }, r.rule, r.reactiveBond).code, 'UNBALANCED_ATOMS');

check('validate wrong skeleton -> WRONG_CONNECTIVITY', v('2-methylpropane', 'butane', { C: 4, H: 10 }, null, null).code, 'WRONG_CONNECTIVITY');

check('validate valence breach', validateProduct({
  builtGraph: {
    nodes: [0, 1, 2, 3].map((id) => ({ id, element: 'C', x: id * 60, y: 100 })),
    edges: [{ a: 0, b: 1, order: 2 }, { a: 0, b: 2, order: 2 }, { a: 0, b: 3, order: 1 }],
  },
  expectedGraph: moleculeGraph('ethane'),
  expectedCounts: { C: 4, H: 6 },
  rule: r.rule,
  reactiveBond: r.reactiveBond,
}).code, 'INVALID_VALENCE');

r = run('propyne', 'H2O', cond('HgSO4/H2SO4'));
const enolResult = v('propen-2-ol', 'propanone', r.expectedAtomCounts, r.rule, r.reactiveBond);
check('validate enol for ketone target -> WRONG_BOND_ORDER', enolResult.code, 'WRONG_BOND_ORDER');
check('tautomer message mentions tautomerisasi', enolResult.layers.at(-1).message.includes('tautomerisasi'), true);

r = run('propene', 'HCl', cond('none'));
const wrongRegio = moleculeGraph('propene');
addSubstituentNode(wrongRegio.nodes, wrongRegio.edges, 0, 'Cl');
wrongRegio.edges.find((e) => e.a === 1 && e.b === 2).order = 1;
check('validate wrong regio -> WRONG_REGIOISOMER', validateProduct({
  builtGraph: wrongRegio,
  expectedGraph: moleculeGraph('2-chloropropane'),
  expectedCounts: r.expectedAtomCounts,
  rule: r.rule,
  reactiveBond: r.reactiveBond,
}).code, 'WRONG_REGIOISOMER');

r = run('ethyne', 'H2O', cond('HgSO4/H2SO4'), true);
check('validate stageEnol etenol correct', v('etenol', 'etenol', r.expectedAtomCounts, r.rule, r.reactiveBond, true).valid, true);

r = run('ethyne', 'H2', cond('Lindlar'));
check('validate Lindlar product correct', v('ethene', 'ethene', r.expectedAtomCounts, r.rule, r.reactiveBond).valid, true);
check('Lindlar stereo layer informative', v('ethene', 'ethene', r.expectedAtomCounts, r.rule, r.reactiveBond).layers.some((l) => l.id === 'stereo' && l.ok), true);

r = run('ethyne', 'H2', cond('Ni', 2));
check('validate under-reduced for full target -> UNBALANCED_ATOMS', v('ethene', 'ethane', r.expectedAtomCounts, r.rule, r.reactiveBond).code, 'UNBALANCED_ATOMS');

// ---------- Skoring ----------
const al01 = getExperiment('AL-01');
const answersAll = Object.fromEntries(al01.quiz.map((q) => [q.slot, q.answer]));
check('identify all correct = 100', scoreIdentify({ experiment: al01, answers: answersAll, hintsUsed: 0 }).total, 100);
const answersOne = { ...answersAll };
answersOne[al01.quiz[0].slot] = al01.quiz[0].choices[0];
check('identify one wrong = 70 (structure 30 pts)', scoreIdentify({ experiment: al01, answers: answersOne, hintsUsed: 0 }).total, 70);
check('identify hint penalty', scoreIdentify({ experiment: al01, answers: answersAll, hintsUsed: 2 }).total, 75);
check('identify 4 hints penalty cap', hintPenalty(4), 40);

const al02 = getExperiment('AL-02');
check('product-choice pair H2+ethane = 100', scoreProductChoice({ experiment: al02, reagentId: 'H2', conditions: cond('none'), chosenProductId: 'ethane', hintsUsed: 0 }).total, 100);
check('product-choice pair Br2+dibromide = 100', scoreProductChoice({ experiment: al02, reagentId: 'Br2', conditions: cond('none'), chosenProductId: '1,2-dibromoethane', hintsUsed: 0 }).total, 100);
check('product-choice mismatched pair = 30', scoreProductChoice({ experiment: al02, reagentId: 'H2', conditions: cond('none'), chosenProductId: '1,2-dibromoethane', hintsUsed: 0 }).total, 30);

const al38 = getExperiment('AL-38');
check('AL-38 correct full = 100', scoreProductChoice({ experiment: al38, reagentId: 'H2', conditions: cond('Ni', 2), chosenProductId: 'ethane', hintsUsed: 0 }).total, 100);
check('AL-38 partial ethene+Lindlar = 55', scoreProductChoice({ experiment: al38, reagentId: 'H2', conditions: cond('Lindlar', 1), chosenProductId: 'ethene', hintsUsed: 0 }).total, 55);
check('AL-38 target wrong conditions = 35', scoreProductChoice({ experiment: al38, reagentId: 'H2', conditions: cond('Lindlar', 1), chosenProductId: 'ethane', hintsUsed: 0 }).total, 35);

const al19 = getExperiment('AL-19');
check('AL-19 reagent+product mismatch = 30', scoreProductChoice({ experiment: al19, reagentId: 'Br2', conditions: cond('none'), chosenProductId: 'propan-2-ol', hintsUsed: 0 }).total, 30);

check('scoreExperiment perfect', scoreExperiment({ reagentCorrect: true, conditionsCorrect: true, hasConditionControls: true, structureFailures: 0, valenceErrors: 0, hintsUsed: 0 }).total, 100);
check('scoreExperiment stars 3', scoreExperiment({ reagentCorrect: true, conditionsCorrect: true, hasConditionControls: true, structureFailures: 0, valenceErrors: 0, hintsUsed: 0 }).stars, 3);
check('xp difficulty 2 zero hints', experimentXp(2, 3, 0), 185);
check('xp difficulty 1 one hint', experimentXp(1, 2, 1), 120);

// ---------- Konsistensi database (GDD §13.4) ----------
check('experiment ids unique', new Set(EXPERIMENTS.map((e) => e.id)).size, EXPERIMENTS.length);
check('playable subset', PLAYABLE_EXPERIMENTS.every((e) => e.playable === true), true);
check('AL-35 draft', getExperiment('AL-35').playable === false && getExperiment('AL-35').review.status === 'draft', true);
check('AL-36 draft', getExperiment('AL-36').playable === false && getExperiment('AL-36').review.status === 'draft', true);

const zoneIds = new Set(ZONES.map((zone) => zone.id));
check('every playable experiment has a valid zone', PLAYABLE_EXPERIMENTS.every((e) => zoneIds.has(e.zone)), true);
check('every playable experiment has 4 hint levels', PLAYABLE_EXPERIMENTS.every((e) => Array.isArray(e.hints) && e.hints.length === 4), true);
check('every playable experiment has objectives', PLAYABLE_EXPERIMENTS.every((e) => e.learningObjectives?.length >= 2), true);
check('every playable experiment has a summary', PLAYABLE_EXPERIMENTS.every((e) => Boolean(e.explanation?.summary)), true);
check('every playable experiment has a mission', PLAYABLE_EXPERIMENTS.every((e) => typeof e.mission === 'string' && e.mission.length > 10), true);
check('review status vocabulary', PLAYABLE_EXPERIMENTS.every((e) => ['validated', 'chemistry_reviewed', 'draft'].includes(e.review?.status)), true);

const anyMetal = (conditions) =>
  conditions ? { ...conditions, catalyst: conditions.catalyst === 'any-metal' ? 'Ni' : conditions.catalyst } : conditions;

let stageRuns = 0;
let productChoiceWins = 0;
let identifyWins = 0;

for (const experiment of PLAYABLE_EXPERIMENTS) {
  if (experiment.reagent) {
    check(`${experiment.id} reagent exists`, Boolean(getReagent(experiment.reagent)), true);
  }
  if (experiment.reagentOptions) {
    check(`${experiment.id} reagent listed in options`, experiment.reagentOptions.includes(experiment.reagent), true);
  }
  if (experiment.ruleId) {
    check(`${experiment.id} ruleId resolves`, Boolean(getReactionRule(experiment.ruleId)), true);
  }

  const stages = experiment.stages?.length ? experiment.stages : [experiment];
  stages.forEach((stage, stageIndex) => {
    const label = experiment.stages?.length ? `${experiment.id} stage ${stageIndex + 1}` : experiment.id;
    if (stage.ruleId) {
      check(`${label} stage ruleId resolves`, Boolean(getReactionRule(stage.ruleId)), true);
    }
    if (!stage.targetProduct) return;
    check(`${label} target molecule exists`, Boolean(getMolecule(stage.targetProduct)), true);
    if (stage.reagent && stage.conditions) {
      const result = runReaction({
        reactantGraph: moleculeGraph(stage.reactant),
        reagentId: stage.reagent,
        conditions: anyMetal(stage.conditions),
        stageEnol: experiment.stage === 'enol',
      });
      stageRuns += 1;
      check(`${label} target run ${stage.reactant}+${stage.reagent}`, [result.status, result.productId], ['matched', stage.targetProduct]);
      if (result.status === 'matched') {
        const validation = validateProduct({
          builtGraph: moleculeGraph(stage.targetProduct),
          expectedGraph: moleculeGraph(stage.targetProduct),
          expectedCounts: result.expectedAtomCounts,
          rule: result.rule,
          reactiveBond: result.reactiveBond,
          stageEnol: experiment.stage === 'enol',
        });
        check(`${label} target validates in 7 layers`, validation.valid, true);
      }
    }
  });

  if (experiment.kind === 'product-choice') {
    const target = experiment.productOptions.find((option) => option.id === experiment.targetProduct);
    check(`${experiment.id} target option present`, Boolean(target), true);
    const targetConditions = target
      ? {
          catalyst: Array.isArray(target.catalyst) ? target.catalyst[0] : (target.catalyst ?? 'none'),
          equivalents: target.equivalents ?? 1,
          peroxide: false,
        }
      : cond('none');
    const best = Math.max(
      ...experiment.productOptions.map((option) =>
        scoreProductChoice({ experiment, reagentId: experiment.reagent, conditions: targetConditions, chosenProductId: option.id, hintsUsed: 0 }).total),
    );
    productChoiceWins += 1;
    check(`${experiment.id} winnable (target option reaches 100)`, best, 100);
  }

  if (experiment.kind === 'identify') {
    const answers = Object.fromEntries(experiment.quiz.map((q) => [q.slot, q.answer]));
    identifyWins += 1;
    check(`${experiment.id} quiz winnable`, scoreIdentify({ experiment, answers, hintsUsed: 0 }).total, 100);
  }
}

check('target reactions exercised', stageRuns, 28);
check('product-choice experiments covered', productChoiceWins, 9);
check('identify experiments covered', identifyWins, 2);

console.log(`\n${pass} passed, ${failCount} failed`);
process.exit(failCount ? 1 : 0);
