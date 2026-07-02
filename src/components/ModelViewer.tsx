import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadModel } from '../lib/modelCache';
import { acquirePreview, previewEnvironment, type PreviewHandle } from '../lib/previewPool';

/**
 * Interactive 3D model viewer for GLB/glTF (the site's 3D format — fast, no
 * WASM). STEP/OBJ are converted to GLB before they reach the site.
 *
 * Two quality tiers:
 *  - 'preview' (catalog tiles): renders through the shared preview pool — one
 *    WebGL context for every tile on the page, no shadows, no per-tile PMREM,
 *    30fps. Cheap enough to show a whole catalog of spinning rockets at once.
 *  - 'full' (lightbox / anything interactive): its own renderer with
 *    antialiasing, soft shadows and an environment map.
 *
 * The model is recentered on its bounding box and laid flat (its thinnest axis
 * becomes "up"), so a board exported Z-up turntables nicely instead of spinning
 * edge-on. Neutral tone mapping + a dialed-down environment keep colors true.
 * Append `?debug3d` to the URL to overlay XYZ axes + a measured grid.
 */

function makeLabel(text: string, color: string, scale: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 64);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true }),
  );
  sprite.scale.set(scale * 2, scale, 1);
  return sprite;
}

type Stage = { scene: THREE.Scene; pivot: THREE.Group; maxDim: number; bottomY: number; size: THREE.Vector3 };

/** Center + lay flat + light the model. Shared by both quality tiers. */
function buildStage(object: THREE.Object3D, shadows: boolean): Stage {
  const scene = new THREE.Scene();

  // pivot (turntable) → orient (lay flat) → object (centered).
  const orient = new THREE.Group();
  const pivot = new THREE.Group();
  orient.add(object);
  pivot.add(orient);
  scene.add(pivot);
  scene.updateMatrixWorld(true);

  // Center the geometry on the orient origin. `precise` walks the actual
  // vertices — essential here: the fast path bounds rotated/quantized meshes
  // by their local box corners, which inflates the AABB, mis-centers it, and
  // mis-identifies the thin axis (it had the board "vertical" when it's flat).
  const box = new THREE.Box3().setFromObject(object, true);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  if (shadows) {
    object.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
  }

  // Lay flat: rotate the thinnest axis (board normal) up to +Y.
  const dims = [size.x, size.y, size.z];
  const thin = dims.indexOf(Math.min(dims[0], dims[1], dims[2]));
  if (thin === 0) orient.rotation.z = Math.PI / 2; // X-thin → up
  else if (thin === 2) orient.rotation.x = -Math.PI / 2; // Z-thin → up
  scene.updateMatrixWorld(true);

  // Re-measure after re-orienting (used for framing, ground, lights).
  const box2 = new THREE.Box3().setFromObject(orient, true);
  const size2 = box2.getSize(new THREE.Vector3());
  const maxDim = Math.max(size2.x, size2.y, size2.z) || 1;
  const bottomY = -size2.y / 2;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x202024, 0.22));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(maxDim * 0.6, maxDim * 1.6, maxDim * 0.9);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera;
    sc.near = maxDim * 0.05;
    sc.far = maxDim * 8;
    sc.left = -maxDim;
    sc.right = maxDim;
    sc.top = maxDim;
    sc.bottom = -maxDim;
    sc.updateProjectionMatrix();
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = maxDim * 0.0015;
  }
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-maxDim, maxDim * 0.5, -maxDim * 0.8);
  scene.add(fill);

  return { scene, pivot, maxDim, bottomY, size: size2 };
}

function frameCamera(maxDim: number, aspect: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(38, aspect, maxDim / 100, maxDim * 100);
  const dist = maxDim * 1.6;
  camera.position.set(dist * 0.5, dist * 1.0, dist * 0.7);
  camera.lookAt(0, 0, 0);
  return camera;
}

