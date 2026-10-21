// Renders the app icon (same shapes as public/icons/icon.svg) to PNGs without extra dependencies.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const BLUE = [0x2a, 0x78, 0xd6];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// Coverage of a rounded rect at pixel (x, y), sampled 4x4 for antialiasing.
function cover(x, y, r) {
  let hits = 0;
  for (let sy = 0; sy < 4; sy++) {
    for (let sx = 0; sx < 4; sx++) {
      const px = x + (sx + 0.5) / 4, py = y + (sy + 0.5) / 4;
      if (px < r.x || py < r.y || px > r.x + r.w || py > r.y + r.h) continue;
      const cx = Math.min(Math.max(px, r.x + r.rx), r.x + r.w - r.rx);
      const cy = Math.min(Math.max(py, r.y + r.rx), r.y + r.h - r.rx);
      if ((px - cx) ** 2 + (py - cy) ** 2 <= r.rx ** 2) hits++;
    }
  }
  return hits / 16;
}

function render(size, maskable) {
  const s = size / 512;
  // Maskable icons keep content inside the central 80% safe zone.
  const k = maskable ? 0.78 : 1;
  const off = (size - size * k) / 2;
  const bar = (x, y, w, h, a) => ({ x: off + x * s * k, y: off + y * s * k, w: w * s * k, h: h * s * k, rx: 16 * s * k, a });
  const bg = maskable ? { x: 0, y: 0, w: size, h: size, rx: 0 } : { x: 0, y: 0, w: size, h: size, rx: 112 * s };
  const bars = [bar(112, 268, 64, 132, 0.55), bar(224, 196, 64, 204, 0.75), bar(336, 132, 64, 268, 1)];

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const a = cover(x, y, bg);
      let [r, g, b] = BLUE;
      for (const br of bars) {
        const c = cover(x, y, br) * br.a;
        r += (255 - r) * c; g += (255 - g) * c; b += (255 - b) * c;
      }
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = Math.round(a * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]);
}

writeFileSync('public/icons/icon-192.png', render(192, false));
writeFileSync('public/icons/icon-512.png', render(512, false));
writeFileSync('public/icons/icon-maskable-512.png', render(512, true));
console.log('icons written');
