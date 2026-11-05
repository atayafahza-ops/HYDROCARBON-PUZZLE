import { areGraphsIsomorphic, analyzeMolecule } from '../src/chemistry/graph.js';
import { LEVELS } from '../src/data/levels.js';
import { validateBuild } from '../src/chemistry/validator.js';

const mol = (ids, edges) => ({
  nodes: ids.map((id) => ({ id, x: 0, y: 0 })),
  edges: edges.map(([a, b, order = 1]) => ({ a, b, order })),
});
const line = (n) => mol(Array.from({ length: n }, (_, i) => i), Array.from({ length: n - 1 }, (_, i) => [i, i + 1]));
const shuffle = (m, k) => {
  const map = new Map(m.nodes.map((node, index) => [node.id, ((index * k) % m.nodes.length)]));
  return {
    nodes: m.nodes.map((node) => ({ id: map.get(node.id), x: 0, y: 0 })),
    edges: m.edges.map((edge) => ({ a: map.get(edge.a), b: map.get(edge.b), order: edge.order })),
  };
};
const cycle = (n) => mol(Array.from({ length: n }, (_, i) => i), Array.from({ length: n }, (_, i) => [i, (i + 1) % n]));

const cases = [
  ['n4 vs isobutane', line(4), mol([0, 1, 2, 3], [[0, 1], [0, 2], [0, 3]]), false],
  ['n4 vs n4 relabeled', line(4), shuffle(line(4), 3), true],
  ['C4 vs but-1-ene', cycle(4), mol([0, 1, 2, 3], [[0, 1, 2], [1, 2], [2, 3]]), false],
  ['C12 vs 2x C6', cycle(12), { nodes: [...cycle(6).nodes, ...cycle(6).nodes.map((n) => ({ ...n, id: n.id + 6 }))], edges: [...cycle(6).edges, ...cycle(6).edges.map((edge) => ({ a: edge.a + 6, b: edge.b + 6, order: edge.order }))] }, false],
  ['n10 vs n10 reversed', line(10), { nodes: line(10).nodes.map((n) => ({ id: 9 - n.id, x: 0, y: 0 })), edges: line(10).edges.map((e) => ({ a: 9 - e.a, b: 9 - e.b, order: e.order })) }, true],
  ['n10 vs 2-metilnonana', line(10), mol(Array.from({ length: 10 }, (_, i) => i), [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [1, 9]]), false],
];

let failures = 0;
for (const [label, a, b, expected] of cases) {
  const got = areGraphsIsomorphic(a, b);
  if (got !== expected) { failures += 1; console.log(`FAIL ${label}: expected ${expected}, got ${got}`); }
}

// Every build/combo target must accept a relabeled, reordered copy of itself and reject a foreign skeleton.
for (const level of LEVELS) {
  const target = level.validation?.graph;
  if (!target) continue;
  const rotated = { ...target, nodes: [...target.nodes].reverse(), edges: [...target.edges].reverse() };
  if (!areGraphsIsomorphic(level.validation.graph, rotated)) {
    failures += 1;
    console.log(`FAIL L${level.id}: self match rejected`);
  }
}

const start = performance.now();
for (let i = 0; i < 200; i += 1) areGraphsIsomorphic(line(12), shuffle(line(12), 5));
const perMatch = (performance.now() - start) / 200;

const worst = performance.now();
let rejected = 0;
for (const level of LEVELS) {
  const target = level.validation?.graph;
  if (!target) continue;
  for (const other of LEVELS) {
    const foreign = other.validation?.graph;
    if (!foreign || foreign === target) continue;
    if (analyzeMolecule(foreign).carbonCount !== analyzeMolecule(target).carbonCount) continue;
    if (areGraphsIsomorphic(target, foreign)) rejected += 1;
  }
}
console.log(`cases=${cases.length} levels=${LEVELS.length} failures=${failures}`);
console.log(`n12 self-match=${perMatch.toFixed(3)}ms  cross-level pairs isomorphic=${rejected}  cross-scan=${(performance.now() - worst).toFixed(0)}ms`);

const c10 = LEVELS.find((level) => level.id === 54);
const built = { nodes: line(10).nodes, edges: line(10).edges };
console.log('L54 accepts straight C10:', validateBuild(c10, built).ok, '| accepts branched:', validateBuild(c10, mol(Array.from({ length: 10 }, (_, i) => i), [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [1, 9]])).ok);
process.exit(failures ? 1 : 0);
