import { analyzeMolecule, computeHydrogens } from '../chemistry/graph.js';
import { toSubscript } from '../chemistry/formula.js';

function hydrogenLabel(hydrogen) {
  if (hydrogen === 0) return 'C';
  if (hydrogen === 1) return 'CH';
  return `CH${toSubscript(hydrogen)}`;
}

function fallbackCoordinates(nodes) {
  if (nodes.length === 1) return new Map([[nodes[0].id, { x: 180, y: 100 }]]);
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  const positions = new Map();
  nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    positions.set(node.id, {
      x: 60 + (col * 260) / Math.max(1, cols - 1),
      y: 40 + (row * 140) / Math.max(1, rows - 1),
    });
  });
  return positions;
}

function coordsFor(molecule) {
  const everyNodeHasPosition = molecule.nodes.every(
    (node) => Number.isFinite(node.x) && Number.isFinite(node.y),
  );
  if (!everyNodeHasPosition) return fallbackCoordinates(molecule.nodes);
  return new Map(molecule.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
}

function lineMarkup(x1, y1, x2, y2, className = '') {
  return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" class="${className}"/>`;
}

function bondLines(a, b, order) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const trim = 22;
  const ux = dx / length;
  const uy = dy / length;
  const x1 = a.x + ux * trim;
  const y1 = a.y + uy * trim;
  const x2 = b.x - ux * trim;
  const y2 = b.y - uy * trim;
  const offsets = order === 3 ? [-6, 0, 6] : order === 2 ? [-4.4, 4.4] : [0];
  return offsets
    .map((offset) =>
      lineMarkup(
        x1 + nx * offset,
        y1 + ny * offset,
        x2 + nx * offset,
        y2 + ny * offset,
        `structure-bond structure-bond--${order}`,
      ),
    )
    .join('');
}

export function renderStructureSVG(molecule, options = {}) {
  const className = options.className ?? 'structure-svg';
  const ariaLabel = options.ariaLabel ?? 'Struktur molekul hidrokarbon';
  if (!molecule?.nodes?.length) {
    return `<div class="structure-empty">Struktur belum tersedia</div>`;
  }

  const coords = coordsFor(molecule);
  const hydrogens = computeHydrogens(molecule);
  const xs = [...coords.values()].map((point) => point.x);
  const ys = [...coords.values()].map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padX = 92;
  const padY = 64;
  const viewX = minX - padX;
  const viewY = minY - padY;
  const viewW = Math.max(240, maxX - minX + padX * 2);
  const viewH = Math.max(190, maxY - minY + padY * 2);

  const bonds = molecule.edges
    .map((edge) => {
      const a = coords.get(edge.a);
      const b = coords.get(edge.b);
      if (!a || !b) return '';
      return bondLines(a, b, edge.order);
    })
    .join('');

  const labels = molecule.nodes
    .map((node) => {
      const point = coords.get(node.id);
      if (!point) return '';
      const hydrogen = hydrogens.get(node.id) ?? 0;
      const label = hydrogen < 0 ? 'C' : hydrogenLabel(hydrogen);
      return `<text x="${point.x}" y="${point.y}" class="structure-atom${hydrogen < 0 ? ' is-invalid' : ''}" text-anchor="middle" dominant-baseline="central">${label}</text>`;
    })
    .join('');

  const formula = analyzeMolecule(molecule).formula;

  return `<svg class="${className}" viewBox="${viewX} ${viewY} ${viewW} ${viewH}" role="img" aria-label="${ariaLabel}, rumus ${formula}" preserveAspectRatio="xMidYMid meet">
    <g class="structure-bonds" aria-hidden="true">${bonds}</g>
    <g class="structure-labels">${labels}</g>
  </svg>`;
}
