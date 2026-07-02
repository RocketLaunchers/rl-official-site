import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Shared renderer for all 3D tile previews.
 *
 * Browsers only allow ~8–16 live WebGL contexts per page; past that they
 * silently kill the oldest one — which on this site is the persistent
 * starfield. Instead of one context per catalog tile, every preview registers
 * a scene here: a single hidden WebGL canvas renders each visible tile in
 * turn (scissored to the tile's size) and blits the pixels into that tile's
 * own 2D canvas. One GL context total, no matter how many rockets the
 * catalog grows to — and one shared PMREM environment instead of one per tile.
 *
 * Previews render at 30fps with a capped pixel ratio; the fullscreen lightbox
 * and anything interactive still get their own full-quality renderer in
 * ModelViewer.
 */

export type PreviewHandle = {
  /** Feed tile visibility from the owner's IntersectionObserver. */
  setVisible(v: boolean): void;
  dispose(): void;
};

type Entry = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  update?: (dt: number) => void;
  visible: boolean;
};

const DPR_CAP = 1.5;
const FRAME_MS = 1000 / 30; // previews cruise at 30fps
const TEARDOWN_MS = 2500; // linger through page transitions before freeing the context

const entries = new Set<Entry>();
let renderer: THREE.WebGLRenderer | null = null;
let environment: THREE.Texture | null = null;
let raf = 0;
let last = 0;
let contextLost = false;
let teardownTimer = 0;

const onLost = (e: Event) => {
  e.preventDefault(); // opt into restoration
  contextLost = true;
};
const onRestored = () => {
  contextLost = false;
};

function ensureRenderer(): THREE.WebGLRenderer {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(1); // tiles manage their own device-pixel sizing
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);
  const pmrem = new THREE.PMREMGenerator(renderer);
  environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  last = performance.now();
  raf = requestAnimationFrame(tick);
  return renderer;
}

function tick(now: number) {
  raf = requestAnimationFrame(tick);
  if (!renderer || contextLost || document.hidden) {
    last = now;
    return;
  }
  if (now - last < FRAME_MS) return;
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  // Match each tile canvas to its CSS size and find the largest visible tile.
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  let maxW = 0;
  let maxH = 0;
  for (const e of entries) {
    if (!e.visible) continue;
    const w = Math.round(e.canvas.clientWidth * dpr);
    const h = Math.round(e.canvas.clientHeight * dpr);
    if (!w || !h) continue;
    if (e.canvas.width !== w || e.canvas.height !== h) {
      e.canvas.width = w;
      e.canvas.height = h;
      e.camera.aspect = w / h;
      e.camera.updateProjectionMatrix();
    }
    maxW = Math.max(maxW, w);
    maxH = Math.max(maxH, h);
  }
  if (!maxW || !maxH) return;

  // Grow (never shrink) the shared buffer to fit the largest tile.
  const buf = renderer.domElement;
  if (buf.width < maxW || buf.height < maxH) {
    renderer.setSize(Math.max(buf.width, maxW), Math.max(buf.height, maxH), false);
  }

  renderer.setScissorTest(true);
  for (const e of entries) {
    if (!e.visible || !e.canvas.width || !e.canvas.height) continue;
    e.update?.(dt);
    const w = e.canvas.width;
    const h = e.canvas.height;
    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, w, h);
    renderer.render(e.scene, e.camera);
    e.ctx.clearRect(0, 0, w, h);
    // Viewport (0,0) is the buffer's bottom-left; in image coords that rect
    // starts at y = bufferHeight - h. Blit is synchronous with the render, so
    // no preserveDrawingBuffer needed.
    e.ctx.drawImage(buf, 0, buf.height - h, w, h, 0, 0, w, h);
  }
  renderer.setScissorTest(false);
}

function scheduleTeardown() {
  teardownTimer = window.setTimeout(() => {
    teardownTimer = 0;
    if (entries.size || !renderer) return;
    cancelAnimationFrame(raf);
    raf = 0;
    renderer.domElement.removeEventListener('webglcontextlost', onLost);
    renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
    environment?.dispose();
    environment = null;
    renderer.dispose();
    renderer.forceContextLoss(); // actually free the context, not just GPU resources
    renderer = null;
  }, TEARDOWN_MS);
}

/** Shared neutral studio environment (generated once per pool lifetime). */
export function previewEnvironment(): THREE.Texture | null {
  ensureRenderer();
  return environment;
}

export function acquirePreview(opts: {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  update?: (dt: number) => void;
}): PreviewHandle {
  const ctx = opts.canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable for preview blit');
  ensureRenderer();
  if (teardownTimer) {
    window.clearTimeout(teardownTimer);
    teardownTimer = 0;
  }
  const entry: Entry = { ...opts, ctx, visible: true };
  entries.add(entry);
  return {
    setVisible(v: boolean) {
      entry.visible = v;
    },
    dispose() {
      if (!entries.delete(entry)) return;
      if (!entries.size) scheduleTeardown();
    },
  };
}
