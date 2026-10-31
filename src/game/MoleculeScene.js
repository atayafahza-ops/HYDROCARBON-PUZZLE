import Phaser from 'phaser';
import {
  MAX_ATOMS,
  analyzeMolecule,
  bondOrderAt,
  cloneMolecule,
  computeHydrogens,
  findAtom,
  findEdge,
  MAX_VALENCE,
} from '../chemistry/graph.js';
import { toSubscript } from '../chemistry/formula.js';

const PALETTE = {
  grid: 0x29405f,
  gridMajor: 0x33506f,
  gridDot: 0x22d3ee,
  bondSingle: 0x22d3ee,
  bondDouble: 0x10b981,
  bondTriple: 0xfbbf24,
  bondShadow: 0x050b16,
  atomFill: 0x14243c,
  atomFillInvalid: 0x3b1420,
  atomRing: 0x22d3ee,
  atomRingHover: 0xf8fafc,
  atomRingSelected: 0x10b981,
  atomRingInvalid: 0xf43f5e,
  atomGlow: 0x22d3ee,
  label: '#f8fafc',
  labelInvalid: '#fecdd3',
};

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.4;
const ROOMY_GAP = 80;
const COMPACT_GAP = 60;
const ROOMY_MARGIN = 60;
const COMPACT_MARGIN = 32;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function atomLabel(hydrogen) {
  if (hydrogen < 0) return 'C';
  if (hydrogen === 0) return 'C';
  if (hydrogen === 1) return 'CH';
  return `CH${toSubscript(hydrogen)}`;
}

export class MoleculeScene extends Phaser.Scene {
  constructor(hooks = {}) {
    super({ key: 'MoleculeScene' });
    this.hooks = hooks;
    this.molecule = { nodes: [], edges: [] };
    this.nextAtomId = 0;
    this.selectedId = null;
    this.hoverId = null;
    this.activeBondOrder = 1;
    this.history = [];
    this.dragState = null;
    this.locked = false;
    this.ready = false;
    this.atomVisuals = new Map();
    this.validationMarks = new Set();
    this.width = 0;
    this.height = 0;
    this.view = { scale: 1, x: 0, y: 0 };
    this.pointers = new Map();
    this.pinch = null;
  }

  create() {
    this.width = Math.max(1, this.scale.width);
    this.height = Math.max(1, this.scale.height);
    this.worldLayer = this.add.container(0, 0);
    this.gridLayer = this.add.graphics();
    this.bondLayer = this.add.graphics();
    this.atomLayer = this.add.container(0, 0);
    this.worldLayer.add([this.gridLayer, this.bondLayer, this.atomLayer]);

    if (this.game?.canvas) this.game.canvas.style.touchAction = 'none';

    this.input.mouse?.disableContextMenu?.();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.on('wheel', this.onWheel, this);
    this.input.on('gameout', () => {
      if (this.hoverId !== null) {
        this.hoverId = null;
        this.syncAtomVisuals();
      }
    });
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    this.drawGrid();
    this.syncAtomVisuals();
    this.drawBonds();
    this.applyView();
    this.ready = true;
    this.emitUpdate();
    this.hooks.onReady?.();
  }

  onShutdown() {
    this.input?.removeAllListeners();
    this.scale?.off('resize', this.onResize, this);
    this.pointers?.clear();
    this.pinch = null;
    this.game?.canvas?.style && (this.game.canvas.style.cursor = 'default');
  }

  onResize(gameSize) {
    this.width = Math.max(1, gameSize.width);
    this.height = Math.max(1, gameSize.height);
    this.clampAtomsToCanvas();
    this.drawGrid();
    this.syncAtomVisuals();
    this.drawBonds();
    this.applyView();
  }

  clampAtomsToCanvas() {
    const margin = this.snapMargin();
    for (const node of this.molecule.nodes) {
      node.x = clamp(node.x, margin, Math.max(margin, this.width - margin));
      node.y = clamp(node.y, margin, Math.max(margin, this.height - margin));
    }
  }

