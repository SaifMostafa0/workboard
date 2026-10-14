// Fails the build when the production bundle grows past its budget.
//
// Budgets are on gzip size, which is what users actually download. Tune the
// numbers deliberately (and in a dedicated PR) when a feature legitimately
// needs more room.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const ASSETS_DIR = join(process.cwd(), 'dist', 'assets');

/** Maximum total gzip size, in kilobytes, per asset type. */
const BUDGETS_KB = {
  '.js': 200,
  '.css': 20,
};

const formatKb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

const files = readdirSync(ASSETS_DIR);
const totals = new Map();

for (const file of files) {
  const ext = file.slice(file.lastIndexOf('.'));
  if (!(ext in BUDGETS_KB)) continue;

  const gzipped = gzipSync(readFileSync(join(ASSETS_DIR, file))).length;
  totals.set(ext, (totals.get(ext) ?? 0) + gzipped);
}

let failed = false;

console.log('Bundle size budget (gzip):');
for (const [ext, budgetKb] of Object.entries(BUDGETS_KB)) {
  const actual = totals.get(ext) ?? 0;
  const budget = budgetKb * 1024;
  const status = actual <= budget ? 'ok' : 'OVER';
  if (actual > budget) failed = true;
  console.log(
    `  ${ext.padEnd(5)} ${formatKb(actual).padStart(10)} / ${formatKb(budget).padStart(10)}  ${status}`
  );
}

if (failed) {
  console.error(
    '\nBundle exceeded its budget. Reduce the bundle or update scripts/check-bundle-size.mjs.'
  );
  process.exit(1);
}

console.log('\nAll bundles are within budget.');
