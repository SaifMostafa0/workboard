#!/usr/bin/env node
/**
 * Post-build step: inject the precache manifest into `dist/sw.js`.
 *
 * `public/sw.js` ships with placeholders so the file is valid in dev (where the
 * service worker is never registered). After `vite build` we know the hashed
 * asset names, so we can precache the exact app shell.
 *
 * Kept dependency-free on purpose — this runs in CI and does not need a PWA
 * plugin on top of the existing Vite setup.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const SW_PATH = join(DIST, 'sw.js');

const PRECACHE_EXTENSIONS = new Set([
  '.html',
  '.js',
  '.css',
  '.svg',
  '.png',
  '.ico',
  '.webmanifest',
  '.woff2',
]);

const walk = (directory) => {
  const entries = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      entries.push(...walk(fullPath));
    } else {
      entries.push(fullPath);
    }
  }
  return entries;
};

if (!existsSync(SW_PATH)) {
  console.error('build-sw: dist/sw.js not found — run `vite build` first.');
  process.exit(1);
}

const assets = walk(DIST)
  .map((file) => relative(DIST, file).split(sep).join('/'))
  .filter((file) => file !== 'sw.js')
  .filter((file) => !file.startsWith('stats.'))
  .filter((file) => PRECACHE_EXTENSIONS.has(file.slice(file.lastIndexOf('.'))))
  .sort();

const precache = [
  '/',
  '/index.html',
  ...assets.filter((file) => file !== 'index.html').map((file) => `/${file}`),
];
const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12);

const source = readFileSync(SW_PATH, 'utf8')
  .replace('self.__WORKBOARD_VERSION__', JSON.stringify(version))
  .replace('self.__WORKBOARD_PRECACHE__', JSON.stringify(precache, null, 2));

writeFileSync(SW_PATH, source);
console.log(`build-sw: precached ${precache.length} URLs (version ${version})`);
