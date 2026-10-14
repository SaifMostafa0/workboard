// Generates Workboard artifacts from the canonical ticket files.
//
//   tickets/WB-*.md  ──►  project-management/workboard-import.json   (import into the app)
//                    ──►  BACKLOG.md                                  (human/agent index)
//
// The ticket markdown files are the single source of truth. This script is
// deterministic: the same tickets always produce byte-identical output, so CI
// can fail when someone edits a ticket without regenerating.
//
// Usage:
//   node scripts/tickets-build.mjs           # write artifacts
//   node scripts/tickets-build.mjs --check   # fail if artifacts are stale
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TICKETS_DIR = join(ROOT, 'tickets');
const CONFIG_PATH = join(ROOT, 'project-management', 'workboard.config.json');
const IMPORT_PATH = join(ROOT, 'project-management', 'workboard-import.json');
const BACKLOG_PATH = join(ROOT, 'BACKLOG.md');
const SCHEMA_VERSION = 1;
const CHECK = process.argv.includes('--check');

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };
const MAX_DESCRIPTION = 2000;
const MAX_TAG_LENGTH = 30;
const MAX_TAGS = 10;

const fail = (message) => {
  console.error(`\n✖ tickets-build: ${message}\n`);
  process.exit(1);
};

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));

/** Parses the flat `key: value` YAML frontmatter and the markdown body. */
function parseTicket(path, file) {
  const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) fail(`${file}: missing YAML frontmatter delimited by ---`);

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = line.indexOf(':');
    if (separator === -1) fail(`${file}: malformed frontmatter line "${line}"`);
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return { file, meta, body: match[2].trim() };
}

/** Extracts a `## Heading` section from a markdown body. */
function section(body, heading) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##\s/.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

