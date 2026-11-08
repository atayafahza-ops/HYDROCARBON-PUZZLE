import {
  analyzeMolecule,
  cloneMolecule,
  elementOf,
  hydrogensForAtom,
} from '../../chemistry/graph.js';
import { addSubstituentNode } from '../data/molecules.js';
import { getReagent } from '../data/reagents.js';

function findReactiveBond(graph) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  let best = null;
  for (const edge of graph.edges) {
    const a = nodeById.get(edge.a);
    const b = nodeById.get(edge.b);
    if (!a || !b) continue;
    if (elementOf(a) !== 'C' || elementOf(b) !== 'C') continue;
    if (edge.order < 2) continue;
    if (!best || edge.order > best.order) best = edge;
  }
  return best;
}

function markovnikovTarget(graph, edge) {
  const hA = hydrogensForAtom(graph, edge.a);
  const hB = hydrogensForAtom(graph, edge.b);
  if (hA === hB) return edge.a;
  return hA < hB ? edge.a : edge.b;
}

function addNode(graph, anchorId, element, order = 1) {
  return addSubstituentNode(graph.nodes, graph.edges, anchorId, element, order);
}

function fail(error, message, suggestion) {
  return { ok: false, error, message, suggestion };
}

function tautomerizeEnol(graph, edge) {
  const product = cloneMolecule(graph);
  const reactive = product.edges.find(
    (candidate) =>
      (candidate.a === edge.a && candidate.b === edge.b) ||
      (candidate.a === edge.b && candidate.b === edge.a),
  );
  if (!reactive || reactive.order !== 2) return product;
  let oxygen = null;
  let oxygenAnchor = null;
  for (const node of product.nodes) {
    if (elementOf(node) !== 'O') continue;
    const attached = product.edges.some(
      (candidate) =>
        candidate.order === 1 &&
        ((candidate.a === edge.a && candidate.b === node.id) ||
          (candidate.b === edge.a && candidate.a === node.id)),
    );
    if (attached) {
      oxygen = node;
      oxygenAnchor = edge.a;
      break;
    }
    const attachedB = product.edges.some(
      (candidate) =>
        candidate.order === 1 &&
        ((candidate.a === edge.b && candidate.b === node.id) ||
          (candidate.b === edge.b && candidate.a === node.id)),
    );
    if (attachedB) {
      oxygen = node;
      oxygenAnchor = edge.b;
      break;
    }
  }
  if (!oxygen) return product;
  const oxygenBond = product.edges.find(
    (candidate) =>
      (candidate.a === oxygenAnchor && candidate.b === oxygen.id) ||
      (candidate.b === oxygenAnchor && candidate.a === oxygen.id),
  );
  oxygenBond.order = 2;
  reactive.order = 1;
  return product;
}

