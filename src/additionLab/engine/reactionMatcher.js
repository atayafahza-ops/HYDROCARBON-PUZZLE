import { analyzeMolecule } from '../../chemistry/graph.js';
import { REACTION_RULES } from '../data/reactionRules.js';

export const MATCH_STATUS = {
  MATCHED: 'matched',
  AMBIGUOUS: 'ambiguous',
  NO_MATCH: 'no_match',
};

export const ACTIVE_METALS = ['Ni', 'Pt', 'Pd'];

export function substrateKindOf(graph) {
  const analysis = analyzeMolecule(graph);
  if (analysis.carbonTripleBonds > 0) return 'alkyne';
  if (analysis.carbonDoubleBonds > 0) {
    if (hasEnolDoubleBond(graph)) return 'enol';
    return 'alkene';
  }
  return 'alkane';
}

export function hasEnolDoubleBond(graph) {
  for (const edge of graph.edges) {
    if (edge.order !== 2) continue;
    const a = graph.nodes.find((node) => node.id === edge.a);
    const b = graph.nodes.find((node) => node.id === edge.b);
    if (!a || !b) continue;
    for (const endpoint of [a, b]) {
      const carriesO = graph.edges.some((candidate) => {
        const otherId = candidate.a === endpoint.id ? candidate.b : candidate.b === endpoint.id ? candidate.a : null;
        if (otherId === null) return false;
        const other = graph.nodes.find((node) => node.id === otherId);
        return candidate.order === 1 && other?.element === 'O';
      });
      if (carriesO) return true;
    }
  }
  return false;
}

// Matcher mengembalikan status 'ambiguous' bila kondisi belum cukup spesifik (GDD §13.4).
export function matchReaction({ reactantGraph, reagentId, conditions }) {
  const substrate = substrateKindOf(reactantGraph);
  const normalized = {
    catalyst: conditions?.catalyst ?? 'none',
    equivalents: conditions?.equivalents ?? 1,
    peroxide: Boolean(conditions?.peroxide),
  };

  const candidates = Object.values(REACTION_RULES)
    .filter((rule) => rule.substrate === substrate && rule.reagent.includes(reagentId));
  if (candidates.length === 0) {
    return {
      status: MATCH_STATUS.NO_MATCH,
      code: 'WRONG_REAGENT',
      message: `${reagentId} bukan pereaksi adisi untuk substrat ${substrate} ini. Pilih pereaksi dari kategori yang sesuai.`,
    };
  }

  if (normalized.peroxide && reagentId !== 'HBr') {
    return {
      status: MATCH_STATUS.NO_MATCH,
      code: 'WRONG_CONDITION',
      message: 'Peroksida hanya berlaku pada HBr dalam kondisi radikal — jangan digeneralisasi ke HX lain.',
    };
  }

  const peroxideCandidates = candidates.filter((rule) => rule.peroxide === normalized.peroxide);
  if (peroxideCandidates.length === 0) {
    return {
      status: MATCH_STATUS.NO_MATCH,
      code: 'WRONG_CONDITION',
      message: normalized.peroxide
        ? 'Tidak ada aturan adisi dengan peroksida untuk kombinasi ini — matikan peroksida.'
        : 'Reagen ini butuh peroksida untuk bereaksi pada substrat tersebut.',
    };
  }

  // Katalis 'none' pada H₂ + alkuna berarti kondisi belum ditentukan (GDD §13.4):
  // Lindlar berhenti di alkena, logam aktif mereduksi penuh — cek sebelum filter lain.
  if (reagentId === 'H2' && substrate === 'alkyne' && normalized.catalyst === 'none') {
    return {
      status: MATCH_STATUS.AMBIGUOUS,
      code: null,
      candidates: peroxideCandidates.map((rule) => rule.id),
      message: 'Kondisi belum cukup spesifik: pada alkuna, katalis Lindlar menghentikan reduksi di alkena sedangkan katalis logam aktif (Ni/Pt/Pd) mereduksi hingga alkana. Tentukan katalisnya.',
    };
  }

  const equivalentCandidates = peroxideCandidates.filter((rule) => Number(normalized.equivalents) === rule.equivalents);
  if (equivalentCandidates.length === 0) {
    const needed = [...new Set(peroxideCandidates.map((rule) => rule.equivalents))].sort((a, b) => a - b).join(' atau ');
    return {
      status: MATCH_STATUS.NO_MATCH,
      code: 'WRONG_EQUIVALENT',
      message: `Jumlah ekuivalen tidak sesuai: aturan yang tersedia butuh ${needed} ekuivalen.`,
    };
  }

  const catalystCandidates = equivalentCandidates.filter((rule) => rule.catalysts.includes(normalized.catalyst));
  if (catalystCandidates.length === 0) {
    const accepted = [...new Set(equivalentCandidates.flatMap((rule) => rule.catalysts))].join(', ');
    return {
      status: MATCH_STATUS.NO_MATCH,
      code: 'WRONG_CONDITION',
      message: `Kondisi tidak cocok: katalis "${normalized.catalyst}" tidak dipakai oleh aturan ini. Katalis yang berlaku: ${accepted}.`,
    };
  }

  return {
    status: MATCH_STATUS.MATCHED,
    rule: catalystCandidates[0],
    code: null,
    message: null,
  };
}