/** Deterministic, RFC-4122-shaped UUID derived from a ticket id. */
function uuidFrom(seed) {
  const hex = createHash('sha1').update(seed).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20, 32)}`;
}

const toIso = (date) => `${date}T00:00:00.000Z`;

function build() {
  const config = readJson(CONFIG_PATH);
  const projectsBySlug = new Map(config.projects.map((project) => [project.slug, project]));

  const files = readdirSync(TICKETS_DIR)
    .filter((name) => /^WB-\d+.*\.md$/.test(name))
    .sort();

  if (files.length === 0) fail(`no tickets found in ${TICKETS_DIR}`);

  const seenIds = new Set();
  const tickets = files.map((file) => {
    const { meta, body } = parseTicket(join(TICKETS_DIR, file), file);

    const required = ['id', 'title', 'status', 'priority', 'project', 'created', 'updated'];
    for (const key of required) {
      if (!meta[key]) fail(`${file}: missing required frontmatter field "${key}"`);
    }
    if (!/^WB-\d+$/.test(meta.id)) fail(`${file}: id "${meta.id}" must look like WB-###`);
    if (meta.id !== file.match(/^(WB-\d+)/)[1]) {
      fail(`${file}: id "${meta.id}" must match the filename prefix`);
    }
    if (seenIds.has(meta.id)) fail(`${file}: duplicate ticket id ${meta.id}`);
    seenIds.add(meta.id);

    if (!projectsBySlug.has(meta.project)) {
      fail(
        `${file}: unknown project "${meta.project}" (see project-management/workboard.config.json)`
      );
    }
    if (!STATUSES.includes(meta.status)) {
      fail(`${file}: status "${meta.status}" must be one of ${STATUSES.join(', ')}`);
    }
    if (!PRIORITIES.includes(meta.priority)) {
      fail(`${file}: priority "${meta.priority}" must be one of ${PRIORITIES.join(', ')}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.created)) fail(`${file}: created must be YYYY-MM-DD`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.updated)) fail(`${file}: updated must be YYYY-MM-DD`);

    const summary = section(body, 'Summary');
    const criteria = section(body, 'Acceptance criteria');
    if (!summary) fail(`${file}: missing "## Summary" section`);
    if (!criteria) fail(`${file}: missing "## Acceptance criteria" section`);

    const tags = (meta.tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tags.length > MAX_TAGS) fail(`${file}: at most ${MAX_TAGS} tags allowed`);
    for (const tag of tags) {
      if (!/^[a-z0-9:_-]+$/.test(tag))
        fail(`${file}: tag "${tag}" must be lowercase kebab/colon form`);
      if (tag.length > MAX_TAG_LENGTH)
        fail(`${file}: tag "${tag}" exceeds ${MAX_TAG_LENGTH} chars`);
    }

    const notes = section(body, 'Notes');
    const descriptionParts = [summary, `**Acceptance criteria**\n${criteria}`];
    if (notes) descriptionParts.push(notes);
    descriptionParts.push(`Ticket file: tickets/${file}`);
    if (meta.source) descriptionParts.push(`Source: ${meta.source}`);

    let description = descriptionParts.join('\n\n');
    if (description.length > MAX_DESCRIPTION) {
      description = `${description.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…`;
    }

    return { meta, tags, summary, criteria, description, file };
  });

  const project = (slug) => projectsBySlug.get(slug);

  const exportProjects = config.projects.map((entry) => ({
    id: entry.id,
    name: entry.name,
    description: entry.description,
    color: entry.color,
    createdAt: toIso('2026-10-14'),
    updatedAt: toIso('2026-10-14'),
  }));

  const exportTasks = tickets
    .slice()
    .sort((a, b) => a.meta.id.localeCompare(b.meta.id))
    .map((ticket) => {
      const { meta } = ticket;
      const task = {
        id: uuidFrom(meta.id),
        projectId: project(meta.project).id,
        title: `${meta.id} ${meta.title}`,
        description: ticket.description,
        status: meta.status,
        priority: meta.priority,
        tags: [...new Set(['workboard', meta.id.toLowerCase(), ...ticket.tags])].slice(0, MAX_TAGS),
        createdAt: toIso(meta.created),
        updatedAt: toIso(meta.updated),
      };
      if (meta.assignee) task.assignee = meta.assignee;
      if (meta.status === 'done') task.completedAt = toIso(meta.updated);
      return task;
    });

  const latest = tickets
    .map((ticket) => ticket.meta.updated)
    .sort()
    .at(-1);

  const importData = {
    version: SCHEMA_VERSION,
    exportedAt: toIso(latest ?? '2026-10-14'),
    projects: exportProjects,
    tasks: exportTasks,
  };

  return { config, tickets, importData };
}

function renderBacklog({ config, tickets }) {
  const open = tickets.filter((ticket) => ticket.meta.status !== 'done');
  const done = tickets.filter((ticket) => ticket.meta.status === 'done');
  const latest = tickets
    .map((ticket) => ticket.meta.updated)
    .sort()
    .at(-1);

  const lines = [];
  lines.push('# Workboard — Backlog');
  lines.push('');
  lines.push(
    '> **Generated file — do not edit.** Run `npm run tickets:build` after changing `tickets/WB-*.md`.'
  );
  lines.push(
    '> The ticket markdown files are the source of truth; see [docs/project-management.md](docs/project-management.md).'
  );
  lines.push('');
  lines.push(
    `**${open.length} open / ${done.length} done / ${tickets.length} total** · last update ${latest}`
  );
  lines.push('');
  lines.push('## Progress by project');
  lines.push('');
  lines.push('| Project | Open | Done | Total |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const entry of config.projects) {
    const scoped = tickets.filter((ticket) => ticket.meta.project === entry.slug);
    const projectOpen = scoped.filter((ticket) => ticket.meta.status !== 'done').length;
    lines.push(
      `| ${entry.name} | ${projectOpen} | ${scoped.length - projectOpen} | ${scoped.length} |`
    );
  }
  lines.push('');
  for (const entry of config.projects) {
    const scoped = tickets
      .filter((ticket) => ticket.meta.project === entry.slug)
      .sort(
        (a, b) =>
          PRIORITY_RANK[a.meta.priority] - PRIORITY_RANK[b.meta.priority] ||
          a.meta.id.localeCompare(b.meta.id)
      );
    if (scoped.length === 0) continue;

    lines.push(`## ${entry.name}`);
    lines.push('');
    lines.push(`${entry.description}`);
    lines.push('');
    lines.push('| ID | Title | Status | Priority | Assignee | Tags | Updated |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const ticket of scoped) {
      const { meta } = ticket;
      lines.push(
        `| ${meta.id} | ${meta.title} | ${STATUS_LABEL[meta.status]} | ${meta.priority} | ${
          meta.assignee ?? '—'
        } | ${ticket.tags.join(', ') || '—'} | ${meta.updated} |`
      );
    }
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push(
    'Manage day-to-day in the Workboard app: import [`project-management/workboard-import.json`](project-management/workboard-import.json) (Settings → Import), then sync changes back with `npm run tickets:sync <export.json>`.'
  );
  lines.push('');
  return lines.join('\n');
}

const built = build();
const backlog = renderBacklog(built);

const outputs = [
  { path: IMPORT_PATH, content: `${JSON.stringify(built.importData, null, 2)}\n` },
  { path: BACKLOG_PATH, content: backlog.endsWith('\n') ? backlog : `${backlog}\n` },
];

if (CHECK) {
  const normalize = (value) => value.replace(/\r\n/g, '\n');
  const stale = outputs.filter(({ path, content }) => {
    let existing = '';
    try {
      existing = readFileSync(path, 'utf8');
    } catch {
      return true;
    }
    return normalize(existing) !== normalize(content);
  });
  if (stale.length > 0) {
    fail(
      `${stale.map((output) => output.path.replace(`${ROOT}\\`, '')).join(', ')} are out of date. Run: npm run tickets:build`
    );
  }
  console.log(`tickets-build: ${built.tickets.length} tickets in sync.`);
} else {
  for (const { path, content } of outputs) writeFileSync(path, content, 'utf8');
  console.log(
    `tickets-build: wrote ${built.tickets.length} tickets → ${outputs
      .map((output) => output.path.replace(`${ROOT}\\`, '').replace(/\\/g, '/'))
      .join(', ')}`
  );
}
