import { LEVELS, ZONES } from '../src/data/levels.js';
import { analyzeMolecule, areGraphsIsomorphic } from '../src/chemistry/graph.js';
import { describeStructure, formatNameTokens, normalizeName, tokenType } from '../src/chemistry/nomenclature.js';
import { validateName, validateBuild } from '../src/chemistry/validator.js';

const problems = [];
const push = (id, message) => problems.push(`L${id}: ${message}`);

for (const level of LEVELS) {
  const { id, type } = level;

  if (!ZONES.some((zone) => zone.id === level.zoneId)) push(id, `zone ${level.zoneId} missing`);
  if (!level.difficultyLabel) push(id, 'no difficulty label');

  const graph = level.validation?.graph ?? level.displayGraph;
  if (graph) {
    const analysis = analyzeMolecule(graph);
    if (!analysis.connected) push(id, 'target graph disconnected');
    if (analysis.invalidValence) push(id, 'target graph breaks valence');
    if (!analysis.acyclic) push(id, 'target graph has a cycle');
    if (level.validation?.formula && analysis.formula !== level.validation.formula) {
      push(id, `formula mismatch ${analysis.formula} vs ${level.validation.formula}`);
    }
    if (level.validation && validateBuild(level, graph).ok !== true) {
      push(id, `target fails its own validation: ${validateBuild(level, graph).step}`);
    }
    const check = describeStructure(graph);
    if (type === 'build' || type === 'combo') {
      const expected = normalizeName(level.result.name);
      if (!check) push(id, 'engine could not name the target');
      else if (normalizeName(check.name) !== expected) {
        push(id, `engine says "${check.name}" but level says "${level.result.name}"`);
      }
    }
    if (type === 'name') {
      const puzzle = level.namePuzzle;
      const expected = normalizeName(puzzle.answerName);
      if (!check) push(id, 'engine could not name the display graph');
      else if (normalizeName(check.name) !== expected) {
        push(id, `engine says "${check.name}" but answer is "${puzzle.answerName}"`);
      }
      for (const alt of puzzle.altNames ?? []) {
        if (normalizeName(alt) === expected) push(id, `altName "${alt}" duplicates the answer`);
      }
      const built = formatNameTokens(puzzle.expectedTokens);
      if (normalizeName(built) !== expected) {
        push(id, `tokens [${puzzle.expectedTokens}] build "${built}" != "${puzzle.answerName}"`);
      }
      if (validateName(puzzle.expectedTokens, puzzle).ok !== true) {
        push(id, `answer tokens rejected: ${validateName(puzzle.expectedTokens, puzzle).message}`);
      }
      const bank = puzzle.bank;
      const groups = [...bank.numbers, ...bank.substituents, ...bank.stems, ...bank.suffixes];
      for (const token of puzzle.expectedTokens) {
        if (!groups.includes(token)) push(id, `bank is missing token "${token}"`);
        if (!tokenType(token)) push(id, `unknown token type "${token}"`);
      }
      const labels = puzzle.slotLabels;
      if (!labels || labels.length !== puzzle.expectedTokens.length) {
        push(id, `slot labels count ${labels?.length} != tokens ${puzzle.expectedTokens.length}`);
      }
      if (labels.includes('Bagian nama')) push(id, `unmapped slot label for [${puzzle.expectedTokens}]`);
    }
    if (type === 'combo') {
      const puzzle = level.namePuzzle;
      const built = formatNameTokens(puzzle.expectedTokens);
      if (normalizeName(built) !== normalizeName(puzzle.answerName)) {
        push(id, `combo tokens build "${built}" != "${puzzle.answerName}"`);
      }
      if (validateName(puzzle.expectedTokens, puzzle).ok !== true) {
        push(id, `combo answer tokens rejected`);
      }
      const bank = puzzle.bank;
      const groups = [...bank.numbers, ...bank.substituents, ...bank.stems, ...bank.suffixes];
      for (const token of puzzle.expectedTokens) {
        if (!groups.includes(token)) push(id, `combo bank is missing token "${token}"`);
      }
    }
    if (type === 'formula') {
      const carbon = level.validation.carbonCount;
      if (level.validation.category === 'alkana') {
        const expected = `C${carbon}H${2 * carbon + 2}`;
        if (level.validation.formula !== expected) push(id, `alkane formula ${level.validation.formula} != ${expected}`);
      }
      if (graph && !describeStructure(graph)) push(id, 'formula level display graph is unnamed');
    }
  } else if (type !== 'formula') {
    push(id, `${type} level without a graph`);
  }

  if (level.displayGraph) {
    const analysis = analyzeMolecule(level.displayGraph);
    if (level.target?.formula) {
      const { carbon, hydrogen } = level.target.formula;
      if (carbon !== analysis.carbonCount || hydrogen !== analysis.hydrogenCount) {
        push(id, `target badge C${carbon}H${hydrogen} != display C${analysis.carbonCount}H${analysis.hydrogenCount}`);
      }
    }
  }
}