export default function ModelViewer({
  src,
  interactive = true,
  autoRotate = true,
  quality,
  className = '',
}: {
  src: string;
  interactive?: boolean;
  autoRotate?: boolean;
  /** Defaults to 'full' when interactive, 'preview' otherwise. */
  quality?: 'preview' | 'full';
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const tier = quality ?? (interactive ? 'full' : 'preview');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;
    setStatus('loading');

    // --- Preview: no own context; register with the shared pool ------------
    const setupPreview = (object: THREE.Object3D) => {
      const stage = buildStage(object, false);
      stage.scene.environment = previewEnvironment();
      stage.scene.environmentIntensity = 0.18;

      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      mount.appendChild(canvas);

      const camera = frameCamera(stage.maxDim, (mount.clientWidth || 1) / (mount.clientHeight || 1));
      const handle: PreviewHandle = acquirePreview({
        scene: stage.scene,
        camera,
        canvas,
        update: autoRotate
          ? (dt) => {
              stage.pivot.rotation.y += dt * 0.5;
            }
          : undefined,
      });

      // Idle while the tile is scrolled off-screen.
      const io = new IntersectionObserver(([entry]) => handle.setVisible(entry.isIntersecting), {
        rootMargin: '150px',
      });
      io.observe(mount);

      setStatus('ready');
      return () => {
        io.disconnect();
        handle.dispose();
        canvas.remove();
      };
    };

    // --- Full: dedicated renderer with shadows + environment ---------------
    const setupFull = (object: THREE.Object3D) => {
      const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug3d');
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 0.9;
      mount.appendChild(renderer.domElement);

      const stage = buildStage(object, true);
      const { scene, pivot, maxDim, bottomY, size } = stage;

      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.18;
      pmrem.dispose();

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(maxDim * 8, maxDim * 8),
        new THREE.ShadowMaterial({ opacity: 0.4 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = bottomY - maxDim * 0.01;
      ground.receiveShadow = true;
      scene.add(ground);

      if (debug) {
        scene.add(new THREE.AxesHelper(maxDim * 0.75));
        const grid = new THREE.GridHelper(Math.ceil(maxDim * 2), 20, 0x666666, 0x333333);
        grid.position.y = bottomY;
        scene.add(grid);
        const cell = (Math.ceil(maxDim * 2) / 20).toFixed(1);
        const lx = makeLabel(`+X ${size.x.toFixed(0)}`, '#ff5555', maxDim * 0.12); lx.position.set(maxDim * 0.8, 0, 0); scene.add(lx);
        const ly = makeLabel(`+Y ${size.y.toFixed(0)}`, '#55ff55', maxDim * 0.12); ly.position.set(0, maxDim * 0.8, 0); scene.add(ly);
        const lz = makeLabel(`+Z ${size.z.toFixed(0)}`, '#5588ff', maxDim * 0.12); lz.position.set(0, 0, maxDim * 0.8); scene.add(lz);
        const l0 = makeLabel(`0 · grid=${cell}`, '#cccccc', maxDim * 0.1); l0.position.set(0, bottomY, 0); scene.add(l0);
      }

      const camera = frameCamera(maxDim, width / height);

      let controls: OrbitControls | null = null;
      if (interactive) {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.target.set(0, 0, 0);
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 1.0;
        controls.addEventListener('start', () => {
          if (controls) controls.autoRotate = false;
        });
      }

      // Pause the render loop while off-screen / tab hidden.
      let inView = true;
      let frame = 0;
      const loop = () => {
        frame = requestAnimationFrame(loop);
        if (!inView || document.hidden) return;
        if (controls) controls.update();
        else if (autoRotate) pivot.rotation.y += 0.004;
        renderer.render(scene, camera);
      };
      loop();

      const resizeObserver = new ResizeObserver(() => {
        const w = mount.clientWidth || 1;
        const h = mount.clientHeight || 1;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      resizeObserver.observe(mount);

      const intersectionObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, {
        rootMargin: '150px',
      });
      intersectionObserver.observe(mount);

      setStatus('ready');
      return () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        controls?.dispose();
        renderer.dispose();
        // Actually release the WebGL context now — dispose() only frees GPU
        // resources, leaving the context alive until GC. Without this, rapidly
        // mounting/unmounting viewers leaks contexts until the browser hits its
        // limit and kills the oldest one (the persistent starfield → black).
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    };

    loadModel(src)
      .then((object) => {
        if (disposed) return;
        cleanup = tier === 'preview' ? setupPreview(object) : setupFull(object);
      })
      .catch(() => {
        if (!disposed) setStatus('error');
      });

    return () => {
      disposed = true;
      cleanup?.();
      cleanup = null;
    };
  }, [src, interactive, autoRotate, tier]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mountRef} className="w-full h-full" />
      {status !== 'ready' && (
        <div className="absolute inset-0 grid place-items-center text-center px-4 pointer-events-none">
          <span className="text-ink-faint text-xs tracking-[0.15em] uppercase">
            {status === 'error' ? 'Could not load 3D model.' : 'Loading 3D…'}
          </span>
        </div>
      )}
      {status === 'ready' && interactive && (
        <div className="absolute bottom-2 right-3 text-[10px] uppercase tracking-[0.15em] text-ink-faint pointer-events-none">
          drag to rotate
        </div>
      )}
    </div>
  );
}
