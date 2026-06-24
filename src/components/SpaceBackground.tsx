import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/*
 * Dynamic "cruising through space" background.
 *
 * A uniform starfield plus several dense, colored STAR CLUSTERS (the "nebulae")
 * all drift gently toward the camera. Each star fades in as it appears in the
 * distance and fades out before it passes the camera, so nothing ever blinks
 * out mid-screen. Stars vary in size and color; clusters come in different
 * shapes (blob / filament / spiral) with a faint gas glow behind them.
 *
 * Pure Three.js with a small custom point shader — no asset files, no new deps.
 *
 * Tunables:
 */
const FIELD_STARS = 1700;
const CLUSTER_COUNT = 4;
const STARS_PER_CLUSTER = 380;

const FAR = -2200;          // where stars spawn / recycle to
const NEAR = -40;           // where stars recycle (just in front of camera)
const FADE_IN = 750;        // distance over which a star fades in at the back
const FADE_OUT = 420;       // distance over which it fades out near the camera
const CRUISE_SPEED = 34;    // forward drift, units/sec (raise = faster cruise)
const FIELD_SPREAD = 0.72;  // how wide the field frustum is (× depth)

// Nebula / cluster palette (hue-rich so each cluster reads as a distinct region)
const CLUSTER_COLORS = [0x6fb6ff, 0xb06bff, 0xff5fa8, 0x4fe0c0, 0xffa64d, 0x8a7bff];

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uSizeScale;
  uniform float uPixelRatio;
  uniform float uNear;
  uniform float uFar;
  uniform float uFadeIn;
  uniform float uFadeOut;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float z = position.z;
    float fin = smoothstep(uFar, uFar + uFadeIn, z);
    float fout = 1.0 - smoothstep(uNear - uFadeOut, uNear, z);
    vAlpha = clamp(fin * fout, 0.0, 1.0);
    float sizeCss = clamp(aSize * uSizeScale / max(-mv.z, 1.0), 0.0, 16.0);
    gl_PointSize = sizeCss * uPixelRatio;
  }
`;

const STAR_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float glow = pow(core, 2.2);
    gl_FragColor = vec4(vColor * (0.7 + 0.3 * glow), glow * vAlpha);
  }
`;

