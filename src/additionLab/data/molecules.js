import { analyzeMolecule, areGraphsIsomorphic, elementOf } from '../../chemistry/graph.js';

const CHAIN_STEP = 66;

function zigzagCarbons(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    element: 'C',
    x: 62 + index * CHAIN_STEP,
    y: index % 2 === 0 ? 118 : 78,
  }));
}

function setBond(edges, a, b, order) {
  const existing = edges.find(
    (edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a),
  );
  if (existing) existing.order = order;
  else edges.push({ a, b, order });
}

export function addSubstituentNode(nodes, edges, anchorId, element, order = 1) {
  const anchor = nodes.find((node) => node.id === anchorId);
  const siblings = edges.filter(
    (edge) =>
      (edge.a === anchorId || edge.b === anchorId) &&
      elementOf(nodes.find((node) => node.id === (edge.a === anchorId ? edge.b : edge.a))) !== 'C',
  ).length;
  const direction = anchor.y >= 100 ? 1 : -1;
  const offset = siblings === 0 ? 0 : (siblings % 2 === 1 ? -1 : 1) * Math.ceil(siblings / 2) * 46;
  const id = nodes.reduce((max, node) => Math.max(max, Number(node.id)), -1) + 1;
  nodes.push({ id, element, x: anchor.x + offset, y: anchor.y + direction * 64 });
  edges.push({ a: anchorId, b: id, order });
  return id;
}

function defineMolecule(id, name, recipe) {
  let nodes;
  const edges = [];
  if (recipe.chain) {
    nodes = zigzagCarbons(recipe.chain);
    for (let index = 0; index < recipe.chain - 1; index += 1) {
      edges.push({ a: index, b: index + 1, order: 1 });
    }
  } else {
    nodes = recipe.atoms.map((atom) => ({ ...atom }));
  }
  for (const [a, b, order = 1] of recipe.bonds ?? []) setBond(edges, a, b, order);
  for (const sub of recipe.subs ?? []) {
    addSubstituentNode(nodes, edges, sub.at, sub.element, sub.order ?? 1);
  }
  const analysis = analyzeMolecule({ nodes, edges });
  return {
    id,
    name,
    nodes,
    edges,
    formula: analysis.formula,
    elementCounts: analysis.elementCounts,
    category: analysis.category,
  };
}

