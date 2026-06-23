// Build-time converter: models/*.step  ->  public/*.glb
//
// STEP is a boundary-rep CAD format that needs a heavy WASM kernel (occt) to
// tessellate at runtime. Converting to GLB once, here, means the website ships
// a small binary mesh that three.js loads in well under a second — no WASM, no
// multi-second parse. Keep the (large) STEP sources in models/ — that folder is
// NOT deployed; only the generated GLB in public/ ships. After adding/replacing
// a STEP file in models/, run:
//
//   node --max-old-space-size=4096 scripts/step-to-glb.mjs
import * as occtMod from 'occt-import-js';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, quantize } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const occtimportjs = occtMod.default ?? occtMod;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'models'); // STEP sources (not deployed)
const outDir = path.join(root, 'public'); // GLB output (served)

if (!fs.existsSync(srcDir)) {
  console.log('No models/ folder — nothing to convert.');
  process.exit(0);
}
const files = fs.readdirSync(srcDir).filter((f) => /\.(step|stp)$/i.test(f));
if (!files.length) {
  console.log('No STEP files in models/.');
  process.exit(0);
}

const occt = await occtimportjs();

for (const file of files) {
  const inPath = path.join(srcDir, file);
  const outName = file.replace(/\.(step|stp)$/i, '.glb');
  console.log(`Converting ${file} …`);

  const content = new Uint8Array(fs.readFileSync(inPath));
  const result = occt.ReadStepFile(content, null);
  if (!result.success || !result.meshes.length) {
    console.error(`  ✗ could not read geometry from ${file}`);
    continue;
  }

  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  const rootNode = doc.createNode(file);
  scene.addChild(rootNode);

  let tris = 0;
  for (const m of result.meshes) {
    const position = doc.createAccessor().setType('VEC3').setArray(new Float32Array(m.attributes.position.array)).setBuffer(buffer);
    const indices = doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(m.index.array)).setBuffer(buffer);
    tris += m.index.array.length / 3;
    const prim = doc.createPrimitive().setAttribute('POSITION', position).setIndices(indices);
    if (m.attributes.normal) {
      const normal = doc.createAccessor().setType('VEC3').setArray(new Float32Array(m.attributes.normal.array)).setBuffer(buffer);
      prim.setAttribute('NORMAL', normal);
    }
    const mat = doc.createMaterial(m.name || 'material').setMetallicFactor(0.25).setRoughnessFactor(0.6);
    if (m.color) mat.setBaseColorFactor([m.color[0], m.color[1], m.color[2], 1]);
    prim.setMaterial(mat);
    rootNode.addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(prim)));
  }

  // Shrink: merge dupes, weld vertices, quantize positions/normals
  // (KHR_mesh_quantization — supported natively by three.js GLTFLoader).
  await doc.transform(dedup(), weld(), quantize());
  const glb = await new NodeIO().registerExtensions(ALL_EXTENSIONS).writeBinary(doc);
  fs.writeFileSync(path.join(outDir, outName), glb);
  const mb = (glb.byteLength / 1048576).toFixed(2);
  const origMb = (fs.statSync(inPath).size / 1048576).toFixed(2);
  console.log(`  ✓ ${outName} — ${mb} MB (from ${origMb} MB STEP, ~${Math.round(tris).toLocaleString()} triangles)`);
}
console.log('Done.');
