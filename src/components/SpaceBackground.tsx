import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/*
 * Dynamic "cruising through space" background.
 *
 * Nebulae are rendered with a real-time fragment shader: domain-warped fractal
 * Brownian motion (fBm) evaluated per screen pixel, so the gas is crisp at any
 * zoom (never pixelated). A box edge-fade dissolves each cloud before its quad
 * border (no square edges), an irregular low-frequency envelope + rotation +
 * anisotropic stretch break up round shapes, and two emission palettes blend
 * across the cloud for multi-color gas.
 *
 * Each nebula is also rendered to a small offscreen buffer; stars are
 * importance-sampled from that exact output, so they sit in the bright
 * filaments and take the local gas color.
 *
 * Look is driven by PRESETS you can mix & match: PALETTES × STRUCTURES.
 *
 * Pure Three.js — no asset files, no new deps.
 */

// ---- Scene tunables --------------------------------------------------------
const FIELD_STARS = 1400;
const CLUSTER_COUNT = 4;
const STARS_PER_CLUSTER = 420;

const FAR = -2200;
const NEAR = -40;
const FADE_IN = 750;
const FADE_OUT = 440;
const CRUISE_SPEED = 34;
const FIELD_SPREAD = 0.72;
const MIN_PX = 1.8;
const GAS_OPACITY = 0.85; // overall nebula brightness
const SAMPLE_RES = 128; // offscreen buffer size used for star placement

// ---- Nebula presets (mix & match) -----------------------------------------
const PALETTE_HEX: Record<string, string[]> = {
  crab: ['#10324a', '#2f7fa0', '#bfe6f2', '#e0b24a', '#b5552a'],
  emission: ['#241246', '#7a2d8f', '#d6478f', '#ff7a6b', '#7fa0ff'],
  reflection: ['#0a1736', '#244e9e', '#3f8fe0', '#9fd0ff', '#eaf4ff'],
  ember: ['#160a06', '#5a2410', '#a8521e', '#e0934a', '#f5d9a8'],
  oxygen: ['#06231f', '#157a5f', '#3fd0a0', '#bff0d8', '#d8d04a'],
  pillars: ['#10210a', '#3a5f1f', '#7fae3f', '#d9c24a', '#b5773a'],
};