  drawGrid() {
    const graphics = this.gridLayer;
    if (!graphics) return;
    graphics.clear();

    const cell = 40;
    graphics.fillStyle(0x0b1526, 0.35);
    graphics.fillRect(0, 0, this.width, this.height);

    graphics.lineStyle(1, PALETTE.grid, 0.34);
    for (let x = cell; x < this.width; x += cell) {
      graphics.lineBetween(x, 0, x, this.height);
    }
    for (let y = cell; y < this.height; y += cell) {
      graphics.lineBetween(0, y, this.width, y);
    }

    graphics.lineStyle(1, PALETTE.gridMajor, 0.5);
    for (let x = cell * 4; x < this.width; x += cell * 4) {
      graphics.lineBetween(x, 0, x, this.height);
    }
    for (let y = cell * 4; y < this.height; y += cell * 4) {
      graphics.lineBetween(0, y, this.width, y);
    }

    graphics.fillStyle(PALETTE.gridDot, 0.4);
    for (let x = cell * 4; x < this.width; x += cell * 4) {
      for (let y = cell * 4; y < this.height; y += cell * 4) {
        graphics.fillCircle(x, y, 1.6);
      }
    }
  }

  screenToWorld(x, y) {
    const scale = this.view.scale || 1;
    return { x: (x - this.view.x) / scale, y: (y - this.view.y) / scale };
  }

  applyView() {
    const scale = this.view.scale;
    if (scale <= 1.0001) {
      this.view.x = (this.width * (1 - scale)) / 2;
      this.view.y = (this.height * (1 - scale)) / 2;
    } else {
      this.view.x = clamp(this.view.x, this.width * (1 - scale), 0);
      this.view.y = clamp(this.view.y, this.height * (1 - scale), 0);
    }
    this.worldLayer?.setPosition(this.view.x, this.view.y);
    this.worldLayer?.setScale(scale);
    this.hooks.onZoom?.(Math.round(scale * 100));
  }

