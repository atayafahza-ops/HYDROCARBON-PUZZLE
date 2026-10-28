import { analyzeMolecule, getAdjacency } from './graph.js';

export const STEMS = ['met', 'et', 'prop', 'but', 'pent', 'heks', 'hept', 'okt', 'non', 'dek'];
export const SUBSTITUENTS = ['metil', 'etil', 'propil', 'butil'];
export const SUFFIXES = ['-ana', '-ena', '-una'];
export const NUMBER_TOKENS = ['1', '2', '3', '4', '5', '6'];

const MULTIPLIERS = { 2: 'di', 3: 'tri', 4: 'tetra' };

function stemFor(length) {
  return STEMS[length - 1] ?? null;
}

function enumeratePaths(adjacency) {
  const paths = [];

  const walk = (current, path, visited) => {
    paths.push(path.slice());
    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor.id)) continue;
      visited.add(neighbor.id);
      path.push(neighbor.id);
      walk(neighbor.id, path, visited);
      path.pop();
      visited.delete(neighbor.id);
    }
  };

  for (const start of adjacency.keys()) {
    walk(start, [start], new Set([start]));
  }

  return paths;
}

function pathContainsOrder(path, adjacency, order) {
  for (let index = 0; index < path.length - 1; index += 1) {
    const edge = (adjacency.get(path[index]) ?? []).find((neighbor) => neighbor.id === path[index + 1]);
    if (edge?.order === order) return true;
  }
  return false;
}

function countAttachedSubstituents(path, adjacency) {
  const chain = new Set(path);
  let count = 0;
  for (const id of path) {
    for (const neighbor of adjacency.get(id) ?? []) {
      if (!chain.has(neighbor.id)) count += 1;
    }
  }
  return count;
}

function collectBranchNodes(startId, blocked, adjacency) {
  const nodes = [];
  const visited = new Set([startId]);
  const stack = [startId];
  while (stack.length) {
    const current = stack.pop();
    nodes.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      if (blocked.has(neighbor.id) || visited.has(neighbor.id)) continue;
      visited.add(neighbor.id);
      stack.push(neighbor.id);
    }
  }
  return nodes;
}

function substituentsForPath(path, adjacency) {
  const chain = new Set(path);
  const indexOf = new Map(path.map((id, index) => [id, index]));
  const substituents = [];

  for (const id of path) {
    const offChain = (adjacency.get(id) ?? []).filter((neighbor) => !chain.has(neighbor.id));
    for (const neighbor of offChain) {
      const branchNodes = collectBranchNodes(neighbor.id, chain, adjacency);
      const root = stemFor(branchNodes.length);
      if (!root) return null;
      substituents.push({
        locant: (indexOf.get(id) ?? 0) + 1,
        name: `${root}il`,
        size: branchNodes.length,
        anchor: id,
      });
    }
  }

  return substituents;
}

function multipleBondLocant(path, adjacency, order) {
  for (let index = 0; index < path.length - 1; index += 1) {
    const edge = (adjacency.get(path[index]) ?? []).find((neighbor) => neighbor.id === path[index + 1]);
    if (edge?.order === order) return Math.min(index + 1, path.length - index - 1);
  }
  return null;
}

function scoreNaming(entry) {
  const substituentLocants = entry.substituents.map((item) => item.locant).sort((a, b) => a - b);
  return [
    entry.multipleLocant ?? 0,
    ...substituentLocants,
    entry.parentLength,
  ];
}

function betterNaming(a, b) {
  const aScore = scoreNaming(a);
  const bScore = scoreNaming(b);
  for (let index = 0; index < Math.max(aScore.length, bScore.length); index += 1) {
    if ((aScore[index] ?? 0) !== (bScore[index] ?? 0)) {
      return (aScore[index] ?? 0) < (bScore[index] ?? 0);
    }
  }
  return false;
}

function composeSubstituentPrefix(substituents) {
  if (!substituents.length) return '';
  const groups = new Map();
  for (const substituent of [...substituents].sort((a, b) => a.locant - b.locant || a.name.localeCompare(b.name))) {
    if (!groups.has(substituent.name)) groups.set(substituent.name, []);
    groups.get(substituent.name).push(substituent.locant);
  }

  return [...groups.entries()]
    .map(([name, locants]) => {
      const sorted = locants.sort((a, b) => a - b);
      const multiplier = MULTIPLIERS[sorted.length] ?? '';
      return `${sorted.join(',')}-${multiplier}${name}`;
    })
    .join('-');
}

