// Bootstraps a simple valid RGBA PNG app icon (no external image tooling needed).
// Tauri embeds bundle.icon at compile time, so the file must exist and be valid.
//
// This only writes icon.png. The Windows build also needs icon.ico (and macOS
// needs icon.icns), so after replacing icon.png with real branding, regenerate
// the full platform set referenced in tauri.conf.json with:
//   pnpm tauri icon src-tauri/icons/icon.png
// (run from the cms/ directory).
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 512;
const H = 512;
const raw = Buffer.alloc(H * (1 + W * 4)); // 1 filter byte per row + RGBA pixels

function setPixel(x, y, r, g, b, a) {
  const i = y * (1 + W * 4) + 1 + x * 4;
  raw[i] = r;
  raw[i + 1] = g;
  raw[i + 2] = b;
  raw[i + 3] = a;
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // Dark background (gray-900) with a centered sky-400 rounded square.
    let r = 17, g = 24, b = 39;
    const m = 104;
    const inSquare = x >= m && x < W - m && y >= m && y < H - m;
    const cx = x - W / 2;
    const cy = y - H / 2;
    const inCircle = cx * cx + cy * cy < 70 * 70;
    if (inSquare) { r = 56; g = 189; b = 248; }
    if (inCircle) { r = 17; g = 24; b = 39; }
    setPixel(x, y, r, g, b, 255);
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src-tauri', 'icons', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);