const DEFINITIONS = [
  // ---- Reactants: alkenes ----
  defineMolecule('ethene', 'Etena', { chain: 2, bonds: [[0, 1, 2]] }),
  defineMolecule('propene', 'Propena', { chain: 3, bonds: [[1, 2, 2]] }),
  defineMolecule('but-1-ene', 'But-1-ena', { chain: 4, bonds: [[0, 1, 2]] }),
  defineMolecule('but-2-ene', 'But-2-ena', { chain: 4, bonds: [[1, 2, 2]] }),
  defineMolecule('2-methylpropene', '2-metilpropena', {
    atoms: [
      { id: 0, element: 'C', x: 128, y: 100 },
      { id: 1, element: 'C', x: 62, y: 54 },
      { id: 2, element: 'C', x: 194, y: 54 },
      { id: 3, element: 'C', x: 128, y: 168 },
    ],
    bonds: [[0, 1], [0, 2], [0, 3, 2]],
  }),

  // ---- Reactants: alkynes ----
  defineMolecule('ethyne', 'Etuna', { chain: 2, bonds: [[0, 1, 3]] }),
  defineMolecule('propyne', 'Propuna', { chain: 3, bonds: [[1, 2, 3]] }),
  defineMolecule('but-1-yne', 'But-1-una', { chain: 4, bonds: [[0, 1, 3]] }),
  defineMolecule('but-2-yne', 'But-2-una', { chain: 4, bonds: [[1, 2, 3]] }),

  // ---- Products: alkanes ----
  defineMolecule('ethane', 'Etana', { chain: 2 }),
  defineMolecule('propane', 'Propana', { chain: 3 }),
  defineMolecule('butane', 'Butana', { chain: 4 }),
  defineMolecule('2-methylpropane', '2-metilpropana', {
    atoms: [
      { id: 0, element: 'C', x: 128, y: 100 },
      { id: 1, element: 'C', x: 62, y: 54 },
      { id: 2, element: 'C', x: 194, y: 54 },
      { id: 3, element: 'C', x: 128, y: 168 },
    ],
    bonds: [[0, 1], [0, 2], [0, 3]],
  }),

  // ---- Products: haloalkanes ----
  defineMolecule('chloroethane', 'Kloroetana', { chain: 2, subs: [{ at: 0, element: 'Cl' }] }),
  defineMolecule('1,2-dibromoethane', '1,2-dibromoetana', {
    chain: 2,
    subs: [{ at: 0, element: 'Br' }, { at: 1, element: 'Br' }],
  }),
  defineMolecule('1,2-dichloroethane', '1,2-dikloroetana', {
    chain: 2,
    subs: [{ at: 0, element: 'Cl' }, { at: 1, element: 'Cl' }],
  }),
  defineMolecule('1,2-dibromopropane', '1,2-dibromopropana', {
    chain: 3,
    subs: [{ at: 1, element: 'Br' }, { at: 2, element: 'Br' }],
  }),
  defineMolecule('1,2-dichloropropane', '1,2-dikloropropana', {
    chain: 3,
    subs: [{ at: 1, element: 'Cl' }, { at: 2, element: 'Cl' }],
  }),
  defineMolecule('1,2-dibromobutane', '1,2-dibromobutana', {
    chain: 4,
    subs: [{ at: 0, element: 'Br' }, { at: 1, element: 'Br' }],
  }),
  defineMolecule('2,3-dichlorobutane', '2,3-diklorobutana', {
    chain: 4,
    subs: [{ at: 1, element: 'Cl' }, { at: 2, element: 'Cl' }],
  }),
  defineMolecule('1,2-dibromo-2-methylpropane', '1,2-dibromo-2-metilpropana', {
    atoms: [
      { id: 0, element: 'C', x: 128, y: 100 },
      { id: 1, element: 'C', x: 62, y: 54 },
      { id: 2, element: 'C', x: 194, y: 54 },
      { id: 3, element: 'C', x: 128, y: 168 },
    ],
    bonds: [[0, 1], [0, 2], [0, 3]],
    subs: [{ at: 0, element: 'Br' }, { at: 3, element: 'Br' }],
  }),
  defineMolecule('2-bromopropane', '2-bromopropana', { chain: 3, subs: [{ at: 1, element: 'Br' }] }),
  defineMolecule('1-bromopropane', '1-bromopropana', { chain: 3, subs: [{ at: 0, element: 'Br' }] }),
  defineMolecule('2-chloropropane', '2-kloropropana', { chain: 3, subs: [{ at: 1, element: 'Cl' }] }),
  defineMolecule('2-bromobutane', '2-bromobutana', { chain: 4, subs: [{ at: 1, element: 'Br' }] }),
  defineMolecule('2-iodobutane', '2-iodobutana', { chain: 4, subs: [{ at: 1, element: 'I' }] }),
  defineMolecule('2-chloro-2-methylpropane', '2-kloro-2-metilpropana', {
    atoms: [
      { id: 0, element: 'C', x: 128, y: 100 },
      { id: 1, element: 'C', x: 62, y: 54 },
      { id: 2, element: 'C', x: 194, y: 54 },
      { id: 3, element: 'C', x: 128, y: 168 },
    ],
    bonds: [[0, 1], [0, 2], [0, 3]],
    subs: [{ at: 0, element: 'Cl' }],
  }),
  defineMolecule('1-bromo-2-methylpropane', '1-bromo-2-metilpropana', {
    atoms: [
      { id: 0, element: 'C', x: 128, y: 100 },
      { id: 1, element: 'C', x: 62, y: 54 },
      { id: 2, element: 'C', x: 194, y: 54 },
      { id: 3, element: 'C', x: 128, y: 168 },
    ],
    bonds: [[0, 1], [0, 2], [0, 3]],
    subs: [{ at: 3, element: 'Br' }],
  }),
  defineMolecule('2,2-dibromopropane', '2,2-dibromopropana', {
    chain: 3,
    subs: [{ at: 1, element: 'Br' }, { at: 1, element: 'Br' }],
  }),
  defineMolecule('2,2-dibromobutane', '2,2-dibromobutana', {
    chain: 4,
    subs: [{ at: 1, element: 'Br' }, { at: 1, element: 'Br' }],
  }),
  defineMolecule('1,1,2,2-tetrabromoethane', '1,1,2,2-tetrabromoetana', {
    chain: 2,
    subs: [
      { at: 0, element: 'Br' },
      { at: 0, element: 'Br' },
      { at: 1, element: 'Br' },
      { at: 1, element: 'Br' },
    ],
  }),

  // ---- Products: haloalkenes ----
  defineMolecule('1,2-dibromoethene', '1,2-dibromoetena', {
    chain: 2,
    bonds: [[0, 1, 2]],
    subs: [{ at: 0, element: 'Br' }, { at: 1, element: 'Br' }],
  }),
  defineMolecule('chloroethene', 'Kloroetena', {
    chain: 2,
    bonds: [[0, 1, 2]],
    subs: [{ at: 0, element: 'Cl' }],
  }),
  defineMolecule('2-bromopropene', '2-bromopropena', {
    chain: 3,
    bonds: [[1, 2, 2]],
    subs: [{ at: 1, element: 'Br' }],
  }),
  defineMolecule('2,3-dibromobut-2-ene', '2,3-dibromobut-2-ena', {
    chain: 4,
    bonds: [[1, 2, 2]],
    subs: [{ at: 1, element: 'Br' }, { at: 2, element: 'Br' }],
  }),

  // ---- Products: alcohols ----
  defineMolecule('ethanol', 'Etanol', { chain: 2, subs: [{ at: 0, element: 'O' }] }),
  defineMolecule('propan-2-ol', 'Propan-2-ol', { chain: 3, subs: [{ at: 1, element: 'O' }] }),
  defineMolecule('butan-2-ol', 'Butan-2-ol', { chain: 4, subs: [{ at: 1, element: 'O' }] }),
  defineMolecule('2-methylpropan-2-ol', '2-metilpropan-2-ol', {
    atoms: [
      { id: 0, element: 'C', x: 128, y: 100 },
      { id: 1, element: 'C', x: 62, y: 54 },
      { id: 2, element: 'C', x: 194, y: 54 },
      { id: 3, element: 'C', x: 128, y: 168 },
    ],
    bonds: [[0, 1], [0, 2], [0, 3]],
    subs: [{ at: 0, element: 'O' }],
  }),

  // ---- Products: carbonyls ----
  defineMolecule('ethanal', 'Etanal', { chain: 2, subs: [{ at: 1, element: 'O', order: 2 }] }),
  defineMolecule('propanone', 'Propanon', { chain: 3, subs: [{ at: 1, element: 'O', order: 2 }] }),
  defineMolecule('butanone', 'Butanon', { chain: 4, subs: [{ at: 1, element: 'O', order: 2 }] }),
];

export const MOLECULES = Object.fromEntries(DEFINITIONS.map((molecule) => [molecule.id, molecule]));

export function getMolecule(id) {
  return MOLECULES[id] ?? null;
}

export function moleculeGraph(id) {
  const molecule = getMolecule(id);
  if (!molecule) return null;
  return {
    nodes: molecule.nodes.map((node) => ({ ...node })),
    edges: molecule.edges.map((edge) => ({ ...edge })),
  };
}

export function identifyMolecule(graph) {
  if (!graph?.nodes?.length) return null;
  for (const molecule of DEFINITIONS) {
    if (areGraphsIsomorphic(graph, molecule)) return molecule;
  }
  return null;
}