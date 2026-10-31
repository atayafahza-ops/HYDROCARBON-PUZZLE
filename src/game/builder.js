import Phaser from 'phaser';
import { MoleculeScene } from './MoleculeScene.js';

export function mountMoleculeBuilder(host, hooks = {}) {
  const initialWidth = Math.max(320, host.clientWidth || 720);
  const initialHeight = Math.max(260, host.clientHeight || 420);
  const scene = new MoleculeScene(hooks);
  let destroyed = false;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    transparent: true,
    width: initialWidth,
    height: initialHeight,
    scene: [scene],
    banner: false,
    audio: { noAudio: true },
    render: {
      antialias: true,
      roundPixels: false,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: initialWidth,
      height: initialHeight,
    },
    input: {
      activePointers: 3,
      mouse: { preventDefaultWheel: true },
      touch: { capture: true },
    },
  });

  const resizeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          if (destroyed) return;
          const width = Math.max(240, host.clientWidth);
          const height = Math.max(220, host.clientHeight);
          if (
            game.scale &&
            (Math.abs(game.scale.width - width) > 2 ||
              Math.abs(game.scale.height - height) > 2)
          ) {
            game.scale.resize(width, height);
          }
        })
      : null;
  resizeObserver?.observe(host);

  const api = {
    addCarbon: () => scene.addCarbon(),
    setBondOrder: (order) => scene.setBondOrder(order),
    deleteSelected: () => scene.deleteSelected(),
    undo: () => scene.undo(),
    reset: () => scene.reset(),
    clearSelection: () => scene.clearSelection(),
    setLocked: (locked) => scene.setLocked(locked),
    highlightAtoms: (ids) => scene.highlightAtoms(ids),
    clearHighlights: () => scene.clearValidationMarks(),
    getMolecule: () => scene.getMolecule(),
    getAnalysis: () => scene.getAnalysis(),
    zoomIn: () => scene.zoomIn(),
    zoomOut: () => scene.zoomOut(),
    resetView: () => scene.resetView(),
    getZoom: () => scene.view?.scale ?? 1,
    isReady: () => scene.ready,
    getGame: () => game,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      if (import.meta.env.DEV && window.__builderDebug?.api === api) {
        delete window.__builderDebug;
      }
      resizeObserver?.disconnect();
      game.destroy(true);
    },
  };

  if (import.meta.env.DEV) {
    window.__builderDebug = { scene, api };
  }

  return api;
}
