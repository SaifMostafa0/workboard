import { format, isValid, parseISO } from 'date-fns';
import type { Project } from './project';
import type { Task } from './task';
import { TASK_STATUS_LABELS } from './task';

/**
 * Human-friendly exports. Everything here is pure so the generated text can be
 * tested without touching the DOM; the Settings page only handles download
 * plumbing and announcements.
 */

/** RFC 4180 line ending. */
export const CSV_LINE_ENDING = '\r\n';

/**
 * Stable task columns. Changing these is a breaking change for anyone who has
 * built a spreadsheet or script on top of the export.
 */
export const TASK_CSV_HEADERS = [
  'id',
  'projectId',
  'project',
  'title',
  'description',
  'status',
  'priority',
  'dueDate',
  'assignee',
  'tags',
  'parentId',
  'epicId',
  'blockedBy',
  'createdAt',
  'updatedAt',
  'completedAt',
] as const;

/** Stable project columns, matching {@link TASK_CSV_HEADERS} conventions. */
export const PROJECT_CSV_HEADERS = [
  'id',
  'name',
  'description',
  'color',
  'createdAt',
  'updatedAt',
] as const;

/**
 * Escape one value per RFC 4180: fields containing a comma, quote, or line
 * break are quoted, and embedded quotes are doubled.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Serialize headers and rows into an RFC 4180 CSV document (with trailing CRLF). */
export function toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(','));
  return lines.join(CSV_LINE_ENDING) + CSV_LINE_ENDING;
}

/** Multi-valued cells use a semicolon so they never collide with CSV commas. */
const joinList = (values: readonly string[] | undefined): string => (values ?? []).join('; ');

/** Tasks with their project names resolved, in the order supplied. */
export function tasksToCsv(tasks: readonly Task[], projects: readonly Project[]): string {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  return toCsv(
    TASK_CSV_HEADERS,
    tasks.map((task) => [
      task.id,
      task.projectId,
      projectNames.get(task.projectId) ?? '',
      task.title,
      task.description,
      task.status,
      task.priority,
      task.dueDate,
      task.assignee,
      joinList(task.tags),
      task.parentId,
      task.epicId,
      joinList(task.blockedBy),
      task.createdAt,
      task.updatedAt,
      task.completedAt,
    ])
  );
}

/** Projects in the order supplied. */
export function projectsToCsv(projects: readonly Project[]): string {
  return toCsv(
    PROJECT_CSV_HEADERS,
    projects.map((project) => [
      project.id,
      project.name,
      project.description,
      project.color,
      project.createdAt,
      project.updatedAt,
    ])
  );
}

/** Escape a cell for a Markdown table (pipes break the row; newlines break the table). */
const escapeMarkdownCell = (value: string): string =>
  value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();

/** Calendar date (`YYYY-MM-DD`) via date-fns, matching the generated backlog. */
const toCalendarDate = (value: string): string => {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'yyyy-MM-dd') : '';
};

const TASK_KEY_PATTERN = /^([A-Za-z]+-\d+)\b/;

/** Use a ticket-style prefix when the task has one, otherwise a short id. */
const taskKey = (task: Pick<Task, 'id' | 'title'>): string => {
  const match = TASK_KEY_PATTERN.exec(task.title);
  return match?.[1] ?? task.id.slice(0, 8);
};

/** Drop a leading ticket key so the ID and title columns don't repeat it. */
const taskTitle = (task: Pick<Task, 'title'>): string => {
  const match = TASK_KEY_PATTERN.exec(task.title);
  if (!match) return task.title;
  return task.title.slice(match[0].length).replace(/^[\s:–—-]+/, '') || task.title;
};

const markdownRow = (task: Task): string =>
  `| ${[
    taskKey(task),
    taskTitle(task),
    TASK_STATUS_LABELS[task.status],
    task.priority,
    task.assignee ?? 'unassigned',
    task.tags.join(', '),
    toCalendarDate(task.updatedAt),
  ]
    .map(escapeMarkdownCell)
    .join(' | ')} |`;

export interface BacklogMarkdownOptions {
  /** Injected in tests; defaults to now. */
  generatedAt?: string | Date;
}

/**
 * Markdown backlog in the same shape as the generated `BACKLOG.md`: a title,
 * a status summary, and one table per project. Active tasks only; callers pass
 * the same collection the rest of the app treats as the current backlog.
 */
export function backlogToMarkdown(
  tasks: readonly Task[],
  projects: readonly Project[],
  options: BacklogMarkdownOptions = {}
): string {
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const generatedDate = isValid(generatedAt) ? format(generatedAt, 'yyyy-MM-dd') : '';

  const done = tasks.filter((task) => task.status === 'done').length;
  const total = tasks.length;
  const open = total - done;

  const lines: string[] = [
    '# Workboard — Backlog',
    '',
    `> Exported from Workboard on ${generatedDate}.`,
    '',
    `**${open} open / ${done} done / ${total} total**`,
    '',
  ];

  const projectIds = new Set(projects.map((project) => project.id));
  const groups: Array<{ name: string; description?: string; tasks: Task[] }> = projects.map(
    (project) => ({
      name: project.name,
      ...(project.description ? { description: project.description } : {}),
      tasks: tasks.filter((task) => task.projectId === project.id),
    })
  );

  const unassigned = tasks.filter((task) => !projectIds.has(task.projectId));
  if (unassigned.length > 0) {
    groups.push({ name: 'No project', tasks: unassigned });
  }

  for (const group of groups) {
    lines.push(`## ${group.name}`, '');
    if (group.description) lines.push(group.description, '');
    lines.push(
      '| ID | Title | Status | Priority | Assignee | Tags | Updated |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      ...group.tasks.map(markdownRow),
      ''
    );
  }

  return lines.join('\n').trimEnd() + '\n';
}