export function resolveReaction(reactant, reagentId, conditions = {}) {
  const reagent = getReagent(reagentId);
  if (!reagent) {
    return fail('unknown-reagent', 'Reagen tidak dikenal.', 'Pilih reagen dari daftar yang tersedia.');
  }
  const graph = cloneMolecule(reactant);
  const bond = findReactiveBond(graph);
  if (!bond) {
    return fail(
      'no-multiple-bond',
      'Tidak ada ikatan rangkap C–C pada molekul ini.',
      'Reaksi adisi membutuhkan alkena atau alkuna.',
    );
  }

  const isAlkyne = bond.order === 3;
  const catalyst = conditions.catalyst ?? 'none';
  const equivalents = Math.max(1, Number(conditions.equivalents) || 1);
  const peroxide = Boolean(conditions.peroxide);
  const rule = { reagent: reagentId, catalyst, equivalents, peroxide };

  const finish = (product, extra = {}) => ({
    ok: true,
    product,
    rule: { ...rule, ...extra.rule },
    notes: extra.notes ?? [],
    intermediate: extra.intermediate ?? null,
    reactiveBond: { a: bond.a, b: bond.b },
  });

  // ---- Hydrogenation ----
  if (reagentId === 'H2') {
    if (catalyst === 'Lindlar') {
      if (!isAlkyne) {
        return fail(
          'wrong-catalyst',
          'Katalis Lindlar hanya digunakan untuk menghentikan hidrogenasi alkuna pada tahap alkena.',
          'Untuk alkena, gunakan Ni, Pt, atau Pd.',
        );
      }
      bond.order = 2;
      return finish(graph, {
        rule: { pathway: 'hydrogenation-lindlar', finalOrder: 2 },
        notes: ['Lindlar menghentikan reduksi pada ikatan rangkap dua (alkena).'],
      });
    }
    if (!['Ni', 'Pt', 'Pd'].includes(catalyst)) {
      return fail(
        'missing-catalyst',
        'Hidrogenasi membutuhkan katalis logam (Ni, Pt, atau Pd).',
        'Pilih katalis logam pada panel kondisi.',
      );
    }
    const rounds = isAlkyne ? 2 : 1;
    if (equivalents < rounds) {
      return fail(
        'equivalents',
        isAlkyne
          ? 'Alkuna membutuhkan 2 ekuivalen H₂ untuk menjadi alkana penuh.'
          : 'Alkena membutuhkan 1 ekuivalen H₂.',
        `Atur ekuivalen H₂ menjadi ${rounds}.`,
      );
    }
    bond.order = 1;
    return finish(graph, {
      rule: { pathway: 'hydrogenation', finalOrder: 1 },
      notes: isAlkyne
        ? ['Dua ekuivalen H₂ mereduksi C≡C menjadi C–C.']
        : ['H₂ menambah melintasi C=C menjadi ikatan tunggal.'],
    });
  }

  // ---- Halogenation (X2) ----
  if (reagentId === 'Br2' || reagentId === 'Cl2') {
    const element = reagentId === 'Br2' ? 'Br' : 'Cl';
    if (peroxide) {
      return fail(
        'peroxide-irrelevant',
        'Peroksida hanya memengaruhi orientasi HBr, bukan halogenasi X₂.',
        'Matikan peroksida untuk reaksi ini.',
      );
    }
    const rounds = isAlkyne ? Math.min(2, equivalents) : 1;
    const finalOrder = isAlkyne ? (rounds >= 2 ? 1 : 2) : 1;
    for (let round = 0; round < rounds; round += 1) {
      addNode(graph, bond.a, element);
      addNode(graph, bond.b, element);
    }
    bond.order = finalOrder;
    return finish(graph, {
      rule: { pathway: 'halogenation', finalOrder, rounds },
      notes: rounds === 2
        ? ['Dua ekuivalen X₂ menambahkan empat atom halogen (tetrahalida).']
        : isAlkyne
          ? ['Satu ekuivalen X₂ pada alkuna berhenti pada dihaloalkena.']
          : ['Satu atom halogen masuk ke tiap karbon ikatan rangkap (vicinal).'],
    });
  }

  // ---- Hydrohalogenation (HX) ----
  if (reagentId === 'HCl' || reagentId === 'HBr' || reagentId === 'HI') {
    const element = reagentId === 'HCl' ? 'Cl' : reagentId === 'HBr' ? 'Br' : 'I';
    if (peroxide && reagentId !== 'HBr') {
      return fail(
        'peroxide-only-hbr',
        'Efek peroksida (anti-Markovnikov) hanya berlaku untuk HBr.',
        'Gunakan HBr dengan peroksida, atau matikan peroksida.',
      );
    }
    const anti = peroxide && reagentId === 'HBr';
    const markovCarbon = markovnikovTarget(graph, bond);
    const otherCarbon = markovCarbon === bond.a ? bond.b : bond.a;
    const xCarbon = anti ? otherCarbon : markovCarbon;
    const rounds = isAlkyne ? Math.min(2, equivalents) : 1;
    for (let round = 0; round < rounds; round += 1) {
      addNode(graph, xCarbon, element);
    }
    bond.order = isAlkyne ? (rounds >= 2 ? 1 : 2) : 1;
    return finish(graph, {
      rule: {
        pathway: anti ? 'hydrohalogenation-anti' : 'hydrohalogenation',
        orientation: anti ? 'anti-markovnikov' : 'markovnikov',
        finalOrder: bond.order,
        rounds,
      },
      notes: anti
        ? ['Peroksida membalik orientasi: Br masuk ke karbon yang kurang tersubstitusi (anti-Markovnikov).']
        : rounds === 2
          ? ['Dua ekuivalen HX menghasilkan dihalida geminal: dua X pada karbon yang sama.']
          : ['H masuk ke karbon dengan lebih banyak H; X masuk mengikuti Markovnikov.'],
    });
  }

  // ---- Hydration ----
  if (reagentId === 'H2O') {
    if (peroxide) {
      return fail(
        'peroxide-irrelevant',
        'Peroksida tidak berperan dalam hidrasi.',
        'Matikan peroksida untuk reaksi ini.',
      );
    }
    if (isAlkyne) {
      if (catalyst !== 'HgSO4/H2SO4') {
        return fail(
          'missing-catalyst',
          'Hidrasi alkuna membutuhkan katalis HgSO₄ dalam H₂SO₄.',
          'Pilih katalis HgSO₄ / H₂SO₄ pada panel kondisi.',
        );
      }
      const markovCarbon = markovnikovTarget(graph, bond);
      addNode(graph, markovCarbon, 'O');
      bond.order = 2;
      const enol = cloneMolecule(graph);
      const product = tautomerizeEnol(graph, bond);
      return finish(product, {
        rule: { pathway: 'hydration-alkyne', finalOrder: 1, tautomerized: true },
        notes: [
          'Hidrasi alkuna membentuk enol (C=C–OH) sebagai zat antara.',
          'Enol bertautomerisasi: C–O menjadi C=O dan C=C menjadi C–C (keto).',
        ],
        intermediate: enol,
      });
    }
    if (catalyst !== 'H2SO4') {
      return fail(
        'missing-catalyst',
        'Hidrasi alkena membutuhkan katalis asam (H₂SO₄).',
        'Pilih katalis H₂SO₄ pada panel kondisi.',
      );
    }
    const markovCarbon = markovnikovTarget(graph, bond);
    addNode(graph, markovCarbon, 'O');
    bond.order = 1;
    return finish(graph, {
      rule: { pathway: 'hydration', finalOrder: 1 },
      notes: ['OH masuk mengikuti Markovnikov; H masuk ke karbon dengan lebih banyak H.'],
    });
  }

  return fail('unsupported', 'Kombinasi reagen ini belum didukung.', 'Coba reagen lain.');
}

export function expectedAtomCounts(reactant, reagentId, rule) {
  const analysis = analyzeMolecule(reactant);
  const counts = { ...analysis.elementCounts };
  const reagent = getReagent(reagentId);
  if (!reagent) return counts;
  const rounds = rule?.rounds ?? (reagentId === 'H2' && rule?.pathway === 'hydrogenation' && rule?.equivalents >= 2 ? 2 : 1);
  for (const [element, amount] of Object.entries(reagent.atoms)) {
    counts[element] = (counts[element] ?? 0) + amount * rounds;
  }
  return counts;
}