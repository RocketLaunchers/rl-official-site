import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

type WorkerMesh = {
  position: Float32Array;
  normal: Float32Array | null;
  index: Uint32Array;
  color: [number, number, number] | null;
};

/**
 * Interactive 3D model viewer. Loads GLB/glTF directly with GLTFLoader (fast,
 * no WASM) and falls back to parsing STEP via a web worker (occtWorker.ts) for
 * raw CAD files. Heavy (three.js) — lazy-loaded via LazyModel.
 *
 * `interactive` enables orbit controls; when false it shows a slowly spinning
 * preview whose clicks pass through (so a tile can open the fullscreen lightbox).
 */
export default function ModelViewer({
  src,
  interactive = true,
  autoRotate = true,
  className = '',
}: {
  src: string;
  interactive?: boolean;
  autoRotate?: boolean;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let pmrem: THREE.PMREMGenerator | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let worker: Worker | null = null;

    const setupScene = (object: THREE.Object3D) => {
      if (disposed) return;
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;

      const scene = new THREE.Scene();
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      // Soft studio reflections so metal/PCB surfaces read well on the dark site.
      pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1f, 0.7));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(1, 1.4, 1.2);
      scene.add(key);

      // Center the model and frame it.
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);
      const pivot = new THREE.Group();
      pivot.add(object);
      scene.add(pivot);

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const camera = new THREE.PerspectiveCamera(40, width / height, maxDim / 100, maxDim * 100);
      const dist = maxDim * 2.1;
      camera.position.set(dist * 0.9, dist * 0.55, dist);
      camera.lookAt(0, 0, 0);

      if (interactive) {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 1.1;
        controls.addEventListener('start', () => {
          if (controls) controls.autoRotate = false;
        });
      }

      const loop = () => {
        frame = requestAnimationFrame(loop);
        if (controls) controls.update();
        else if (autoRotate) pivot.rotation.y += 0.005;
        renderer?.render(scene, camera);
      };
      loop();

      resizeObserver = new ResizeObserver(() => {
        const w = mount.clientWidth || 1;
        const h = mount.clientHeight || 1;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer?.setSize(w, h);
      });
      resizeObserver.observe(mount);

      setStatus('ready');
    };

    const fail = (msg: string) => {
      if (!disposed) {
        setError(msg);
        setStatus('error');
      }
    };

    if (/\.(step|stp)$/i.test(src)) {
      worker = new Worker(new URL('./occtWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent) => {
        if (disposed) return;
        const data = e.data as { meshes?: WorkerMesh[]; error?: string };
        if (data.error || !data.meshes) {
          fail(data.error || 'Failed to load model.');
          return;
        }
        const group = new THREE.Group();
        for (const m of data.meshes) {
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(m.position, 3));
          if (m.normal) geometry.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3));
          geometry.setIndex(new THREE.BufferAttribute(m.index, 1));
          if (!m.normal) geometry.computeVertexNormals();
          const color = m.color ? new THREE.Color(m.color[0], m.color[1], m.color[2]) : new THREE.Color(0.7, 0.72, 0.75);
          group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.55 })));
        }
        setupScene(group);
      };
      worker.onerror = () => fail('Failed to initialize the 3D engine.');
      fetch(src)
        .then((r) => {
          if (!r.ok) throw new Error(`Could not load model (${r.status})`);
          return r.arrayBuffer();
        })
        .then((buffer) => worker?.postMessage({ buffer }, [buffer]))
        .catch((e) => fail(e instanceof Error ? e.message : String(e)));
    } else {
      new GLTFLoader().load(
        src,
        (gltf) => {
          if (!disposed) setupScene(gltf.scene);
        },
        undefined,
        () => fail('Could not load 3D model.'),
      );
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      worker?.terminate();
      resizeObserver?.disconnect();
      controls?.dispose();
      pmrem?.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [src, interactive, autoRotate]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mountRef} className="w-full h-full" />
      {status !== 'ready' && (
        <div className="absolute inset-0 grid place-items-center text-center px-4 pointer-events-none">
          <span className="text-neutral-500 text-xs tracking-[0.15em] uppercase">
            {status === 'error' ? error : 'Loading 3D…'}
          </span>
        </div>
      )}
      {status === 'ready' && interactive && (
        <div className="absolute bottom-2 right-3 text-[10px] uppercase tracking-[0.15em] text-neutral-600 pointer-events-none">
          drag to rotate
        </div>
      )}
    </div>
  );
}
