import { analyzeMolecule } from '../src/chemistry/graph.js';
import { describeStructure } from '../src/chemistry/nomenclature.js';

const atom = (id, x, y) => ({ id, x, y });
const bond = (a, b, order = 1) => ({ a, b, order });
const zigzag = (n) =>
  Array.from({ length: n }, (_, i) => atom(i, 62 + i * 66, i % 2 === 0 ? 118 : 78));

// Same molecule written from the opposite end: a double bond at locant k equals locant n-k.
const chain = (n, order = null, locant = null) => ({
  nodes: zigzag(n),
  edges: Array.from({ length: n - 1 }, (_, i) =>
    bond(i, i + 1, order && i === locant - 1 ? order : 1),
  ),
});

function branched(parentLength, branches, bondSpec = null) {
  const nodes = zigzag(parentLength);
  const edges = Array.from({ length: parentLength - 1 }, (_, i) =>
    bond(i, i + 1, bondSpec && i === bondSpec.locant - 1 ? bondSpec.order : 1),
  );
  const used = new Map();
  let nextId = parentLength;
  branches.forEach(({ at, size = 1 }) => {
    const anchorIndex = at - 1;
    const anchor = nodes[anchorIndex];
    const slot = used.get(anchorIndex) ?? 0;
    used.set(anchorIndex, slot + 1);
    const direction = slot % 2 === 0 ? -1 : 1;
    const side = slot % 2 === 0 ? -1 : 1;
    const distance = 62 + Math.floor(slot / 2) * 56;
    let previous = anchorIndex;
    for (let step = 1; step <= size; step += 1) {
      const id = nextId;
      nextId += 1;
      nodes.push(atom(id, anchor.x + side * 14 * step, anchor.y + direction * (distance + (step - 1) * 56)));
      edges.push(bond(previous, id));
      previous = id;
    }
  });
  return { nodes, edges };
}

// Locant counted from the far end for the same skeleton.
const flip = (n, locant) => n - locant;

const CASES = [
  ['hept-3-ene, bond written from left', chain(7, 2, 3), '3-heptena'],
  ['hept-3-ene, same bond from right', chain(7, 2, flip(7, 3)), '3-heptena'],
  ['oct-3-ene', chain(8, 2, 3), '3-oktena'],
  ['oct-3-ene mirrored', chain(8, 2, flip(8, 3)), '3-oktena'],
  ['oct-4-ene (central bond)', chain(8, 2, 4), '4-oktena'],
  ['oct-3-yne', chain(8, 3, 3), '3-oktuna'],
  ['oct-3-yne mirrored', chain(8, 3, flip(8, 3)), '3-oktuna'],
  ['non-2-ene', chain(9, 2, 2), '2-nonena'],
  ['non-2-ene mirrored', chain(9, 2, flip(9, 2)), '2-nonena'],
  ['dec-4-ene', chain(10, 2, 4), '4-dekena'],
  ['dec-4-ene mirrored', chain(10, 2, flip(10, 4)), '4-dekena'],
  ['dec-5-ene (exact tie)', chain(10, 2, 5), '5-dekena'],
  ['dek-1-una at the tail', chain(10, 3, flip(10, 1)), '1-dekuna'],
  ['2-metilnonana (C10 total, not dekana)', branched(9, [{ at: 2 }]), '2-metilnonana'],
  ['4-etil-2-metiloktana (alphabetical, not locant order)',
    branched(8, [{ at: 4, size: 2 }, { at: 2 }]), '4-etil-2-metiloktana'],
  ['3-etil-2-metilheksana', branched(6, [{ at: 3, size: 2 }, { at: 2 }]), '3-etil-2-metilheksana'],
  ['2,2,3-trimetilheksana', branched(6, [{ at: 2 }, { at: 2 }, { at: 3 }]), '2,2,3-trimetilheksana'],
  ['2,3,5-trimetilnonana', branched(9, [{ at: 2 }, { at: 3 }, { at: 5 }]), '2,3,5-trimetilnonana'],
  ['3,5-dietilheptana', branched(7, [{ at: 3, size: 2 }, { at: 5, size: 2 }]), '3,5-dietilheptana'],
  ['2,2-dimetilnonana', branched(9, [{ at: 2 }, { at: 2 }]), '2,2-dimetilnonana'],
  ['straight C10 chain (naming ceiling)', chain(10), 'dekana'],
  ['C11 frame named through its longest parent', branched(8, [{ at: 4, size: 2 }, { at: 2 }]), '4-etil-2-metiloktana'],
];

let failures = 0;
for (const [label, molecule, expected] of CASES) {
  const description = describeStructure(molecule);
  const got = description?.name ?? '(unnamed)';
  const formula = analyzeMolecule(molecule).formula;
  const ok = expected == null || got === expected;
  if (!ok) failures += 1;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(48)} got=${got.padEnd(24)} want=${String(expected ?? 'n/a').padEnd(24)} ${formula}`,
  );
}
console.log(`\ncases=${CASES.length} failures=${failures}`);
process.exit(failures ? 1 : 0);