export function describeStructure(molecule) {
  const analysis = analyzeMolecule(molecule);
  if (!analysis.connected || !analysis.acyclic || analysis.carbonCount === 0) return null;
  if (analysis.category === 'campuran' || !analysis.category) return null;

  const adjacency = getAdjacency(molecule);
  const paths = enumeratePaths(adjacency);
  const requiredOrder = analysis.category === 'alkena' ? 2 : analysis.category === 'alkuna' ? 3 : null;

  let candidates = requiredOrder
    ? paths.filter((path) => pathContainsOrder(path, adjacency, requiredOrder))
    : paths;
  if (!candidates.length) return null;

  const longest = Math.max(...candidates.map((path) => path.length));
  candidates = candidates.filter((path) => path.length === longest);

  const maxSubstituents = Math.max(
    ...candidates.map((path) => countAttachedSubstituents(path, adjacency)),
  );
  candidates = candidates.filter(
    (path) => countAttachedSubstituents(path, adjacency) === maxSubstituents,
  );

  const options = [];
  for (const path of candidates) {
    for (const oriented of [path, [...path].reverse()]) {
      const substituents = substituentsForPath(oriented, adjacency);
      if (substituents === null) continue;
      const multipleLocant = requiredOrder
        ? multipleBondLocant(oriented, adjacency, requiredOrder)
        : null;
      options.push({
        path: oriented,
        substituents,
        multipleLocant,
        parentLength: oriented.length,
      });
    }
  }

  if (!options.length) return null;
  options.sort((a, b) => (betterNaming(a, b) ? -1 : 1));
  const chosen = options[0];
  let parent = stemFor(chosen.parentLength);
  if (!parent) return null;

  const suffixMap = { alkana: 'ana', alkena: 'ena', alkuna: 'una' };
  const suffix = suffixMap[analysis.category];
  const prefix = composeSubstituentPrefix(chosen.substituents);

  let name;
  if (analysis.category === 'alkana') {
    name = `${prefix}${parent}${suffix}`;
  } else {
    const includeLocant = chosen.parentLength > 3;
    const locantPart = includeLocant ? `${chosen.multipleLocant}` : '';
    const prefixParts = [prefix, locantPart].filter(Boolean).join('-');
    name = `${prefixParts ? `${prefixParts}-` : ''}${parent}${suffix}`;
  }

  return {
    name,
    category: analysis.category,
    parentLength: chosen.parentLength,
    multipleLocant: chosen.multipleLocant,
    substituents: chosen.substituents,
    formula: analysis.formula,
    analysis,
  };
}

export function tokenType(token) {
  if (!token) return null;
  if (/^\d+$/.test(token)) return 'locant';
  if (STEMS.includes(token)) return 'stem';
  if (SUFFIXES.includes(token)) return 'suffix';
  if (SUBSTITUENTS.includes(token)) return 'substituent';
  return null;
}

export function formatNameTokens(tokens) {
  const filled = tokens.filter(Boolean);
  if (!filled.length) return '';
  const stemIndex = filled.findIndex((token) => tokenType(token) === 'stem');
  const suffix = filled.find((token) => tokenType(token) === 'suffix')?.replace(/^-/, '') ?? '';

  if (stemIndex === -1) {
    return filled.join('-');
  }

  const prefixTokens = filled.slice(0, stemIndex);
  const stem = filled[stemIndex];
  const trailing = filled.slice(stemIndex + 1).filter((token) => tokenType(token) !== 'suffix');
  const prefix = prefixTokens.join('-');
  const attachesDirectly =
    prefixTokens.length > 0 && tokenType(prefixTokens[prefixTokens.length - 1]) === 'substituent';
  const prefixPart = prefix ? `${prefix}${attachesDirectly ? '' : '-'}` : '';
  const tail = trailing.length ? `-${trailing.join('-')}` : '';
  return `${prefixPart}${stem}${suffix || ''}${tail}`;
}

export function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[–—]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function validateTokenOrder(tokens) {
  const filled = tokens.filter(Boolean);
  let sawStem = false;
  let sawSuffix = false;
  for (const token of filled) {
    const type = tokenType(token);
    if (!type) return false;
    if (sawSuffix) return false;
    if (type === 'suffix') {
      sawSuffix = true;
      continue;
    }
    if (type === 'stem') {
      if (sawStem) return false;
      sawStem = true;
      continue;
    }
    if (sawStem) return false;
  }
  return sawStem;
}
