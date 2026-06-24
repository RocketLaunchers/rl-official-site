import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/*
 * Dynamic "cruising through space" background.
 * A depth-layered starfield drifts gently toward the camera (parallax tunnel)
 * with a few faint colored nebula clouds. Pure Three.js, textures are
 * generated at runtime so there are no asset files to ship.
 *
 * Tunables — tweak these to taste:
 */
const STAR_COUNT = 2200;
const STAR_NEAR = -120;        // closest a star gets before it recycles to the back
const STAR_FAR = -1800;        // furthest depth stars spawn at
const STAR_SPREAD_X = 0.7;     // how wide the frustum of stars is (× depth)
const STAR_SPREAD_Y = 0.55;
const STAR_SIZE = 3;
const CRUISE_SPEED = 34;       // forward drift, units/sec (higher = faster cruise)

const NEBULA_COUNT = 5;
const NEBULA_NEAR = 200;
const NEBULA_FAR = -1700;
const NEBULA_COLORS = [0x3b6bd6, 0x7a3bd6, 0xd63b9e, 0x2a4cad, 0x5a2bb0];

/** Soft round glow used as the sprite for every star. */
function createStarTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Soft, cloud-like blob built from several overlapping radial gradients. */
function createNebulaTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Deterministic-ish scatter so each call produces a slightly cloudy shape.
  for (let i = 0; i < 14; i++) {
    const x = size * (0.25 + 0.5 * Math.random());
    const y = size * (0.25 + 0.5 * Math.random());
    const r = size * (0.12 + 0.22 * Math.random());
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const SpaceBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Renderer / scene / camera ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    // Fog fades distant stars into black so they pop in/out without "popping".
    scene.fog = new THREE.FogExp2(0x000000, 0.0008);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 4000);
    camera.position.set(0, 0, 0);

    // --- Stars ---
    const starTexture = createStarTexture();
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const color = new THREE.Color();

    const placeStar = (i: number, z: number) => {
      const az = Math.abs(z);
      positions[i * 3] = (Math.random() - 0.5) * 2 * az * STAR_SPREAD_X;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * az * STAR_SPREAD_Y;
      positions[i * 3 + 2] = z;
    };

    for (let i = 0; i < STAR_COUNT; i++) {
      placeStar(i, STAR_FAR + Math.random() * (STAR_NEAR - STAR_FAR));
      // Mostly white, a few cool-blue and warm-amber tints for variety.
      const roll = Math.random();
      if (roll < 0.7) color.setHSL(0, 0, 0.9 + Math.random() * 0.1);
      else if (roll < 0.9) color.setHSL(0.6, 0.5, 0.85);
      else color.setHSL(0.08, 0.55, 0.85);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const starMat = new THREE.PointsMaterial({
      size: STAR_SIZE,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      fog: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // --- Nebula clouds ---
    const nebulaTexture = createNebulaTexture();
    const nebulas: THREE.Sprite[] = [];
    for (let i = 0; i < NEBULA_COUNT; i++) {
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: NEBULA_COLORS[i % NEBULA_COLORS.length],
        transparent: true,
        opacity: 0.1 + Math.random() * 0.06,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: true,
      });
      const sprite = new THREE.Sprite(mat);
      const z = NEBULA_FAR + Math.random() * (NEBULA_NEAR - NEBULA_FAR);
      sprite.position.set((Math.random() - 0.5) * 1600, (Math.random() - 0.5) * 1100, z);
      const s = 600 + Math.random() * 700;
      sprite.scale.set(s, s, 1);
      mat.rotation = Math.random() * Math.PI * 2;
      scene.add(sprite);
      nebulas.push(sprite);
    }

    // --- Subtle mouse parallax (skipped when reduced motion is requested) ---
    let targetX = 0;
    let targetY = 0;
    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX / window.innerWidth - 0.5;
      targetY = e.clientY / window.innerHeight - 0.5;
    };
    if (!prefersReducedMotion) window.addEventListener('pointermove', onPointerMove);

    // --- Resize ---
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (prefersReducedMotion) renderer.render(scene, camera);
    };
    window.addEventListener('resize', onResize);

    // --- Animation loop ---
    const clock = new THREE.Clock();
    let raf = 0;
    const posAttr = starGeo.getAttribute('position') as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    const renderFrame = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const step = CRUISE_SPEED * dt;

      // Drift stars forward; recycle past-the-camera ones to the far plane.
      for (let i = 0; i < STAR_COUNT; i++) {
        const zi = i * 3 + 2;
        posArr[zi] += step;
        if (posArr[zi] > STAR_NEAR) placeStar(i, STAR_FAR);
      }
      posAttr.needsUpdate = true;

      // Nebula drifts slower and rotates very gently.
      for (const n of nebulas) {
        n.position.z += step * 0.3;
        if (n.position.z > NEBULA_NEAR) {
          n.position.z = NEBULA_FAR;
          n.position.x = (Math.random() - 0.5) * 1600;
          n.position.y = (Math.random() - 0.5) * 1100;
        }
        (n.material as THREE.SpriteMaterial).rotation += 0.0002;
      }

      // Ease the camera toward the pointer for a touch of parallax depth.
      camera.position.x += (targetX * 26 - camera.position.x) * 0.03;
      camera.position.y += (-targetY * 26 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, -600);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderFrame);
    };

    if (prefersReducedMotion) {
      camera.lookAt(0, 0, -600);
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(renderFrame);
    }

    // Pause the loop when the tab is hidden to save battery/GPU.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !prefersReducedMotion) {
        clock.getDelta(); // discard the large gap so motion doesn't jump
        raf = requestAnimationFrame(renderFrame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
      starGeo.dispose();
      starMat.dispose();
      starTexture.dispose();
      nebulaTexture.dispose();
      for (const n of nebulas) (n.material as THREE.SpriteMaterial).dispose();
      renderer.dispose();
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 bg-black">
      {/* Gentle center vignette keeps hero text readable over the starfield. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0) 65%)',
        }}
      />
    </div>
  );
};

export default SpaceBackground;