type Structure = {
  scale: number;
  warp: number;
  voidLow: number;
  voidHigh: number;
  filPow: number;
  filMix: number;
  contrast: number;
  intensity: number;
};
const STRUCTURES: Structure[] = [
  { scale: 2.4, warp: 4.5, voidLow: 0.42, voidHigh: 0.72, filPow: 3.0, filMix: 0.75, contrast: 1.15, intensity: 1.0 },
  { scale: 1.7, warp: 2.6, voidLow: 0.36, voidHigh: 0.7, filPow: 2.0, filMix: 0.35, contrast: 1.1, intensity: 1.05 },
  { scale: 2.9, warp: 5.5, voidLow: 0.45, voidHigh: 0.8, filPow: 4.0, filMix: 0.85, contrast: 1.25, intensity: 0.95 },
  { scale: 2.0, warp: 3.4, voidLow: 0.5, voidHigh: 0.86, filPow: 2.5, filMix: 0.5, contrast: 1.3, intensity: 1.0 },
];

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// ---- Nebula shader ---------------------------------------------------------
const NEB_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEB_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uPaletteA[5];
  uniform vec3 uPaletteB[5];
  uniform vec2 uSeed;
  uniform vec2 uAniso;
  uniform float uRot, uScale, uWarp, uVoidLow, uVoidHigh, uFilPow, uFilMix;
  uniform float uContrast, uIntensity, uOpacity, uEnvScale, uEnvThreshold;

  // Dave Hoskins "hash without sine": all intermediates stay small and bounded,
  // so it survives lower-precision mobile GPU floats (no blocky breakdown).
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise(vec2 x) {
    vec2 p = floor(x);
    vec2 f = fract(x);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(p);
    float b = hash12(p + vec2(1.0, 0.0));
    float c = hash12(p + vec2(0.0, 1.0));
    float d = hash12(p + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5, n = 0.0;
    for (int i = 0; i < 4; i++) { s += a * noise(p); n += a; p *= 2.0; a *= 0.5; }
    return s / n;
  }
  float warped(vec2 p, float w) {
    float q1 = fbm(p);
    float q2 = fbm(p + vec2(5.2, 1.3));
    vec2 q = vec2(q1, q2);
    float r1 = fbm(p + w * q + vec2(1.7, 9.2));
    float r2 = fbm(p + w * q + vec2(8.3, 2.8));
    return fbm(p + w * vec2(r1, r2));
  }
  vec3 palA(float t) {
    vec3 col = uPaletteA[0];
    col = mix(col, uPaletteA[1], clamp(t, 0.0, 1.0));
    col = mix(col, uPaletteA[2], clamp(t - 1.0, 0.0, 1.0));
    col = mix(col, uPaletteA[3], clamp(t - 2.0, 0.0, 1.0));
    col = mix(col, uPaletteA[4], clamp(t - 3.0, 0.0, 1.0));
    return col;
  }
  vec3 palB(float t) {
    vec3 col = uPaletteB[0];
    col = mix(col, uPaletteB[1], clamp(t, 0.0, 1.0));
    col = mix(col, uPaletteB[2], clamp(t - 1.0, 0.0, 1.0));
    col = mix(col, uPaletteB[3], clamp(t - 2.0, 0.0, 1.0));
    col = mix(col, uPaletteB[4], clamp(t - 3.0, 0.0, 1.0));
    return col;
  }
  void main() {
    vec2 c = vUv * 2.0 - 1.0;
    // Box edge fade -> gas dissolves well before the quad border (no square edges).
    vec2 ef = 1.0 - smoothstep(0.45, 0.95, abs(c));
    float edge = ef.x * ef.y;
    if (edge <= 0.002) discard;

    float ca = cos(uRot), sa = sin(uRot);
    vec2 rc = vec2(c.x * ca - c.y * sa, c.x * sa + c.y * ca);
    vec2 p = rc * uScale * uAniso + uSeed;

    float base = warped(p, uWarp);
    float fil = pow(1.0 - abs(2.0 * base - 1.0), uFilPow);
    float cloud = smoothstep(uVoidLow, uVoidHigh, base);
    float d = clamp(mix(cloud, fil, uFilMix), 0.0, 1.0);

    float env = fbm(c * uEnvScale + uSeed * 0.5 + vec2(5.0, 9.0));
    float envMask = smoothstep(uEnvThreshold - 0.12, uEnvThreshold + 0.22, env);
    d *= envMask * edge;
    d = pow(clamp(d, 0.0, 1.0), uContrast);

    float hsel = fbm(c * 0.7 + uSeed + vec2(3.0, 19.0)) * 4.0;
    float region = fbm(c * 0.45 + uSeed + vec2(20.0, 7.0));
    vec3 col = mix(palA(hsel), palB(hsel), smoothstep(0.4, 0.6, region));
    float hot = smoothstep(0.72, 1.0, d) * 0.85;
    col += (1.0 - col) * hot;

    gl_FragColor = vec4(col, d * uIntensity * uOpacity);
  }
`;

// ---- Star shader (fades + min-size, no sub-pixel glitter) ------------------
const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uSizeScale;
  uniform float uPixelRatio;
  uniform float uMinPx;
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
    float fade = clamp(fin * fout, 0.0, 1.0);
    float wantCss = aSize * uSizeScale / max(-mv.z, 1.0);
    float small = clamp(wantCss / uMinPx, 0.0, 1.0);
    float sizeCss = clamp(max(wantCss, uMinPx), 0.0, 18.0);
    vAlpha = fade * (0.15 + 0.85 * small);
    gl_PointSize = sizeCss * uPixelRatio;
  }
`;

const STAR_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(vColor, pow(core, 1.7) * vAlpha);
  }
