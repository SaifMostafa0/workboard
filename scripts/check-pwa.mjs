#!/usr/bin/env node
/**
 * Production-build smoke test for the PWA pieces that jsdom cannot exercise:
 * the manifest, icon files, service-worker precache, and offline reload/deep
 * links. Run after `npm run build`; it starts its own `vite preview` server and
 * stops it to simulate being offline.
 *
 * Not part of `npm run ci` because it launches a real browser and is slower than
 * the unit/E2E gates. See docs/pwa.md.
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 4176;
const BASE = `http://localhost:${PORT}`;
const VITE_BIN = join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');

if (!existsSync(join(process.cwd(), 'dist', 'sw.js'))) {
  console.error('pwa-check: dist/sw.js not found — run `npm run build` first.');
  process.exit(1);
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const server = spawn(
  process.execPath,
  [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] }
);

const waitForServer = () =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('preview server did not start')), 20000);
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes(String(PORT))) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on('data', (chunk) => process.stderr.write(chunk));
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Kill the preview server and wait until it stops accepting connections. */
const stopServer = async () => {
  server.kill('SIGTERM');
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const alive = await fetch(BASE)
      .then(() => true)
      .catch(() => false);
    if (!alive) {
      await sleep(300);
      return;
    }
    await sleep(200);
  }
  throw new Error('preview server did not stop');
};

let browser;
let exitCode = 0;

try {
  await waitForServer();
  browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const worker = await page.evaluate(async () => {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
    ]);
    return {
      state: registration.active?.state ?? null,
      scope: registration.scope,
      controlled: Boolean(navigator.serviceWorker.controller),
    };
  });
  check(
    'service worker activates and controls the page',
    worker.state === 'activated' && worker.controlled,
    worker.scope
  );

  const manifest = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest');
    return response.json();
  });
  check('manifest is served', manifest.name === 'Workboard', manifest.display);
  check(
    'manifest declares 192/512 install icons',
    manifest.icons.some((icon) => icon.sizes === '192x192') &&
      manifest.icons.some((icon) => icon.sizes === '512x512')
  );

  for (const icon of manifest.icons) {
    const response = await page.request.get(`${BASE}${icon.src}`);
    check(`icon ${icon.src}`, response.ok(), String(response.status()));
  }

  const caches = await page.evaluate(() => window.caches.keys());
  const precacheName = caches.find((name) => name.startsWith('workboard-precache-'));
  check('versioned precache exists', Boolean(precacheName), caches.join(', '));

  const precached = await page.evaluate(async (name) => {
    const cache = await caches.open(name);
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  }, precacheName);
  check(
    'app shell is precached',
    precached.includes('/') && precached.includes('/index.html'),
    precached.slice(0, 5).join(', ')
  );

  // Stop the server: from here on every successful request comes from the SW.
  await stopServer();

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Workboard', { timeout: 8000 });
  check('loads offline after a fresh navigation', (await page.title()) === 'Workboard', page.url());

  const deepLink = await context.newPage();
  const deepResponse = await deepLink.goto(`${BASE}/tasks?status=todo`, {
    waitUntil: 'domcontentloaded',
  });
  await deepLink.waitForSelector('text=Workboard', { timeout: 8000 });
  check(
    'offline deep link renders the app shell',
    deepResponse?.fromServiceWorker() === true,
    deepLink.url()
  );
} catch (error) {
  check('unexpected error', false, error instanceof Error ? error.message : String(error));
} finally {
  await browser?.close().catch(() => undefined);
  server.kill('SIGTERM');
  exitCode = results.every((result) => result.ok) ? 0 : 1;
  console.log(`\n${results.filter((result) => result.ok).length}/${results.length} checks passed`);
  process.exit(exitCode);
}
