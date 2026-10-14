// Round-trips a Workboard export back into the canonical ticket files.
//
//   Workboard export .json  ──►  tickets/WB-*.md   (frontmatter status/priority/assignee/updated)
//
// Day-to-day, work happens in the Workboard app. Export your data
// (Settings → Export) and point this script at the file to fold progress back
// into the source-of-truth tickets. Tasks are matched to tickets by their
// `WB-###` title prefix.
//
// Usage:
//   node scripts/tickets-sync.mjs workboard-export-2026-10-14.json
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TICKETS_DIR = join(ROOT, 'tickets');
const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const fail = (message) => {
  console.error(`\n✖ tickets-sync: ${message}\n`);
  process.exit(1);
};

const inputPath = process.argv[2];
if (!inputPath) {
  fail('usage: node scripts/tickets-sync.mjs <workboard-export.json>');
}

let exported;
try {
  exported = JSON.parse(readFileSync(inputPath, 'utf8'));
} catch (error) {
  fail(`could not read/parse ${inputPath}: ${error.message}`);
}

if (!Array.isArray(exported.tasks))
  fail('input does not look like a Workboard export (missing tasks[])');

const tasksByTicket = new Map();
for (const task of exported.tasks) {
  const match = typeof task.title === 'string' ? task.title.match(/^(WB-\d+)\b/) : null;
  if (!match) continue;
  if (task.deletedAt) continue;
  tasksByTicket.set(match[1], task);
}

const pad = (value, width) => String(value).padEnd(width);
let updatedCount = 0;
const skipped = [];

for (const file of readdirSync(TICKETS_DIR).filter((name) => /^WB-\d+.*\.md$/.test(name))) {
  const path = join(TICKETS_DIR, file);
  const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    skipped.push(`${file} (no frontmatter)`);
    continue;
  }

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  const task = tasksByTicket.get(meta.id);
  if (!task) {
    skipped.push(`${meta.id} (not in export)`);
    continue;
  }

  const nextStatus = VALID_STATUSES.includes(task.status) ? task.status : meta.status;
  const nextPriority = VALID_PRIORITIES.includes(task.priority) ? task.priority : meta.priority;
  const nextAssignee = task.assignee || 'unassigned';
  const nextUpdated = (task.updatedAt ?? new Date().toISOString()).slice(0, 10);
  const statusChanged = nextStatus !== meta.status;

  // Nothing to fold back — leave the file byte-for-byte untouched.
  if (
    !statusChanged &&
    nextPriority === meta.priority &&
    nextAssignee === meta.assignee &&
    nextUpdated === meta.updated
  ) {
    skipped.push(`${meta.id} (already in sync)`);
    continue;
  }

  let frontmatter = match[1];
  const setField = (key, value) => {
    const line = new RegExp(`^${key}:.*$`, 'm');
    frontmatter = line.test(frontmatter)
      ? frontmatter.replace(line, `${key}: ${value}`)
      : `${frontmatter}\n${key}: ${value}`;
  };
  setField('status', nextStatus);
  setField('priority', nextPriority);
  setField('assignee', nextAssignee);
  setField('updated', nextUpdated);

  // `match[2]` still carries the exact separator/leading whitespace of the body,
  // so an untouched ticket round-trips byte-for-byte.
  let body = match[2].replace(/\s*$/, '');

  if (statusChanged) {
    const entry = `- ${nextUpdated} — Synced from Workboard: status → ${nextStatus}`;
    body = /^## Updates\s*$/m.test(body)
      ? `${body}\n${entry}\n`
      : `${body}\n\n## Updates\n\n${entry}\n`;
  } else {
    body = `${body}\n`;
  }

  writeFileSync(path, `---\n${frontmatter}\n---\n${body}`, 'utf8');
  updatedCount += 1;
  console.log(`  ${pad(meta.id, 8)} ${pad(meta.status, 11)} → ${pad(nextStatus, 11)} ${file}`);
}

console.log(`\ntickets-sync: updated ${updatedCount} ticket(s) from ${inputPath}.`);
if (skipped.length > 0) {
  console.log(`  untouched: ${skipped.join(', ')}`);
}
console.log('  Next: run `npm run tickets:build` to refresh generated artifacts.');
