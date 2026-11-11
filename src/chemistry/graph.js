import { formulaFromCounts } from './formula.js';

export const MAX_VALENCE = 4;
export const MAX_ATOMS = 12;

export const ELEMENT_VALENCE = {
  C: 4,
  H: 1,
  O: 2,
  Br: 1,
  Cl: 1,
  I: 1,
};

export function elementOf(node) {
  return node.element ?? 'C';
}

export function valenceOf(node) {
  return ELEMENT_VALENCE[elementOf(node)] ?? MAX_VALENCE;
}

export function makeMolecule(nodes = [], edges = []) {
  return {
    nodes: nodes.map((node, index) => ({
      id: node.id ?? index,
      ...(node.element ? { element: node.element } : {}),
      x: node.x ?? 0,
      y: node.y ?? 0,
    })),
    edges: edges.map((edge) => ({
      a: edge.a,
      b: edge.b,
      order: edge.order ?? 1,
    })),
  };
}

export function cloneMolecule(molecule) {
  return {
    nodes: molecule.nodes.map((node) => ({ ...node })),
    edges: molecule.edges.map((edge) => ({ ...edge })),
  };
}

export function findAtom(molecule, atomId) {
  return molecule.nodes.find((node) => node.id === atomId) ?? null;
}

export function findEdge(molecule, a, b) {
  return molecule.edges.find(
    (edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a),
  ) ?? null;
}

export function neighborsOf(molecule, atomId) {
  const neighbors = [];
  for (const edge of molecule.edges) {
    if (edge.a === atomId) neighbors.push({ id: edge.b, order: edge.order, edge });
    else if (edge.b === atomId) neighbors.push({ id: edge.a, order: edge.order, edge });
  }
  return neighbors;
}

export function bondOrderAt(molecule, atomId) {
  return neighborsOf(molecule, atomId).reduce((total, neighbor) => total + neighbor.order, 0);
}

export function hydrogensForAtom(molecule, atomId) {
  const node = findAtom(molecule, atomId);
  if (!node) return 0;
  if (elementOf(node) === 'H') return 0;
  return valenceOf(node) - bondOrderAt(molecule, atomId);
}

export function computeHydrogens(molecule) {
  const map = new Map();
  for (const node of molecule.nodes) {
    map.set(
      node.id,
      elementOf(node) === 'H' ? 0 : valenceOf(node) - bondOrderAt(molecule, node.id),
    );
  }
  return map;
}

function buildAdjacency(molecule) {
  const adjacency = new Map(molecule.nodes.map((node) => [node.id, []]));
  for (const edge of molecule.edges) {
    if (adjacency.has(edge.a) && adjacency.has(edge.b)) {
      adjacency.get(edge.a).push({ id: edge.b, order: edge.order });
      adjacency.get(edge.b).push({ id: edge.a, order: edge.order });
    }
  }
  return adjacency;
}

function findComponents(molecule) {
  const adjacency = buildAdjacency(molecule);
  const visited = new Set();
  const components = [];

  for (const node of molecule.nodes) {
    if (visited.has(node.id)) continue;
    const stack = [node.id];
    const component = [];
    visited.add(node.id);
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          stack.push(neighbor.id);
        }
      }
    }
    components.push(component);
  }

  return components;
}

export function analyzeMolecule(molecule) {
  const hydrogens = computeHydrogens(molecule);
  const components = findComponents(molecule);
  const degrees = new Map(molecule.nodes.map((node) => [node.id, 0]));
  const bondCounts = { single: 0, double: 0, triple: 0 };
  const elementCounts = {};
  let hydrogenCount = 0;

  for (const node of molecule.nodes) {
    const element = elementOf(node);
    elementCounts[element] = (elementCounts[element] ?? 0) + 1;
    hydrogenCount += element === 'H' ? 1 : hydrogens.get(node.id) ?? 0;
  }
  if (hydrogenCount > 0) elementCounts.H = hydrogenCount;

  const nodeById = new Map(molecule.nodes.map((node) => [node.id, node]));
  let carbonDoubleBonds = 0;
  let carbonTripleBonds = 0;
  for (const edge of molecule.edges) {
    degrees.set(edge.a, (degrees.get(edge.a) ?? 0) + 1);
    degrees.set(edge.b, (degrees.get(edge.b) ?? 0) + 1);
    if (edge.order === 1) bondCounts.single += 1;
    if (edge.order === 2) bondCounts.double += 1;
    if (edge.order === 3) bondCounts.triple += 1;
    const a = nodeById.get(edge.a);
    const b = nodeById.get(edge.b);
    if (a && b && elementOf(a) === 'C' && elementOf(b) === 'C') {
      if (edge.order === 2) carbonDoubleBonds += 1;
      if (edge.order === 3) carbonTripleBonds += 1;
    }
  }

  const invalidAtoms = molecule.nodes
    .filter((node) => (hydrogens.get(node.id) ?? 0) < 0)
    .map((node) => node.id);

  const overValentAtoms = molecule.nodes
    .filter((node) => bondOrderAt(molecule, node.id) > valenceOf(node))
    .map((node) => node.id);

  const carbonCount = elementCounts.C ?? 0;
  const connected = molecule.nodes.length > 0 && components.length === 1;
  const ringCount = molecule.edges.length - molecule.nodes.length + components.length;
  const acyclic = molecule.nodes.length > 0 && ringCount === 0;
  const largestComponent = components.reduce(
    (largest, component) => (component.length > largest.length ? component : largest),
    [],
  );
  const largestSet = new Set(largestComponent);
  const disconnectedAtoms = molecule.nodes
    .filter((node) => !largestSet.has(node.id))
    .map((node) => node.id);

  let category = null;
  if (carbonCount === 1 && molecule.edges.length === 0) category = 'alkana';
  else if (molecule.edges.length === 0) category = null;
  else if (carbonTripleBonds > 0 && carbonDoubleBonds === 0) category = 'alkuna';
  else if (carbonDoubleBonds > 0 && carbonTripleBonds === 0) category = 'alkena';
  else if (carbonDoubleBonds === 0 && carbonTripleBonds === 0) category = 'alkana';
  else category = 'campuran';

  const branchPoints = molecule.nodes
    .filter((node) => elementOf(node) === 'C' && (degrees.get(node.id) ?? 0) >= 3)
    .map((node) => node.id);

  return {
    carbonCount,
    hydrogenCount,
    elementCounts,
    formula: formulaFromCounts(elementCounts),
    formulaCounts: { carbon: carbonCount, hydrogen: hydrogenCount },
    hydrogens,
    degrees,
    bondCounts,
    carbonDoubleBonds,
    carbonTripleBonds,
    components,
    connected,
    acyclic,
    ringCount,
    category,
    invalidAtoms,
    overValentAtoms,
    disconnectedAtoms,
    largestComponent,
    branchPoints,
    invalidValence: invalidAtoms.length > 0 || overValentAtoms.length > 0,
    atomCount: molecule.nodes.length,
    edgeCount: molecule.edges.length,
  };
}