`;

const gauss3 = () => Math.random() + Math.random() + Math.random() - 1.5;

type NebulaParams = {
  palA: [number, number, number][];
  palB: [number, number, number][];
  st: Structure;
  seedX: number;
  seedY: number;
  rot: number;
  anisoX: number;
  anisoY: number;
  envScale: number;
  envThreshold: number;
};

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
          uMinPx: { value: MIN_PX },
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
    const palettes = Object.values(PALETTE_HEX).map((stops) => stops.map(hexToRgb));

    const makeNebulaMaterial = (blend: THREE.Blending, transparent: boolean) =>
      new THREE.ShaderMaterial({
        uniforms: {
          uPaletteA: { value: [0, 0, 0, 0, 0].map(() => new THREE.Vector3()) },
          uPaletteB: { value: [0, 0, 0, 0, 0].map(() => new THREE.Vector3()) },
          uSeed: { value: new THREE.Vector2() },
          uAniso: { value: new THREE.Vector2(1, 1) },
          uRot: { value: 0 },
          uScale: { value: 2 },
          uWarp: { value: 4 },
          uVoidLow: { value: 0.42 },
          uVoidHigh: { value: 0.72 },
          uFilPow: { value: 3 },
          uFilMix: { value: 0.6 },
          uContrast: { value: 1.2 },
          uIntensity: { value: 1 },
          uOpacity: { value: 0 },
          uEnvScale: { value: 1 },
          uEnvThreshold: { value: 0.45 },
        },
        vertexShader: NEB_VERT,
        fragmentShader: NEB_FRAG,
        transparent,
        depthTest: false,
        depthWrite: false,
        blending: blend,
        side: THREE.DoubleSide,
        precision: 'highp', // inject one clean highp declaration (mobile-safe)
      });

    const applyParams = (mat: THREE.ShaderMaterial, P: NebulaParams) => {
      const u = mat.uniforms;
      for (let i = 0; i < 5; i++) {
        (u.uPaletteA.value as THREE.Vector3[])[i].set(P.palA[i][0], P.palA[i][1], P.palA[i][2]);
        (u.uPaletteB.value as THREE.Vector3[])[i].set(P.palB[i][0], P.palB[i][1], P.palB[i][2]);
      }
      (u.uSeed.value as THREE.Vector2).set(P.seedX, P.seedY);
      (u.uAniso.value as THREE.Vector2).set(P.anisoX, P.anisoY);
      u.uRot.value = P.rot;
      u.uScale.value = P.st.scale;
      u.uWarp.value = P.st.warp;
      u.uVoidLow.value = P.st.voidLow;
      u.uVoidHigh.value = P.st.voidHigh;
      u.uFilPow.value = P.st.filPow;
      u.uFilMix.value = P.st.filMix;
      u.uContrast.value = P.st.contrast;
      u.uIntensity.value = P.st.intensity;
      u.uEnvScale.value = P.envScale;
      u.uEnvThreshold.value = P.envThreshold;
    };

    const randomParams = (): NebulaParams => {
      const a = Math.floor(Math.random() * palettes.length);
      let b = Math.floor(Math.random() * palettes.length);
      if (b === a) b = (a + 1) % palettes.length;
      return {
        palA: palettes[a],
        palB: palettes[b],
        st: STRUCTURES[Math.floor(Math.random() * STRUCTURES.length)],
        // Keep noise coords small so floor()/fract() stay precise on mobile GPUs.
        seedX: Math.random() * 6,
        seedY: Math.random() * 6,
        rot: Math.random() * Math.PI,
        anisoX: 0.6 + Math.random() * 0.9,
        anisoY: 0.6 + Math.random() * 0.9,
        envScale: 0.7 + Math.random() * 0.9,
        envThreshold: 0.34 + Math.random() * 0.2,
      };
    };

    // --- Offscreen sampler: render a nebula to a small buffer for star placement.
    const rt = new THREE.WebGLRenderTarget(SAMPLE_RES, SAMPLE_RES, { depthBuffer: false, stencilBuffer: false });
    const rtBuf = new Uint8Array(SAMPLE_RES * SAMPLE_RES * 4);
    const rtScene = new THREE.Scene();
    const rtCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    rtCam.position.z = 1;
    const rtMat = makeNebulaMaterial(THREE.NoBlending, false);
    const rtQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), rtMat);
    rtScene.add(rtQuad);

    const sampleNebula = (P: NebulaParams) => {
      applyParams(rtMat, P);
      rtMat.uniforms.uOpacity.value = 1;
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(rtScene, rtCam);
      renderer.readRenderTargetPixels(rt, 0, 0, SAMPLE_RES, SAMPLE_RES, rtBuf);
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 1);
    };

    // ---------------------------------------------------------------------
    // Field stars
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
      if (roll < 0.62) color.setHSL(0, 0, 0.85 + Math.random() * 0.15);
      else if (roll < 0.82) color.setHSL(0.6, 0.45, 0.82);
      else if (roll < 0.92) color.setHSL(0.53, 0.5, 0.8);
      else if (roll < 0.98) color.setHSL(0.08, 0.55, 0.82);
      else color.setHSL(0.02, 0.6, 0.75);
      fieldColor[i * 3] = color.r;
      fieldColor[i * 3 + 1] = color.g;
      fieldColor[i * 3 + 2] = color.b;
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
    // Clusters: a nebula gas plane + stars sampled from it
    // ---------------------------------------------------------------------
    type Cluster = { x: number; y: number; z: number; size: number };
    const clusters: Cluster[] = [];
    const gasMeshes: THREE.Mesh[] = [];
    const gasMats: THREE.ShaderMaterial[] = [];
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    for (let k = 0; k < CLUSTER_COUNT; k++) {
      const mat = makeNebulaMaterial(THREE.AdditiveBlending, true);
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.renderOrder = -1;
      mesh.frustumCulled = false;
      scene.add(mesh);
      gasMeshes.push(mesh);
      gasMats.push(mat);
    }

    const clusterTotal = CLUSTER_COUNT * STARS_PER_CLUSTER;
    const clusterPos = new Float32Array(clusterTotal * 3);
    const clusterOffset = new Float32Array(clusterTotal * 3);
    const clusterColor = new Float32Array(clusterTotal * 3);
    const clusterSize = new Float32Array(clusterTotal);

    const regenCluster = (k: number) => {
      const z = FAR;
      const az = Math.abs(z);
      const c: Cluster = {
        x: (Math.random() - 0.5) * 2 * az * 0.4,
        y: (Math.random() - 0.5) * 2 * az * 0.32,
        z,
        size: 800 + Math.random() * 800,
      };
      clusters[k] = c;

      const P = randomParams();
      applyParams(gasMats[k], P);
      gasMeshes[k].scale.set(c.size, c.size, 1);

      // Render this nebula offscreen, then importance-sample stars from it.
      sampleNebula(P);
      const span = c.size;
      const R = SAMPLE_RES;
      for (let j = 0; j < STARS_PER_CLUSTER; j++) {
        const gi = k * STARS_PER_CLUSTER + j;
        let bx = 0;
        let by = 0;
        let dens = 0;
        for (let tries = 0; tries < 12; tries++) {
          bx = (Math.random() * R) | 0;
          by = (Math.random() * R) | 0;
          dens = rtBuf[(by * R + bx) * 4 + 3] / 255;
          if (dens > Math.random() * 0.8) break;
        }
        clusterOffset[gi * 3] = ((bx + 0.5) / R - 0.5) * span;
        clusterOffset[gi * 3 + 1] = ((by + 0.5) / R - 0.5) * span;
        clusterOffset[gi * 3 + 2] = gauss3() * span * 0.12;

        const pi = (by * R + bx) * 4;
        if (Math.random() < 0.12) {
          color.setHSL(0, 0, 0.9 + Math.random() * 0.1);
        } else {
          const boost = 0.6 + Math.random() * 0.7;
          color.setRGB(
            Math.min(1, (rtBuf[pi] / 255) * boost + 0.12),
            Math.min(1, (rtBuf[pi + 1] / 255) * boost + 0.12),
            Math.min(1, (rtBuf[pi + 2] / 255) * boost + 0.12),
          );
        }
        clusterColor[gi * 3] = color.r;
        clusterColor[gi * 3 + 1] = color.g;
        clusterColor[gi * 3 + 2] = color.b;
        const big = Math.random() < (dens > 0.6 ? 0.14 : 0.05);
        clusterSize[gi] = big ? 2.2 + Math.random() * 1.8 : 0.7 + Math.random() * 1.2;
      }
    };

    for (let k = 0; k < CLUSTER_COUNT; k++) {
      regenCluster(k);
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

    const fadeAt = (z: number) => {
      const fin = THREE.MathUtils.smoothstep(z, FAR, FAR + FADE_IN);
      const fout = 1 - THREE.MathUtils.smoothstep(z, NEAR - FADE_OUT, NEAR);
      return Math.max(0, Math.min(1, fin * fout));
    };

    const writeClusterPositions = () => {
      for (let k = 0; k < CLUSTER_COUNT; k++) {
        const c = clusters[k];
        gasMeshes[k].position.set(c.x, c.y, c.z);
        gasMats[k].uniforms.uOpacity.value = GAS_OPACITY * fadeAt(c.z);
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

    // --- Mouse parallax ---
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

    // --- Animation ---
    const clock = new THREE.Clock();
    let raf = 0;
    const renderFrame = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const step = CRUISE_SPEED * dt;

      for (let i = 0; i < FIELD_STARS; i++) {
        const zi = i * 3 + 2;
        fieldPos[zi] += step;
        if (fieldPos[zi] > NEAR) placeFieldStar(i, FAR);
      }
      fieldPosAttr.needsUpdate = true;

      let colorDirty = false;
      for (let k = 0; k < CLUSTER_COUNT; k++) {
        const c = clusters[k];
        c.z += step;
        if (c.z - c.size * 0.5 > NEAR) {
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
      planeGeo.dispose();
      for (const m of gasMats) m.dispose();
      rtMat.dispose();
      rtQuad.geometry.dispose();
      rt.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 bg-black">
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
