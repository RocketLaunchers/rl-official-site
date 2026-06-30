// Single-file 3D converter used by the CMS: <input> -> <output.glb>
//
//   node --max-old-space-size=4096 scripts/convert-model.mjs in.step out.glb
//
// Supports STEP/STP (via occt), OBJ (manual parse), and GLB/glTF (optimize
// pass-through). Always emits an optimized, quantized GLB so the website only
// ever deals with small binary meshes — no STEP/OBJ/WASM at runtime.
import * as occtMod from 'occt-import-js';
import obj2gltf from 'obj2gltf';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, quantize } from '@gltf-transform/functions';
import fs from 'node:fs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: convert-model.mjs <input> <output.glb>');
  process.exit(1);
}
const ext = inPath.toLowerCase().split('.').pop();

function buildDoc(meshes) {
  // meshes: [{ position:number[], normal?:number[], index?:number[], color?:[r,g,b] }]
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  const rootNode = doc.createNode();
  scene.addChild(rootNode);
  for (const m of meshes) {
    if (!m.position?.length) continue;
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(m.position)).setBuffer(buffer));
    if (m.normal?.length) {
      prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(m.normal)).setBuffer(buffer));
    }
    if (m.index?.length) {
      prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(m.index)).setBuffer(buffer));
    }
    const mat = doc.createMaterial().setMetallicFactor(0.2).setRoughnessFactor(0.7);
    if (m.color) mat.setBaseColorFactor([m.color[0], m.color[1], m.color[2], 1]);
    prim.setMaterial(mat);
    rootNode.addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(prim)));
  }
  return doc;
}

async function fromStep() {
  const occt = await (occtMod.default ?? occtMod)();
  const result = occt.ReadStepFile(new Uint8Array(fs.readFileSync(inPath)), null);
  if (!result.success || !result.meshes.length) throw new Error('Could not read STEP geometry');
  return buildDoc(
    result.meshes.map((m) => ({
      position: m.attributes.position.array,
      normal: m.attributes.normal?.array,
      index: m.index.array,
      color: m.color,
    })),
  );
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

async function fromObj() {
  // obj2gltf (CesiumGS) is a mature, battle-tested OBJ→glTF converter — no
  // hand-rolled parsing. It emits a GLB buffer we then optimize with
  // gltf-transform, the same pass STEP/GLB inputs go through.
  const glb = await obj2gltf(inPath, { binary: true });
  return io.readBinary(new Uint8Array(glb));
}

let doc;
if (ext === 'step' || ext === 'stp') doc = await fromStep();
else if (ext === 'obj') doc = await fromObj();
else if (ext === 'glb' || ext === 'gltf') doc = await io.read(inPath);
else {
  console.error(`Unsupported model format: .${ext}`);
  process.exit(1);
}

await doc.transform(dedup(), weld(), quantize());
const glb = await io.writeBinary(doc);
fs.writeFileSync(outPath, glb);
console.log(`wrote ${outPath} (${(glb.byteLength / 1048576).toFixed(2)} MB)`);
