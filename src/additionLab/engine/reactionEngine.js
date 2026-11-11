import { identifyMolecule } from '../data/molecules.js';
import { matchReaction } from './reactionMatcher.js';
import {
  expectedAtomCounts,
  generateProduct,
} from './productGenerator.js';

export { expectedAtomCounts } from './productGenerator.js';

export function runReaction({
  reactantGraph,
  reagentId,
  conditions = { catalyst: 'none', equivalents: 1, peroxide: false },
  stageEnol = false,
}) {
  const match = matchReaction({ reactantGraph, reagentId, conditions });
  if (match.status !== 'matched') {
    return { status: match.status, code: match.code ?? null, message: match.message, candidates: match.candidates ?? null };
  }

  const rule = match.rule;
  const generated = generateProduct(reactantGraph, rule, reagentId, { stageEnol });
  if (!generated.ok) {
    return { status: 'no_match', code: 'NO_MATCH', message: 'Reaksi tidak dapat berjalan pada struktur ini.', candidates: null };
  }

  const product = generated.product;
  const intermediate = generated.intermediate ?? null;
  const identified = identifyMolecule(product);
  const intermediateIdentified = intermediate ? identifyMolecule(intermediate) : null;

  return {
    status: 'matched',
    rule,
    product,
    intermediate,
    reactiveBond: generated.reactiveBond ?? null,
    notes: generated.notes ?? [],
    expectedAtomCounts: expectedAtomCounts(reactantGraph, reagentId, rule),
    productName: identified?.name ?? null,
    productId: identified?.id ?? null,
    intermediateName: intermediateIdentified?.name ?? null,
    intermediateId: intermediateIdentified?.id ?? null,
  };
}

export function describeMatchFailure({ reactantGraph, reagentId, conditions }) {
  const match = matchReaction({ reactantGraph, reagentId, conditions });
  if (match.status === 'matched') return null;
  return {
    status: match.status,
    code: match.code ?? null,
    message: match.message,
    candidates: match.candidates ?? null,
  };
}
