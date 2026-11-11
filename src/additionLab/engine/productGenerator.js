import { cloneMolecule, hydrogensForAtom, analyzeMolecule } from '../../chemistry/graph.js';
import { addSubstituentNode } from '../data/molecules.js';

const HALOGEN_BY_REAGENT = { Br2: 'Br', Cl2: 'Cl', HCl: 'Cl', HBr: 'Br', HI: 'I' };

function carbonEndpoints(graph, edge) {
  const a = graph.nodes.find((node) => node.id === edge.a);
  const b = graph.nodes.find((node) => node.id === edge.b);
  if (!a || !b) return null;
  if ((a.element ?? 'C') !== 'C' || (b.element ?? 'C') !== 'C') return null;
  return [a, b];
}

function findReactiveBond(graph) {
  const candidates = graph.edges
    .filter((edge) => edge.order >= 2)
    .map((edge) => ({ edge, endpoints: carbonEndpoints(graph, edge) }))
    .filter((entry) => entry.endpoints !== null);
  const enolBond = candidates.find(({ edge, endpoints }) => {
    if (edge.order !== 2) return false;
    return endpoints.some((endpoint) => graph.edges.some((candidate) => {
      const otherId = candidate.a === endpoint.id ? candidate.b : candidate.b === endpoint.id ? candidate.a : null;
      if (otherId === null) return false;
      return candidate.order === 1 && graph.nodes.find((node) => node.id === otherId)?.element === 'O';
    }));
  });
  if (enolBond) return enolBond;
  return candidates.sort((a, b) => b.edge.order - a.edge.order)[0] ?? null;
}

function implicitHydrogens(graph, nodeId) {
  return hydrogensForAtom(graph, nodeId);
}

function endpointWithFewerHydrogens(graph, endpoints) {
  return [...endpoints].sort(
    (a, b) => implicitHydrogens(graph, a.id) - implicitHydrogens(graph, b.id) || a.id - b.id,
  )[0];
}

function endpointWithMoreHydrogens(graph, endpoints) {
  return [...endpoints].sort(
    (a, b) => implicitHydrogens(graph, b.id) - implicitHydrogens(graph, a.id) || a.id - b.id,
  )[0];
}

function orientatedTarget(graph, endpoints, orientation) {
  if (orientation === 'anti-markovnikov') return endpointWithMoreHydrogens(graph, endpoints);
  return endpointWithFewerHydrogens(graph, endpoints);
}

function attachNode(graph, anchorId, element, order = 1) {
  return addSubstituentNode(graph.nodes, graph.edges, anchorId, element, order);
}

function tautomerize(graph, reactiveBond, notes) {
  reactiveBond.edge.order = 1;
  const oxygenEdge = graph.edges.find((edge) => {
    const otherId = edge.a === reactiveBond.endpoints[0].id || edge.a === reactiveBond.endpoints[1].id ? edge.b : null;
    if (otherId === null) return false;
    return edge.order === 1 && graph.nodes.find((node) => node.id === otherId)?.element === 'O';
  });
  if (oxygenEdge) oxygenEdge.order = 2;
  notes.push('Tautomerisasi: ikatan C=C menjadi C–C dan O–H menjadi C=O.');
}

// Product Generator memakai struktur graf yang sama dengan Validator (GDD §13.4).
export function generateProduct(reactantGraph, rule, reagentId, options = {}) {
  const graph = cloneMolecule(reactantGraph);
  const reactive = findReactiveBond(graph);
  if (!reactive) return { ok: false, message: 'Tidak ada ikatan rangkap karbon yang bisa bereaksi pada reaktan ini.' };
  const notes = [];
  let intermediate = null;

  if (rule.transform === 'hydrogenate') {
    reactive.edge.order = rule.finalOrder;
    if (rule.substrate === 'alkyne') notes.push('Reduksi alkuna berhenti pada alkena (satu tingkat orde ikatan).');
  } else if (rule.transform === 'dihalogenate') {
    const halogen = HALOGEN_BY_REAGENT[reagentId] ?? 'Br';
    for (let round = 0; round < rule.rounds; round += 1) {
      reactive.edge.order = Math.max(1, reactive.edge.order - 1);
      for (const endpoint of reactive.endpoints) attachNode(graph, endpoint.id, halogen, 1);
    }
    notes.push(`Satu ${halogen} masuk ke tiap karbon rangkap setiap ekuivalen.`);
  } else if (rule.transform === 'hydrohalogenate') {
    const halogen = HALOGEN_BY_REAGENT[reagentId] ?? 'Br';
    for (let round = 0; round < rule.rounds; round += 1) {
      reactive.edge.order = Math.max(1, reactive.edge.order - 1);
      const target = orientatedTarget(graph, reactive.endpoints, rule.orientation);
      attachNode(graph, target.id, halogen, 1);
    }
    notes.push(rule.orientation === 'anti-markovnikov'
      ? 'Jalur radikal: X ke karbon yang kurang tersubstitusi (anti-Markovnikov).'
      : 'Markovnikov: X ke karbon yang lebih tersubstitusi.');
    if (rule.rounds > 1) notes.push('Dua ekuivalen menempatkan kedua halogen pada karbon yang sama (geminal).');
  } else if (rule.transform === 'hydrate') {
    reactive.edge.order = rule.substrate === 'alkyne' ? 2 : rule.finalOrder;
    const target = orientatedTarget(graph, reactive.endpoints, rule.orientation);
    attachNode(graph, target.id, 'O', 1);
    notes.push('Markovnikov: OH ke karbon yang lebih tersubstitusi.');
    if (rule.tautomerize && !options.stageEnol) {
      intermediate = cloneMolecule(graph);
      tautomerize(graph, reactive, notes);
      notes.push('Enol ditampilkan sebagai intermediate sebelum tautomerisasi.');
    }
  } else if (rule.transform === 'tautomerize') {
    tautomerize(graph, reactive, notes);
  } else {
    return { ok: false, message: `Transformasi tidak dikenal: ${rule.transform}.` };
  }

  return { ok: true, product: graph, intermediate, reactiveBond: reactive.edge, notes };
}

export function expectedAtomCounts(reactantGraph, reagentId, rule) {
  const counts = { ...analyzeMolecule(reactantGraph).elementCounts };
  const reagentAtoms = REAGENT_ATOMS[reagentId] ?? {};
  for (const [element, count] of Object.entries(reagentAtoms)) {
    counts[element] = (counts[element] ?? 0) + count * rule.rounds;
  }
  return counts;
}

const REAGENT_ATOMS = {
  H2: { H: 2 },
  Br2: { Br: 2 },
  Cl2: { Cl: 2 },
  HCl: { H: 1, Cl: 1 },
  HBr: { H: 1, Br: 1 },
  HI: { H: 1, I: 1 },
  H2O: { H: 2, O: 1 },
  Hplus: {},
};
