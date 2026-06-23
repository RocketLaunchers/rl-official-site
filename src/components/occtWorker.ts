// Web Worker: parses a STEP (CAD) file into render-ready meshes off the main
// thread, so large models don't freeze the page. Uses occt-import-js
// (OpenCascade compiled to WASM). The result arrays are transferred (zero-copy)
// back to the StepViewer, which builds three.js geometry from them.
import occtimportjs, { type Occt } from 'occt-import-js';
import occtWasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';

const ctx = self as unknown as Worker;

let occtPromise: Promise<Occt> | null = null;
const getOcct = () => (occtPromise ??= occtimportjs({ locateFile: () => occtWasmUrl }));

ctx.onmessage = async (e: MessageEvent) => {
  const { buffer } = e.data as { buffer: ArrayBuffer };
  try {
    const occt = await getOcct();
    const result = occt.ReadStepFile(new Uint8Array(buffer), null);
    if (!result.success || result.meshes.length === 0) {
      ctx.postMessage({ error: 'Could not read any geometry from the STEP file.' });
      return;
    }

    const meshes = result.meshes.map((m) => ({
      position: new Float32Array(m.attributes.position.array),
      normal: m.attributes.normal ? new Float32Array(m.attributes.normal.array) : null,
      index: new Uint32Array(m.index.array),
      color: m.color ?? null,
    }));

    const transfer: Transferable[] = [];
    for (const m of meshes) {
      transfer.push(m.position.buffer);
      if (m.normal) transfer.push(m.normal.buffer);
      transfer.push(m.index.buffer);
    }
    ctx.postMessage({ meshes }, transfer);
  } catch (err) {
    ctx.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