/** Soft cloudy blob used as the faint gas glow behind each cluster. */
function createNebulaTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < 16; i++) {
    const x = size * (0.25 + 0.5 * Math.random());
    const y = size * (0.25 + 0.5 * Math.random());
    const r = size * (0.1 + 0.22 * Math.random());
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Approximate standard-normal sample in roughly [-1.5, 1.5]. */
const gauss = () => Math.random() + Math.random() + Math.random() - 1.5;

const SpaceBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Renderer / scene / camera ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(0, 0, 0);

    const sizeScale = () => window.innerHeight * 0.5;

    const starMaterial = () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSizeScale: { value: sizeScale() },
          uPixelRatio: { value: pixelRatio },
          uNear: { value: NEAR },
          uFar: { value: FAR },
          uFadeIn: { value: FADE_IN },
          uFadeOut: { value: FADE_OUT },
        },
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

    const color = new THREE.Color();

    // ---------------------------------------------------------------------
    // Field: uniform scattered stars, recycled individually.
    // ---------------------------------------------------------------------
    const fieldPos = new Float32Array(FIELD_STARS * 3);
    const fieldColor = new Float32Array(FIELD_STARS * 3);
    const fieldSize = new Float32Array(FIELD_STARS);

    const placeFieldStar = (i: number, z: number) => {
      const az = Math.abs(z);
      fieldPos[i * 3] = (Math.random() - 0.5) * 2 * az * FIELD_SPREAD;
      fieldPos[i * 3 + 1] = (Math.random() - 0.5) * 2 * az * FIELD_SPREAD * 0.8;
      fieldPos[i * 3 + 2] = z;
    };

    const setFieldColor = (i: number) => {
      const roll = Math.random();
      if (roll < 0.62) color.setHSL(0, 0, 0.85 + Math.random() * 0.15); // white
      else if (roll < 0.82) color.setHSL(0.6, 0.45, 0.82); // blue
      else if (roll < 0.92) color.setHSL(0.53, 0.5, 0.8); // cyan
      else if (roll < 0.98) color.setHSL(0.08, 0.55, 0.82); // amber
      else color.setHSL(0.02, 0.6, 0.75); // red giant
      fieldColor[i * 3] = color.r;
      fieldColor[i * 3 + 1] = color.g;
      fieldColor[i * 3 + 2] = color.b;
      // Mostly small, a sprinkling of bright stars.
      fieldSize[i] = Math.random() < 0.9 ? 1.1 + Math.random() * 1.7 : 3 + Math.random() * 2.5;
    };

    for (let i = 0; i < FIELD_STARS; i++) {
      placeFieldStar(i, FAR + Math.random() * (NEAR - FAR));
      setFieldColor(i);
    }

    const fieldGeo = new THREE.BufferGeometry();
    fieldGeo.setAttribute('position', new THREE.BufferAttribute(fieldPos, 3));
    fieldGeo.setAttribute('aColor', new THREE.BufferAttribute(fieldColor, 3));
    fieldGeo.setAttribute('aSize', new THREE.BufferAttribute(fieldSize, 1));
    const fieldMat = starMaterial();
    const field = new THREE.Points(fieldGeo, fieldMat);
    field.frustumCulled = false;
    scene.add(field);

    // ---------------------------------------------------------------------
    // Clusters: dense colored star groups ("nebulae"), recycled as a whole.
    // ---------------------------------------------------------------------
    const SHAPES = ['blob', 'filament', 'spiral', 'blob', 'filament'] as const;
    type Cluster = {
      x: number;
      y: number;
      z: number;
      radius: number;
      color: THREE.Color;
    };
    const clusters: Cluster[] = [];

    const clusterCount = CLUSTER_COUNT * STARS_PER_CLUSTER;
    const clusterPos = new Float32Array(clusterCount * 3);
    const clusterOffset = new Float32Array(clusterCount * 3);
    const clusterColor = new Float32Array(clusterCount * 3);
    const clusterSize = new Float32Array(clusterCount);

    const nebulaTexture = createNebulaTexture();
    const glows: THREE.Sprite[] = [];

    const regenCluster = (k: number) => {
      const z = FAR;
      const az = Math.abs(z);
      const c: Cluster = {
        x: (Math.random() - 0.5) * 2 * az * 0.42,
        y: (Math.random() - 0.5) * 2 * az * 0.34,
        z,
        radius: 170 + Math.random() * 190,
        color: new THREE.Color(CLUSTER_COLORS[Math.floor(Math.random() * CLUSTER_COLORS.length)]),
      };
      clusters[k] = c;

      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      // A random in-plane axis for filaments.
      const ang = Math.random() * Math.PI * 2;
      const ax = Math.cos(ang);
      const ay = Math.sin(ang);
      const twist = (Math.random() < 0.5 ? 1 : -1) * (1.5 + Math.random() * 2);

      const base = { h: 0, s: 0, l: 0 };
      c.color.getHSL(base);

      for (let j = 0; j < STARS_PER_CLUSTER; j++) {
        const gi = k * STARS_PER_CLUSTER + j;
        let ox = 0;
        let oy = 0;
        let oz = 0;
        if (shape === 'blob') {
          ox = gauss() * c.radius * 0.7;
          oy = gauss() * c.radius * 0.7;
          oz = gauss() * c.radius * 0.7;
        } else if (shape === 'filament') {
          const t = gauss() * c.radius * 1.6;
          ox = ax * t + gauss() * c.radius * 0.22;
          oy = ay * t + gauss() * c.radius * 0.22;
          oz = gauss() * c.radius * 0.22;
        } else {
          // spiral / galaxy patch
          const r = Math.pow(Math.random(), 0.6) * c.radius;
          const a = ang + (r / c.radius) * twist + gauss() * 0.25;
          ox = Math.cos(a) * r + gauss() * c.radius * 0.06;
          oy = Math.sin(a) * r * 0.7 + gauss() * c.radius * 0.06;
          oz = gauss() * c.radius * 0.12;
        }
        clusterOffset[gi * 3] = ox;
        clusterOffset[gi * 3 + 1] = oy;
        clusterOffset[gi * 3 + 2] = oz;

        // Color: cluster hue with jitter, plus a few hot white stars.
        if (Math.random() < 0.14) {
          color.setHSL(0, 0, 0.9 + Math.random() * 0.1);
        } else {
          color.setHSL(
            (base.h + (Math.random() - 0.5) * 0.06 + 1) % 1,
            Math.min(1, base.s * (0.7 + Math.random() * 0.5)),
            Math.min(1, base.l * (0.6 + Math.random() * 0.7)),
          );
        }
        clusterColor[gi * 3] = color.r;
        clusterColor[gi * 3 + 1] = color.g;
        clusterColor[gi * 3 + 2] = color.b;
        clusterSize[gi] = Math.random() < 0.88 ? 0.8 + Math.random() * 1.3 : 2.4 + Math.random() * 1.8;
      }

      // Faint gas glow behind the cluster.
      const glow = glows[k];
      (glow.material as THREE.SpriteMaterial).color.copy(c.color);
      glow.scale.setScalar(c.radius * 3.2);
    };

    // Create glow sprites first so regenCluster can configure them.
    for (let k = 0; k < CLUSTER_COUNT; k++) {
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.renderOrder = -1;
      scene.add(sprite);
      glows.push(sprite);
    }
    for (let k = 0; k < CLUSTER_COUNT; k++) {
      regenCluster(k);
      // Spread the initial clusters through the depth instead of all at FAR.
      clusters[k].z = FAR + Math.random() * (NEAR - FAR);
    }

    const clusterGeo = new THREE.BufferGeometry();
    clusterGeo.setAttribute('position', new THREE.BufferAttribute(clusterPos, 3));
    clusterGeo.setAttribute('aColor', new THREE.BufferAttribute(clusterColor, 3));
    clusterGeo.setAttribute('aSize', new THREE.BufferAttribute(clusterSize, 1));
    const clusterMat = starMaterial();
    const clusterPoints = new THREE.Points(clusterGeo, clusterMat);
    clusterPoints.frustumCulled = false;
    scene.add(clusterPoints);

    const clusterPosAttr = clusterGeo.getAttribute('position') as THREE.BufferAttribute;
    const clusterColorAttr = clusterGeo.getAttribute('aColor') as THREE.BufferAttribute;
    const clusterSizeAttr = clusterGeo.getAttribute('aSize') as THREE.BufferAttribute;
    const fieldPosAttr = fieldGeo.getAttribute('position') as THREE.BufferAttribute;

    // Smooth fade matching the shader, for the gas-glow sprite opacity.
    const fadeAt = (z: number) => {
      const fin = THREE.MathUtils.smoothstep(z, FAR, FAR + FADE_IN);
      const fout = 1 - THREE.MathUtils.smoothstep(z, NEAR - FADE_OUT, NEAR);
      return Math.max(0, Math.min(1, fin * fout));
    };

    const writeClusterPositions = () => {
      for (let k = 0; k < CLUSTER_COUNT; k++) {
        const c = clusters[k];
        const glow = glows[k];
        glow.position.set(c.x, c.y, c.z);
        (glow.material as THREE.SpriteMaterial).opacity = 0.08 * fadeAt(c.z);
        for (let j = 0; j < STARS_PER_CLUSTER; j++) {
          const gi = k * STARS_PER_CLUSTER + j;
          clusterPos[gi * 3] = c.x + clusterOffset[gi * 3];
          clusterPos[gi * 3 + 1] = c.y + clusterOffset[gi * 3 + 1];
          clusterPos[gi * 3 + 2] = c.z + clusterOffset[gi * 3 + 2];
        }
      }
    };
    writeClusterPositions();
    clusterPosAttr.needsUpdate = true;

    // --- Subtle mouse parallax ---
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
      fieldMat.uniforms.uSizeScale.value = sizeScale();
      clusterMat.uniforms.uSizeScale.value = sizeScale();
      if (prefersReducedMotion) renderer.render(scene, camera);
    };
    window.addEventListener('resize', onResize);

    // --- Animation loop ---
    const clock = new THREE.Clock();
    let raf = 0;

    const renderFrame = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const step = CRUISE_SPEED * dt;

      // Field stars drift forward; recycle the ones that reach the camera.
      for (let i = 0; i < FIELD_STARS; i++) {
        const zi = i * 3 + 2;
        fieldPos[zi] += step;
        if (fieldPos[zi] > NEAR) placeFieldStar(i, FAR);
      }
      fieldPosAttr.needsUpdate = true;

      // Clusters drift forward; recycle each one once fully past the camera.
      let colorDirty = false;
      for (let k = 0; k < CLUSTER_COUNT; k++) {
        const c = clusters[k];
        c.z += step;
        if (c.z - c.radius > NEAR) {
          regenCluster(k);
          colorDirty = true;
        }
      }
      writeClusterPositions();
      clusterPosAttr.needsUpdate = true;
      if (colorDirty) {
        clusterColorAttr.needsUpdate = true;
        clusterSizeAttr.needsUpdate = true;
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

    // Pause when the tab is hidden.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !prefersReducedMotion) {
        clock.getDelta();
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
      fieldGeo.dispose();
      fieldMat.dispose();
      clusterGeo.dispose();
      clusterMat.dispose();
      nebulaTexture.dispose();
      for (const g of glows) (g.material as THREE.SpriteMaterial).dispose();
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
