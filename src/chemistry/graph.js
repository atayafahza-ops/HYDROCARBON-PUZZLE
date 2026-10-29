import { formulaPlain } from './formula.js';

export const MAX_VALENCE = 4;
export const MAX_ATOMS = 8;

export function makeMolecule(nodes = [], edges = []) {
  return {
    nodes: nodes.map((node, index) => ({
      id: node.id ?? index,
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
  return MAX_VALENCE - bondOrderAt(molecule, atomId);
}

export function computeHydrogens(molecule) {
  const map = new Map();
  for (const node of molecule.nodes) {
    map.set(node.id, MAX_VALENCE - bondOrderAt(molecule, node.id));
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
  let hydrogenCount = 0;

  for (const node of molecule.nodes) {
    hydrogenCount += hydrogens.get(node.id) ?? 0;
  }

  for (const edge of molecule.edges) {
    degrees.set(edge.a, (degrees.get(edge.a) ?? 0) + 1);
    degrees.set(edge.b, (degrees.get(edge.b) ?? 0) + 1);
    if (edge.order === 1) bondCounts.single += 1;
    if (edge.order === 2) bondCounts.double += 1;
    if (edge.order === 3) bondCounts.triple += 1;
  }

  const invalidAtoms = molecule.nodes
    .filter((node) => (hydrogens.get(node.id) ?? 0) < 0)
    .map((node) => node.id);

  const overValentAtoms = molecule.nodes
    .filter((node) => bondOrderAt(molecule, node.id) > MAX_VALENCE)
    .map((node) => node.id);

  const carbonCount = molecule.nodes.length;
  const connected = carbonCount > 0 && components.length === 1;
  const ringCount = molecule.edges.length - carbonCount + components.length;
  const acyclic = carbonCount > 0 && ringCount === 0;
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
  else if (bondCounts.triple > 0 && bondCounts.double === 0) category = 'alkuna';
  else if (bondCounts.double > 0 && bondCounts.triple === 0) category = 'alkena';
  else if (bondCounts.double === 0 && bondCounts.triple === 0) category = 'alkana';
  else category = 'campuran';

  const branchPoints = molecule.nodes
    .filter((node) => (degrees.get(node.id) ?? 0) >= 3)
    .map((node) => node.id);

  return {
    carbonCount,
    hydrogenCount,
    formula: formulaPlain(carbonCount, hydrogenCount),
    formulaCounts: { carbon: carbonCount, hydrogen: hydrogenCount },
    hydrogens,
    degrees,
    bondCounts,
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
    atomCount: carbonCount,
    edgeCount: molecule.edges.length,
  };
}

function permutations(items) {
  if (items.length <= 1) return [items.slice()];
  const result = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const permutation of permutations(rest)) {
      result.push([item, ...permutation]);
    }
  });
  return result;
}

function orderMatrix(molecule) {
  const positions = new Map(molecule.nodes.map((node, index) => [node.id, index]));
  const size = molecule.nodes.length;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));

  for (const edge of molecule.edges) {
    const a = positions.get(edge.a);
    const b = positions.get(edge.b);
    if (a === undefined || b === undefined) continue;
    matrix[a][b] = edge.order;
    matrix[b][a] = edge.order;
  }

  return matrix;
}

export function areGraphsIsomorphic(a, b) {
  if (a.nodes.length !== b.nodes.length) return false;
  if (a.edges.length !== b.edges.length) return false;
  if (a.nodes.length === 0) return true;
  if (a.nodes.length > 8) return false;

  const matrixA = orderMatrix(a);
  const matrixB = orderMatrix(b);
  const indices = Array.from({ length: b.nodes.length }, (_, index) => index);

  for (const permutation of permutations(indices)) {
    let matches = true;
    for (let i = 0; i < matrixA.length && matches; i += 1) {
      for (let j = i + 1; j < matrixA.length; j += 1) {
        if (matrixA[i][j] !== matrixB[permutation[i]][permutation[j]]) {
          matches = false;
          break;
        }
      }
    }
    if (matches) return true;
  }

  return false;
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