  zoomAt(nextScale, anchorX = this.width / 2, anchorY = this.height / 2) {
    const scale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(scale - this.view.scale) < 0.001) {
      this.applyView();
      return;
    }
    const world = {
      x: (anchorX - this.view.x) / this.view.scale,
      y: (anchorY - this.view.y) / this.view.scale,
    };
    this.view.scale = scale;
    this.view.x = anchorX - world.x * scale;
    this.view.y = anchorY - world.y * scale;
    this.applyView();
  }

  zoomIn() {
    this.zoomAt(this.view.scale * 1.25);
  }

  zoomOut() {
    this.zoomAt(this.view.scale / 1.25);
  }

  resetView() {
    this.view = { scale: 1, x: 0, y: 0 };
    this.applyView();
  }

  onWheel(pointer, over, deltaX, deltaY) {
    if (this.locked) return;
    const delta = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
    if (!delta) return;
    this.zoomAt(this.view.scale * (delta > 0 ? 0.88 : 1.14), pointer.x, pointer.y);
  }

  ensureVisual(node) {
    let visual = this.atomVisuals.get(node.id);
    if (visual) return visual;
    const container = this.add.container(node.x, node.y);
    const graphics = this.add.graphics();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const label = this.add
      .text(0, 0, 'C', {
        fontFamily: '"Inter Variable", "Inter", system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: '600',
        color: PALETTE.label,
        resolution: Math.min(3, Math.max(2, dpr)),
      })
      .setOrigin(0.5);
    container.add([graphics, label]);
    this.atomLayer.add(container);
    visual = { container, graphics, label, lastLabel: 'C', lastTone: '' };
    this.atomVisuals.set(node.id, visual);
    return visual;
  }

  syncAtomVisuals() {
    if (!this.atomLayer) return;
    const hydrogens = computeHydrogens(this.molecule);
    const liveIds = new Set(this.molecule.nodes.map((node) => node.id));

    for (const [id, visual] of this.atomVisuals.entries()) {
      if (!liveIds.has(id)) {
        visual.container.destroy(true);
        this.atomVisuals.delete(id);
      }
    }

    for (const node of this.molecule.nodes) {
      const visual = this.ensureVisual(node);
      const hydrogen = hydrogens.get(node.id) ?? 0;
      const invalid =
        hydrogen < 0 ||
        bondOrderAt(this.molecule, node.id) > MAX_VALENCE ||
        this.validationMarks.has(node.id);
      const selected = this.selectedId === node.id;
      const hovered = this.hoverId === node.id && !selected;

      visual.container.setPosition(node.x, node.y);
      const nextLabel = atomLabel(hydrogen);
      if (visual.lastLabel !== nextLabel) {
        visual.label.setText(nextLabel);
        visual.lastLabel = nextLabel;
      }
      const tone = invalid ? 'invalid' : selected ? 'selected' : hovered ? 'hover' : 'normal';
      if (visual.lastTone !== tone) {
        visual.label.setColor(invalid ? PALETTE.labelInvalid : PALETTE.label);
        visual.lastTone = tone;
      }

      const graphics = visual.graphics;
      graphics.clear();
      if (selected) {
        graphics.fillStyle(PALETTE.atomRingSelected, 0.1);
        graphics.fillCircle(0, 0, 40);
      } else if (hovered) {
        graphics.fillStyle(0xf8fafc, 0.06);
        graphics.fillCircle(0, 0, 37);
      }

      graphics.fillStyle(0x020817, 0.34);
      graphics.fillCircle(0, 3, 30);

      const ringColor = invalid
        ? PALETTE.atomRingInvalid
        : selected
          ? PALETTE.atomRingSelected
          : hovered
            ? PALETTE.atomRingHover
            : PALETTE.atomRing;

      graphics.fillStyle(invalid ? PALETTE.atomFillInvalid : PALETTE.atomFill, 1);
      graphics.fillCircle(0, 0, 30);
      graphics.lineStyle(selected || invalid ? 2.6 : 2, ringColor, 1);
      graphics.strokeCircle(0, 0, 29);

      if (invalid) {
        graphics.fillStyle(PALETTE.atomRingInvalid, 1);
        graphics.fillCircle(22, -22, 5);
      }
    }

    const selectedVisual = this.selectedId !== null ? this.atomVisuals.get(this.selectedId) : null;
    if (selectedVisual) this.atomLayer.bringToTop(selectedVisual.container);
    const hoverVisual = this.hoverId !== null ? this.atomVisuals.get(this.hoverId) : null;
    if (hoverVisual) this.atomLayer.bringToTop(hoverVisual.container);
  }

  drawBonds() {
    const graphics = this.bondLayer;
    if (!graphics) return;
    graphics.clear();
    for (const edge of this.molecule.edges) {
      const a = findAtom(this.molecule, edge.a);
      const b = findAtom(this.molecule, edge.b);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      if (length < 1) continue;
      const ux = dx / length;
      const uy = dy / length;
      const trim = Math.min(34, length * 0.28);
      const x1 = a.x + ux * trim;
      const y1 = a.y + uy * trim;
      const x2 = b.x - ux * trim;
      const y2 = b.y - uy * trim;
      const nx = -uy;
      const ny = ux;
      const offsets = edge.order === 3 ? [-6, 0, 6] : edge.order === 2 ? [-4.5, 4.5] : [0];
      const color =
        edge.order === 3
          ? PALETTE.bondTriple
          : edge.order === 2
            ? PALETTE.bondDouble
            : PALETTE.bondSingle;

      for (const offset of offsets) {
        graphics.lineStyle(7, PALETTE.bondShadow, 0.85);
        graphics.lineBetween(
          x1 + nx * offset,
          y1 + ny * offset,
          x2 + nx * offset,
          y2 + ny * offset,
        );
      }
      for (const offset of offsets) {
        graphics.lineStyle(edge.order === 1 ? 3.4 : 2.6, color, 0.98);
        graphics.lineBetween(
          x1 + nx * offset,
          y1 + ny * offset,
          x2 + nx * offset,
          y2 + ny * offset,
        );
      }
    }
  }

  findAtomAt(x, y) {
    const world = this.screenToWorld(x, y);
    let nearest = null;
    let nearestDistance = 34;
    for (const node of this.molecule.nodes) {
      const distance = Math.hypot(node.x - world.x, node.y - world.y);
      if (distance <= nearestDistance) {
        nearest = node.id;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  setCursor(cursor) {
    if (this.game?.canvas) this.game.canvas.style.cursor = cursor;
  }

  onPointerDown(pointer) {
    this.pointers.set(pointer.id, { x: pointer.x, y: pointer.y });
    if (this.locked) return;

    if (this.pointers.size >= 2) {
      this.beginPinch();
      return;
    }

    const rightClick = pointer.rightButtonDown?.() || pointer.event?.button === 2;
    const atomId = this.findAtomAt(pointer.x, pointer.y);

    if (rightClick) {
      if (atomId !== null) this.deleteAtom(atomId);
      return;
    }

    if (atomId !== null) {
      this.dragState = {
        atomId,
        startX: pointer.x,
        startY: pointer.y,
        moved: false,
        snapshot: this.captureState(),
      };
      this.setCursor('grab');
    } else {
      this.dragState = {
        atomId: null,
        startX: pointer.x,
        startY: pointer.y,
        moved: false,
        viewStart: { x: this.view.x, y: this.view.y },
      };
    }
  }

  beginPinch() {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return;
    this.dragState = null;
    this.hoverId = null;
    this.pinch = {
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      scale: this.view.scale,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
    this.setCursor('grabbing');
  }

  onPointerMove(pointer) {
    if (!this.ready) return;
    if (this.pointers.has(pointer.id)) {
      this.pointers.set(pointer.id, { x: pointer.x, y: pointer.y });
    }

    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const target = clamp(this.pinch.scale * (distance / this.pinch.distance), MIN_ZOOM, MAX_ZOOM);
      this.view.x += mid.x - this.pinch.mid.x;
      this.view.y += mid.y - this.pinch.mid.y;
      this.pinch.mid = mid;
      this.zoomAt(target, mid.x, mid.y);
      return;
    }

    if (this.dragState && pointer.isDown) {
      const dx = pointer.x - this.dragState.startX;
      const dy = pointer.y - this.dragState.startY;
      const distance = Math.hypot(dx, dy);
      const world = this.screenToWorld(pointer.x, pointer.y);

      if (this.dragState.atomId !== null) {
        if (!this.dragState.moved && distance > 5) {
          this.dragState.moved = true;
          this.pushSnapshot(this.dragState.snapshot);
          this.selectedId = this.dragState.atomId;
          this.hoverId = null;
          this.syncAtomVisuals();
          this.emitUpdate();
          this.setCursor('grabbing');
        }
        if (this.dragState.moved) {
          const node = findAtom(this.molecule, this.dragState.atomId);
          if (node) {
            const separated = this.separatePosition(node.id, world.x, world.y);
            node.x = separated.x;
            node.y = separated.y;
            const visual = this.atomVisuals.get(node.id);
            visual?.container.setPosition(node.x, node.y);
            this.drawBonds();
          }
        }
      } else if (this.view.scale > 1.001 && (this.dragState.moved || distance > 4)) {
        this.dragState.moved = true;
        this.view.x = this.dragState.viewStart.x + dx;
        this.view.y = this.dragState.viewStart.y + dy;
        this.applyView();
        this.setCursor('grabbing');
      }
      return;
    }

    if (this.locked) return;
    const hovered = this.findAtomAt(pointer.x, pointer.y);
    if (hovered !== this.hoverId) {
      this.hoverId = hovered;
      this.setCursor(hovered !== null ? 'pointer' : 'default');
      this.syncAtomVisuals();
    }
  }

  onPointerUp(pointer) {
    if (!this.ready) return;
    if (pointer) this.pointers.delete(pointer.id);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.pinch) return;

    const drag = this.dragState;
    this.dragState = null;
    this.setCursor('default');

    if (!drag) return;
    if (drag.moved && drag.atomId === null) return;

    if (drag.moved && drag.atomId !== null) {
      const node = findAtom(this.molecule, drag.atomId);
      if (!node) return;
      const snapped = this.findFreeSnap(node.id, node.x, node.y);
      if (snapped) {
        node.x = snapped.x;
        node.y = snapped.y;
      } else {
        const separated = this.separatePosition(node.id, node.x, node.y);
        node.x = separated.x;
        node.y = separated.y;
      }
      this.syncAtomVisuals();
      this.drawBonds();
      this.emitUpdate();
      this.hooks.onAction?.('move');
      return;
    }

    if (drag.atomId !== null) {
      this.handleAtomClick(drag.atomId);
    } else {
      this.clearSelection();
    }
  }

  handleAtomClick(atomId) {
    if (this.locked) return;
    if (this.selectedId === null) {
      this.selectedId = atomId;
      this.hoverId = null;
      this.syncAtomVisuals();
      this.emitUpdate();
      return;
    }

    if (this.selectedId === atomId) {
      this.clearSelection();
      return;
    }

    const firstId = this.selectedId;
    const existing = findEdge(this.molecule, firstId, atomId);
    if (existing) {
      if (existing.order === this.activeBondOrder) {
        this.hooks.onToast?.('Ikatan dengan orde ini sudah ada. Pilih jenis ikatan lain.');
        return;
      }
      this.clearValidationMarks();
      this.pushSnapshot();
      existing.order = this.activeBondOrder;
      this.selectedId = atomId;
      this.syncAtomVisuals();
      this.drawBonds();
      this.emitUpdate();
      this.hooks.onAction?.('bond');
      return;
    }

    this.clearValidationMarks();
    this.pushSnapshot();
    this.molecule.edges.push({
      a: firstId,
      b: atomId,
      order: this.activeBondOrder,
    });
    this.selectedId = atomId;
    this.syncAtomVisuals();
    this.drawBonds();
    this.emitUpdate();
    this.hooks.onAction?.('bond');
  }

  clearSelection() {
    if (this.selectedId === null) return;
    this.selectedId = null;
    this.syncAtomVisuals();
    this.emitUpdate();
  }

  addCarbon() {
    if (this.locked) return false;
    if (this.molecule.nodes.length >= MAX_ATOMS) {
      this.hooks.onToast?.(`Maksimum ${MAX_ATOMS} atom karbon untuk area ini.`);
      return false;
    }
    const position = this.findFreePosition();
    if (!position) {
      this.hooks.onToast?.('Grid penuh. Geser atom lain untuk membuat ruang.');
      return false;
    }
    this.clearValidationMarks();
    this.pushSnapshot();
    const id = this.nextAtomId;
    this.nextAtomId += 1;
    this.molecule.nodes.push({ id, x: position.x, y: position.y });
    if (this.selectedId === null) this.selectedId = id;
    this.syncAtomVisuals();
    this.drawBonds();
    this.emitUpdate();
    this.hooks.onAction?.('place');
    return true;
  }

  minGap() {
    return Math.min(this.width, this.height) >= 300 ? ROOMY_GAP : COMPACT_GAP;
  }

  snapMargin() {
    return Math.min(this.width, this.height) >= 300 ? ROOMY_MARGIN : COMPACT_MARGIN;
  }


  findFreePosition() {
    const margin = this.snapMargin();
    const gap = this.minGap();
    const cx = this.width / 2;
    const cy = this.height / 2;

    if (!this.molecule.nodes.length) {
      return {
        x: clamp(cx, margin, Math.max(margin, this.width - margin)),
        y: clamp(cy, margin, Math.max(margin, this.height - margin)),
      };
    }

    const selected = this.selectedId !== null ? findAtom(this.molecule, this.selectedId) : null;
    const base = selected ?? { x: cx, y: cy };
    const isFree = (x, y) =>
      x >= margin &&
      x <= this.width - margin &&
      y >= margin &&
      y <= this.height - margin &&
      this.molecule.nodes.every((node) => Math.hypot(node.x - x, node.y - y) >= gap);

    // Centred lattice slots keep every atom reachable even on short phone canvases.
    const cols = Math.floor(Math.max(0, this.width - margin * 2) / gap);
    const rows = Math.floor(Math.max(0, this.height - margin * 2) / gap);
    let best = null;
    let bestDistance = Infinity;
    for (let col = -cols; col <= cols; col += 1) {
      for (let row = -rows; row <= rows; row += 1) {
        const x = cx + col * gap;
        const y = cy + row * gap;
        if (!isFree(x, y)) continue;
        const distance = Math.hypot(x - base.x, y - base.y);
        if (distance < bestDistance) {
          best = { x, y };
          bestDistance = distance;
        }
      }
    }
    if (best) return best;

    // Dense fallback so adding never silently stalls if slots are exhausted.
    const minX = Math.ceil(margin / 20) * 20;
    const minY = Math.ceil(margin / 20) * 20;
    const maxX = Math.floor((this.width - margin) / 20) * 20;
    const maxY = Math.floor((this.height - margin) / 20) * 20;
    for (let relaxed = gap - 10; relaxed >= 40; relaxed -= 10) {
      for (let y = minY; y <= maxY; y += 20) {
        for (let x = minX; x <= maxX; x += 20) {
          if (this.molecule.nodes.every((node) => Math.hypot(node.x - x, node.y - y) >= relaxed)) {
            return { x, y };
          }
        }
      }
    }
    return null;
  }

  separatePosition(atomId, x, y) {
    const margin = this.snapMargin();
    const gap = this.minGap();
    let nx = x;
    let ny = y;
    for (let pass = 0; pass < 3; pass += 1) {
      for (const other of this.molecule.nodes) {
        if (other.id === atomId) continue;
        let dx = nx - other.x;
        let dy = ny - other.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= gap) continue;
        if (distance < 0.001) {
          dx = 0;
          dy = 1;
          distance = 1;
        }
        nx = other.x + (dx / distance) * gap;
        ny = other.y + (dy / distance) * gap;
      }
      nx = clamp(nx, margin, Math.max(margin, this.width - margin));
      ny = clamp(ny, margin, Math.max(margin, this.height - margin));
    }
    return { x: nx, y: ny };
  }

  findFreeSnap(atomId, x, y) {
    const margin = this.snapMargin();
    const gap = this.minGap();
    const snap = 20;
    const isFree = (cx, cy) =>
      cx >= margin &&
      cx <= this.width - margin &&
      cy >= margin &&
      cy <= this.height - margin &&
      this.molecule.nodes.every(
        (other) => other.id === atomId || Math.hypot(other.x - cx, other.y - cy) >= gap,
      );
    const baseX = Math.round(x / snap) * snap;
    const baseY = Math.round(y / snap) * snap;
    const candidates = [
      [baseX, baseY],
      [baseX + snap, baseY],
      [baseX - snap, baseY],
      [baseX, baseY + snap],
      [baseX, baseY - snap],
      [baseX + snap, baseY + snap],
      [baseX - snap, baseY + snap],
      [baseX + snap, baseY - snap],
      [baseX - snap, baseY - snap],
    ].sort(
      (a, b) =>
        Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y),
    );
    for (const [cx, cy] of candidates) {
      if (isFree(cx, cy)) return { x: cx, y: cy };
    }
    return null;
  }

  deleteSelected() {
    if (this.locked) return;
    if (this.selectedId === null) {
      this.hooks.onToast?.('Pilih atom yang ingin dihapus terlebih dahulu.');
      return;
    }
    this.deleteAtom(this.selectedId);
  }

  deleteAtom(atomId) {
    if (this.locked) return;
    const node = findAtom(this.molecule, atomId);
    if (!node) return;
    this.clearValidationMarks();
    this.pushSnapshot();
    this.hooks.onAction?.('delete');
    this.molecule.nodes = this.molecule.nodes.filter((item) => item.id !== atomId);
    this.molecule.edges = this.molecule.edges.filter(
      (edge) => edge.a !== atomId && edge.b !== atomId,
    );
    this.atomVisuals.get(atomId)?.container.destroy(true);
    this.atomVisuals.delete(atomId);
    if (this.selectedId === atomId) this.selectedId = null;
    this.hoverId = this.hoverId === atomId ? null : this.hoverId;
    this.syncAtomVisuals();
    this.drawBonds();
    this.emitUpdate();
  }

  setBondOrder(order) {
    if (![1, 2, 3].includes(order) || this.locked) return;
    this.activeBondOrder = order;
  }

  getBondOrder() {
    return this.activeBondOrder;
  }

  undo() {
    if (this.locked) return;
    const snapshot = this.history.pop();
    if (!snapshot) {
      this.hooks.onToast?.('Tidak ada tindakan yang bisa dibatalkan.');
      return;
    }
    this.restoreState(snapshot);
    this.hoverId = null;
    this.setCursor('default');
    this.syncAtomVisuals();
    this.drawBonds();
    this.emitUpdate();
    this.hooks.onAction?.('delete');
  }

  reset() {
    if (this.locked) return;
    if (!this.molecule.nodes.length) {
      this.hooks.onToast?.('Grid sudah kosong.');
      return;
    }
    for (const visual of this.atomVisuals.values()) visual.container.destroy(true);
    this.atomVisuals.clear();
    this.molecule = { nodes: [], edges: [] };
    this.nextAtomId = 0;
    this.selectedId = null;
    this.hoverId = null;
    this.history = [];
    this.validationMarks.clear();
    this.syncAtomVisuals();
    this.drawBonds();
    this.emitUpdate();
    this.hooks.onAction?.('delete');
  }

  setLocked(locked) {
    this.locked = Boolean(locked);
    this.dragState = null;
    this.setCursor('default');
    if (locked) {
      this.hoverId = null;
      this.syncAtomVisuals();
    }
  }

  highlightAtoms(ids = []) {
    this.validationMarks = new Set(ids);
    this.syncAtomVisuals();
  }

  clearValidationMarks() {
    if (!this.validationMarks.size) return;
    this.validationMarks.clear();
    this.syncAtomVisuals();
  }

  captureState() {
    return {
      molecule: cloneMolecule(this.molecule),
      selectedId: this.selectedId,
      nextAtomId: this.nextAtomId,
    };
  }

  restoreState(snapshot) {
    this.molecule = cloneMolecule(snapshot.molecule);
    this.selectedId = snapshot.selectedId;
    this.nextAtomId = snapshot.nextAtomId;
    this.clearValidationMarks();
  }

  pushSnapshot(snapshot = this.captureState()) {
    this.history.push(snapshot);
    if (this.history.length > 60) this.history.shift();
  }

  getMolecule() {
    return cloneMolecule(this.molecule);
  }

  getAnalysis() {
    return analyzeMolecule(this.molecule);
  }

  emitUpdate() {
    const analysis = analyzeMolecule(this.molecule);
    this.hooks.onUpdate?.({
      analysis,
      molecule: cloneMolecule(this.molecule),
      selectedId: this.selectedId,
      canUndo: this.history.length > 0,
      atomCount: this.molecule.nodes.length,
    });
  }
}
