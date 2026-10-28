#!/usr/bin/env node
/**
 * Generates the PWA icons without any image dependencies.
 *
 * The icons are a rounded square in the app's primary colour with a white "W".
 * Output is committed so `vite build` only has to copy `public/`.
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const BACKGROUND = [29, 78, 216, 255]; // --color-primary (#1d4ed8)
const FOREGROUND = [255, 255, 255, 255];
const SAMPLES = 4;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
};

const encodePng = (width, height, rgba) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const distanceToSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
};

const insideRoundedSquare = (x, y, size, radius) => {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
};

const renderIcon = ({ size, maskable }) => {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : size * 0.22;
  const scale = maskable ? 0.72 : 0.82;
  const offset = (1 - scale) / 2;
  const stroke = 0.062 * size;

  const points = [
    [offset + 0.08 * scale, offset + 0.16 * scale],
    [offset + 0.32 * scale, offset + 0.84 * scale],
    [offset + 0.5 * scale, offset + 0.44 * scale],
    [offset + 0.68 * scale, offset + 0.84 * scale],
    [offset + 0.92 * scale, offset + 0.16 * scale],
  ].map(([x, y]) => [x * size, y * size]);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let backgroundCoverage = 0;
      let foregroundCoverage = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const px = x + (sx + 0.5) / SAMPLES;
          const py = y + (sy + 0.5) / SAMPLES;
          if (!insideRoundedSquare(px, py, size, radius)) continue;
          backgroundCoverage += 1;

          let nearStroke = false;
          for (let index = 0; index < points.length - 1; index += 1) {
            const [ax, ay] = points[index];
            const [bx, by] = points[index + 1];
            if (distanceToSegment(px, py, ax, ay, bx, by) <= stroke / 2) {
              nearStroke = true;
              break;
            }
          }
          if (nearStroke) foregroundCoverage += 1;
        }
      }

      const total = SAMPLES * SAMPLES;
      const backgroundAlpha = backgroundCoverage / total;
      const foregroundAlpha = foregroundCoverage / total;
      const index = (y * size + x) * 4;

      const alpha = backgroundAlpha;
      if (alpha === 0) continue;

      const fgShare = foregroundAlpha / backgroundAlpha;
      for (let channel = 0; channel < 3; channel += 1) {
        rgba[index + channel] = Math.round(
          BACKGROUND[channel] * (1 - fgShare) + FOREGROUND[channel] * fgShare
        );
      }
      rgba[index + 3] = Math.round(alpha * 255);
    }
  }

  return encodePng(size, size, rgba);
};

mkdirSync(OUT_DIR, { recursive: true });

const icons = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: true },
];

for (const icon of icons) {
  writeFileSync(join(OUT_DIR, icon.name), renderIcon(icon));
  console.log(`icons: wrote ${icon.name} (${icon.size}x${icon.size})`);
}
