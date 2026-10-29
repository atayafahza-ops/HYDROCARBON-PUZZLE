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
  grid: 0x23546c,
  gridMajor: 0x2c718b,
  gridDot: 0x62d7e4,
  bondSingle: 0x5ed4e5,
  bondDouble: 0xf0b34c,
  bondTriple: 0xef7b86,
  bondShadow: 0x03111c,
  atomFill: 0x08273b,
  atomFillInvalid: 0x2f121a,
  atomRing: 0x53cfdf,
  atomRingHover: 0xd9fbff,
  atomRingSelected: 0xffd35b,
  atomRingInvalid: 0xff6573,
  atomGlow: 0x64e5ef,
  label: '#eefcff',
  labelInvalid: '#ffc3c9',
};

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
  }

  create() {
    this.width = Math.max(240, this.scale.width);
    this.height = Math.max(220, this.scale.height);
    this.gridLayer = this.add.graphics();
    this.bondLayer = this.add.graphics();
    this.atomLayer = this.add.container(0, 0);

    this.input.mouse?.disableContextMenu?.();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
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
    this.ready = true;
    this.emitUpdate();
    this.hooks.onReady?.();
  }

  onShutdown() {
    this.input?.removeAllListeners();
    this.scale?.off('resize', this.onResize, this);
    this.game?.canvas?.style && (this.game.canvas.style.cursor = 'default');
  }

  onResize(gameSize) {
    this.width = Math.max(240, gameSize.width);
    this.height = Math.max(220, gameSize.height);
    const margin = 58;
    for (const node of this.molecule.nodes) {
      node.x = clamp(node.x, margin, this.width - margin);
      node.y = clamp(node.y, margin, this.height - margin);
    }
    this.drawGrid();
    this.syncAtomVisuals();
    this.drawBonds();
  }

  drawGrid() {
    const graphics = this.gridLayer;
    if (!graphics) return;
    graphics.clear();
    const cell = 40;
    graphics.lineStyle(1, PALETTE.grid, 0.22);
    for (let x = cell; x < this.width; x += cell) {
      graphics.lineBetween(x, 0, x, this.height);
    }
    for (let y = cell; y < this.height; y += cell) {
      graphics.lineBetween(0, y, this.width, y);
    }

    graphics.lineStyle(1, PALETTE.gridMajor, 0.16);
    for (let x = cell * 4; x < this.width; x += cell * 4) {
      graphics.lineBetween(x, 0, x, this.height);
    }
    for (let y = cell * 4; y < this.height; y += cell * 4) {
      graphics.lineBetween(0, y, this.width, y);
    }

    graphics.fillStyle(PALETTE.gridDot, 0.2);
    for (let x = cell * 2; x < this.width; x += cell * 2) {
      for (let y = cell * 2; y < this.height; y += cell * 2) {
        graphics.fillCircle(x, y, 1.1);
      }
    }

    const inset = 12;
    const corner = 22;
    graphics.lineStyle(2, PALETTE.gridMajor, 0.65);
    graphics.lineBetween(inset, inset, inset + corner, inset);
    graphics.lineBetween(inset, inset, inset, inset + corner);
    graphics.lineBetween(this.width - inset, inset, this.width - inset - corner, inset);
    graphics.lineBetween(this.width - inset, inset, this.width - inset, inset + corner);
    graphics.lineBetween(inset, this.height - inset, inset + corner, this.height - inset);
    graphics.lineBetween(inset, this.height - inset, inset, this.height - inset - corner);
    graphics.lineBetween(
      this.width - inset,
      this.height - inset,
      this.width - inset - corner,
      this.height - inset,
    );
    graphics.lineBetween(
      this.width - inset,
      this.height - inset,
      this.width - inset,
      this.height - inset - corner,
    );
  }

  ensureVisual(node) {
    let visual = this.atomVisuals.get(node.id);
    if (visual) return visual;
    const container = this.add.container(node.x, node.y);
    const graphics = this.add.graphics();
    const label = this.add
      .text(0, 0, 'C', {
        // Press Start 2P keeps the C glyph open; Pixelify Sans bold reads as "O".
        fontFamily: '"Press Start 2P", "Trebuchet MS", monospace',
        fontSize: '12px',
        color: PALETTE.label,
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
        graphics.fillStyle(PALETTE.atomRingSelected, 0.09);
        graphics.fillCircle(0, 0, 42);
      } else if (hovered) {
        graphics.fillStyle(PALETTE.atomGlow, 0.06);
        graphics.fillCircle(0, 0, 37);
      }

      graphics.fillStyle(0x01080e, 0.4);
      graphics.fillCircle(2, 4, 32);

      const ringColor = invalid
        ? PALETTE.atomRingInvalid
        : selected
          ? PALETTE.atomRingSelected
          : hovered
            ? PALETTE.atomRingHover
            : PALETTE.atomRing;

      graphics.fillStyle(invalid ? PALETTE.atomFillInvalid : PALETTE.atomFill, 0.98);
      graphics.fillCircle(0, 0, 30);
      graphics.lineStyle(selected || invalid ? 3 : 2.2, ringColor, 1);
      graphics.strokeCircle(0, 0, 30);
      graphics.lineStyle(1, 0x8ceaf3, selected || invalid ? 0.35 : 0.18);
      graphics.strokeCircle(0, 0, 24);

      if (selected) {
        graphics.lineStyle(2, PALETTE.atomRingSelected, 0.9);
        for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
          const inner = 36;
          const outer = 42;
          const x1 = Math.cos(angle) * inner;
          const y1 = Math.sin(angle) * inner;
          const x2 = Math.cos(angle) * outer;
          const y2 = Math.sin(angle) * outer;
          graphics.lineBetween(x1, y1, x2, y2);
        }
      }

      if (invalid) {
        graphics.lineStyle(2, PALETTE.atomRingInvalid, 0.9);
        graphics.lineBetween(-26, -36, -18, -36);
        graphics.lineBetween(-22, -40, -22, -32);
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
    let nearest = null;
    let nearestDistance = 34;
    for (const node of this.molecule.nodes) {
      const distance = Math.hypot(node.x - x, node.y - y);
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
    if (this.locked) return;
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
        original: { ...findAtom(this.molecule, atomId) },
        snapshot: this.captureState(),
      };
      this.setCursor('grab');
    } else {
      this.dragState = { atomId: null, startX: pointer.x, startY: pointer.y, moved: false };
    }
  }

  onPointerMove(pointer) {
    if (!this.ready) return;
    if (this.dragState && pointer.isDown) {
      const distance = Math.hypot(pointer.x - this.dragState.startX, pointer.y - this.dragState.startY);
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
            const margin = 48;
            node.x = clamp(pointer.x, margin, this.width - margin);
            node.y = clamp(pointer.y, margin, this.height - margin);
            const visual = this.atomVisuals.get(node.id);
            visual?.container.setPosition(node.x, node.y);
            this.drawBonds();
          }
        }
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

  onPointerUp() {
    if (!this.ready) return;
    const drag = this.dragState;
    this.dragState = null;
    this.setCursor(this.locked ? 'default' : 'default');

    if (!drag) return;

    if (drag.moved && drag.atomId !== null) {
      const node = findAtom(this.molecule, drag.atomId);
      if (!node) return;
      const snap = 20;
      const margin = 48;
      const snappedX = clamp(Math.round(node.x / snap) * snap, margin, this.width - margin);
      const snappedY = clamp(Math.round(node.y / snap) * snap, margin, this.height - margin);
      const collision = this.molecule.nodes.some(
        (other) =>
          other.id !== node.id &&
          Math.hypot(other.x - snappedX, other.y - snappedY) < 58,
      );
      if (collision) {
        node.x = drag.original.x;
        node.y = drag.original.y;
        this.history.pop();
        this.hooks.onToast?.('Atom terlalu dekat dengan atom lain. Posisi dikembalikan.');
      } else {
        node.x = snappedX;
        node.y = snappedY;
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

  findFreePosition() {
    const margin = 62;
    const minDistance = 72;
    const selected = this.selectedId !== null ? findAtom(this.molecule, this.selectedId) : null;
    const base = selected
      ? { x: selected.x, y: selected.y }
      : { x: this.width / 2, y: this.height / 2 };
    const offsets = [
      [118, 0],
      [92, 82],
      [0, 112],
      [-92, 82],
      [-118, 0],
      [-92, -82],
      [0, -112],
      [92, -82],
      [214, 0],
      [0, 194],
      [-214, 0],
      [0, -194],
    ];

    const isValid = (x, y) =>
      x >= margin &&
      x <= this.width - margin &&
      y >= margin &&
      y <= this.height - margin &&
      this.molecule.nodes.every((node) => Math.hypot(node.x - x, node.y - y) >= minDistance);

    for (const [dx, dy] of offsets) {
      const x = Math.round((base.x + dx) / 20) * 20;
      const y = Math.round((base.y + dy) / 20) * 20;
      if (isValid(x, y)) return { x, y };
    }

    for (let radius = 70; radius < Math.max(this.width, this.height); radius += 60) {
      for (let step = 0; step < 16; step += 1) {
        const angle = (Math.PI * 2 * step) / 16;
        const x = Math.round((base.x + Math.cos(angle) * radius) / 20) * 20;
        const y = Math.round((base.y + Math.sin(angle) * radius) / 20) * 20;
        if (isValid(x, y)) return { x, y };
      }
    }

    for (let y = margin; y <= this.height - margin; y += 70) {
      for (let x = margin; x <= this.width - margin; x += 70) {
        if (isValid(x, y)) return { x, y };
      }
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