function adjacencyWithOrders(molecule) {
  const positions = new Map(molecule.nodes.map((node, index) => [node.id, index]));
  const adjacency = Array.from({ length: molecule.nodes.length }, () => new Map());
  for (const edge of molecule.edges) {
    const a = positions.get(edge.a);
    const b = positions.get(edge.b);
    if (a === undefined || b === undefined) continue;
    adjacency[a].set(b, edge.order);
    adjacency[b].set(a, edge.order);
  }
  return adjacency;
}

function signatureOf(neighbors, element) {
  return `${element}:${[...neighbors.values()].sort((x, y) => x - y).join('.')}`;
}

// Backtracking over bond-order signatures, so matching a ten-carbon skeleton does not
// stall the way the previous n! permutation scan did.
export function areGraphsIsomorphic(a, b) {
  const size = a.nodes.length;
  if (size !== b.nodes.length) return false;
  if (a.edges.length !== b.edges.length) return false;
  if (size === 0) return true;

  const neighborsA = adjacencyWithOrders(a);
  const neighborsB = adjacencyWithOrders(b);
  const keysA = neighborsA.map((neighbors, index) => signatureOf(neighbors, elementOf(a.nodes[index])));
  const keysB = neighborsB.map((neighbors, index) => signatureOf(neighbors, elementOf(b.nodes[index])));

  const buckets = new Map();
  keysB.forEach((key, index) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(index);
  });

  const tallyA = new Map();
  for (const key of keysA) tallyA.set(key, (tallyA.get(key) ?? 0) + 1);
  for (const [key, list] of buckets) {
    if ((tallyA.get(key) ?? 0) !== list.length) return false;
  }

  const visitOrder = keysA
    .map((key, index) => index)
    .sort((x, y) =>
      buckets.get(keysA[x]).length - buckets.get(keysA[y]).length
      || neighborsB[y].size - neighborsB[x].size,
    );

  const mapping = new Array(size).fill(-1);
  const used = new Array(size).fill(false);

  const isCompatible = (i, j) => {
    for (let k = 0; k < size; k += 1) {
      if (k === i || mapping[k] === -1) continue;
      if ((neighborsA[i].get(k) ?? 0) !== (neighborsB[j].get(mapping[k]) ?? 0)) return false;
    }
    return true;
  };

  const search = (depth) => {
    if (depth === size) return true;
    const i = visitOrder[depth];
    for (const j of buckets.get(keysA[i])) {
      if (used[j] || !isCompatible(i, j)) continue;
      mapping[i] = j;
      used[j] = true;
      if (search(depth + 1)) return true;
      used[j] = false;
      mapping[i] = -1;
    }
    return false;
  };

  return search(0);
}

export function getAdjacency(molecule) {
  return buildAdjacency(molecule);
}

export function getLargestChainLength(molecule) {
  const adjacency = buildAdjacency(molecule);
  let longest = 0;

  const visit = (id, visited) => {
    let best = 1;
    for (const neighbor of adjacency.get(id) ?? []) {
      if (visited.has(neighbor.id)) continue;
      visited.add(neighbor.id);
      best = Math.max(best, 1 + visit(neighbor.id, visited));
      visited.delete(neighbor.id);
    }
    return best;
  };

  for (const node of molecule.nodes) {
    const visited = new Set([node.id]);
    longest = Math.max(longest, visit(node.id, visited));
  }

  return longest;
}