// Duplicate exact-match targets make two levels the same question.
const seen = new Map();
for (const level of LEVELS) {
  if (!level.validation?.graph) continue;
  const name = normalizeName(level.result?.name ?? '');
  if (!name) continue;
  const previous = seen.get(name);
  if (previous) push(level.id, `duplicate target with level ${previous}`);
  else seen.set(name, level.id);
}

const isomerClash = [];
for (const level of LEVELS) {
  if (!level.validation?.graph) continue;
  for (const other of LEVELS) {
    if (other.id <= level.id || !other.validation?.graph) continue;
    if (areGraphsIsomorphic(level.validation.graph, other.validation.graph)) {
      isomerClash.push(`${level.id}<->${other.id}`);
    }
  }
}
if (isomerClash.length) problems.push(`isomorphic exact targets: ${isomerClash.join(', ')}`);

const zoneCounts = ZONES.map((zone) => `${zone.index}:${zone.id}=${LEVELS.filter((l) => l.zoneId === zone.id).length}`);

// Straight-chain probe: formula levels must accept every valid isomer unless they ask for branching.
const straightChain = (carbon) => ({
  nodes: Array.from({ length: carbon }, (_, index) => ({ id: index, x: index * 20, y: 0 })),
  edges: Array.from({ length: carbon - 1 }, (_, index) => ({ a: index, b: index + 1, order: 1 })),
});

for (const level of LEVELS) {
  if (level.type !== 'formula') continue;
  const carbon = level.validation.carbonCount;
  const result = validateBuild(level, straightChain(carbon));

  if (level.validation.requireBranched) {
    if (result.ok) push(level.id, 'requireBranched accepted a straight chain');
    else if (result.step !== 'branch') push(level.id, `straight chain failed at "${result.step}", expected "branch"`);
    if (!/cabang/i.test(`${level.mission} ${level.target?.clue ?? ''}`)) {
      push(level.id, 'requireBranched but neither mission nor clue mentions branching');
    }
    if (analyzeMolecule(level.displayGraph).branchPoints.length === 0) {
      push(level.id, 'requireBranched but its own display graph is a straight chain');
    }
    if (carbon > 12) push(level.id, `straight probe exceeds the 12-atom board (${carbon})`);
  } else if (level.validation.category === 'alkana' && !result.ok) {
    push(level.id, `straight C${carbon} rejected for an open isomer task: ${result.step}`);
  }
}

// Player-facing copy that names a carbon total must match the structure it describes.
const SUBSCRIPT = { '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4, '₅': 5, '₆': 6, '₇': 7, '₈': 8, '₉': 9 };
const subscriptNumber = (digits) => Number([...digits].map((char) => SUBSCRIPT[char]).join(''));

for (const level of LEVELS) {
  const graph = level.validation?.graph ?? level.molecule ?? level.displayGraph;
  if (!graph) continue;
  const actual = analyzeMolecule(graph).carbonCount;
  const fields = [
    ['title', level.title],
    ['focus', level.focus ?? ''],
    ['mission', level.mission],
    ['clue', level.target?.clue ?? ''],
    ['extra', level.extra ?? ''],
    ['explanation', level.result?.explanation ?? ''],
  ];
  for (const [field, text] of fields) {
    const claims = [
      ...String(text).matchAll(/C([₀-₉]{1,2})(?:H[₀-₉]{1,2})?/g).map((m) => subscriptNumber(m[1])),
      ...String(text).matchAll(/C(\d{1,2})(?:H\d{1,2})?\b/g).map((m) => Number(m[1])),
    ];
    for (const claimed of claims) {
      if (claimed !== actual) push(level.id, `${field} says C${claimed} but the structure is C${actual}`);
    }
  }
}

console.log(zoneCounts.join(' | '));
console.log(`levels=${LEVELS.length} zones=${ZONES.length} problems=${problems.length}`);
for (const problem of problems) console.log('  ' + problem);
process.exit(problems.length ? 1 : 0);
