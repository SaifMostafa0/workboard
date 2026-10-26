import { describe, expect, it } from 'vitest';
import {
  backlogToMarkdown,
  CSV_LINE_ENDING,
  escapeCsvField,
  PROJECT_CSV_HEADERS,
  projectsToCsv,
  TASK_CSV_HEADERS,
  tasksToCsv,
  toCsv,
} from '../export';
import type { Project } from '../project';
import type { Task } from '../task';

/**
 * Minimal RFC 4180 reader used to prove the writer round-trips. It deliberately
 * lives in the test: the app only writes CSV, so shipping a parser would be
 * dead code.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r' && text[index + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      index++;
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'project-1',
  name: 'Alpha',
  description: 'First project',
  color: 'blue',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T11:30:00.000Z',
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  projectId: 'project-1',
  title: 'WB-104 Add CSV and Markdown export',
  description: 'A description, with a comma, "quotes" and a\nnewline.',
  status: 'in_progress',
  priority: 'medium',
  dueDate: '2026-10-20',
  assignee: 'agent:opencode',
  tags: ['tier:1', 'area:ux'],
  blockedBy: ['task-2', 'task-3'],
  parentId: 'task-parent',
  epicId: 'epic-1',
  createdAt: '2026-10-10T09:00:00.000Z',
  updatedAt: '2026-10-16T14:45:00.000Z',
  completedAt: '2026-10-17T08:00:00.000Z',
  ...overrides,
});

describe('escapeCsvField', () => {
  it('leaves plain values untouched', () => {
    expect(escapeCsvField('plain')).toBe('plain');
    expect(escapeCsvField(42)).toBe('42');
  });

  it('returns an empty string for nullish values', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('quotes values containing commas, quotes or line breaks', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line 1\nline 2')).toBe('"line 1\nline 2"');
    expect(escapeCsvField('line 1\r\nline 2')).toBe('"line 1\r\nline 2"');
  });
});

describe('toCsv', () => {
  it('joins headers and rows with RFC 4180 CRLF and a trailing newline', () => {
    const csv = toCsv(
      ['a', 'b'],
      [
        ['1', 'two, three'],
        ['4', 'say "five"'],
      ]
    );

    expect(csv).toBe(
      `a,b${CSV_LINE_ENDING}1,"two, three"${CSV_LINE_ENDING}4,"say ""five"""${CSV_LINE_ENDING}`
    );
    expect(csv.endsWith(CSV_LINE_ENDING)).toBe(true);
  });
});

describe('tasksToCsv', () => {
  it('uses the documented, stable column order', () => {
    expect(TASK_CSV_HEADERS).toEqual([
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
    ]);
  });

  it('resolves project names and joins multi-valued cells with semicolons', () => {
    const csv = tasksToCsv([makeTask()], [makeProject()]);
    const [headers, firstRow] = parseCsv(csv);

    expect(headers).toEqual([...TASK_CSV_HEADERS]);
    expect(firstRow).toBeDefined();

    const record = Object.fromEntries(headers!.map((header, index) => [header, firstRow![index]]));

    expect(record.project).toBe('Alpha');
    expect(record.tags).toBe('tier:1; area:ux');
    expect(record.blockedBy).toBe('task-2; task-3');
  });

  it('round-trips every value through an RFC 4180 parse', () => {
    const task = makeTask();
    const csv = tasksToCsv([task], [makeProject()]);
    const [headers, ...rows] = parseCsv(csv);

    expect(rows).toHaveLength(1);
    const record = Object.fromEntries(headers!.map((header, index) => [header, rows[0]![index]]));

    expect(record).toEqual({
      id: task.id,
      projectId: task.projectId,
      project: 'Alpha',
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assignee: task.assignee,
      tags: task.tags.join('; '),
      parentId: task.parentId,
      epicId: task.epicId,
      blockedBy: task.blockedBy!.join('; '),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt,
    });
  });

  it('leaves blanks for missing optional values and unknown projects', () => {
    const task = makeTask({
      projectId: 'missing-project',
      dueDate: undefined,
      assignee: undefined,
      parentId: undefined,
      epicId: undefined,
      blockedBy: undefined,
      completedAt: undefined,
    });

    const [headers, row] = parseCsv(tasksToCsv([task], [makeProject()]));
    const record = Object.fromEntries(headers!.map((header, index) => [header, row![index]]));

    expect(record.project).toBe('');
    expect(record.dueDate).toBe('');
    expect(record.assignee).toBe('');
    expect(record.parentId).toBe('');
    expect(record.epicId).toBe('');
    expect(record.blockedBy).toBe('');
    expect(record.completedAt).toBe('');
  });

  it('writes only the header row when there are no tasks', () => {
    const rows = parseCsv(tasksToCsv([], []));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual([...TASK_CSV_HEADERS]);
  });
});

describe('projectsToCsv', () => {
  it('uses stable headers and exports all project fields', () => {
    const project = makeProject({ name: 'Alpha, "the first"', color: 'emerald' });
    const [headers, row] = parseCsv(projectsToCsv([project]));
    const record = Object.fromEntries(headers!.map((header, index) => [header, row![index]]));

    expect(PROJECT_CSV_HEADERS).toEqual([
      'id',
      'name',
      'description',
      'color',
      'createdAt',
      'updatedAt',
    ]);
    expect(record).toEqual({
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  });
});

describe('backlogToMarkdown', () => {
  const generatedAt = new Date('2026-10-26T12:00:00.000Z');

  it('renders the BACKLOG.md shape with grouped project tables', () => {
    const markdown = backlogToMarkdown(
      [makeTask(), makeTask({ id: 'task-2', title: 'WB-105 Another task', status: 'done' })],
      [makeProject()],
      { generatedAt }
    );

    expect(markdown).toBe(
      [
        '# Workboard — Backlog',
        '',
        '> Exported from Workboard on 2026-10-26.',
        '',
        '**1 open / 1 done / 2 total**',
        '',
        '## Alpha',
        '',
        'First project',
        '',
        '| ID | Title | Status | Priority | Assignee | Tags | Updated |',
        '| --- | --- | --- | --- | --- | --- | --- |',
        '| WB-104 | Add CSV and Markdown export | In Progress | medium | agent:opencode | tier:1, area:ux | 2026-10-16 |',
        '| WB-105 | Another task | Done | medium | agent:opencode | tier:1, area:ux | 2026-10-16 |',
        '',
      ].join('\n')
    );
  });

  it('escapes pipes and newlines so table rows stay intact', () => {
    const markdown = backlogToMarkdown(
      [makeTask({ title: 'Fix A | B\ntable', description: 'ignored' })],
      [makeProject()],
      { generatedAt }
    );

    expect(markdown).toContain('| Fix A \\| B table |');
  });

  it('falls back to a short id for tasks without a ticket key', () => {
    const markdown = backlogToMarkdown(
      [makeTask({ id: '1234567890abcdef', title: 'Plain title' })],
      [makeProject()],
      { generatedAt }
    );

    expect(markdown).toContain('| 12345678 | Plain title |');
  });

  it('puts tasks whose project is missing under "No project"', () => {
    const markdown = backlogToMarkdown(
      [makeTask({ projectId: 'deleted-project' })],
      [makeProject()],
      { generatedAt }
    );

    expect(markdown).toContain('## No project');
    expect(markdown).toContain('| WB-104 | Add CSV and Markdown export |');
  });

  it('handles invalid dates without throwing', () => {
    const markdown = backlogToMarkdown([makeTask({ updatedAt: 'not-a-date' })], [makeProject()], {
      generatedAt: new Date('also-not-a-date'),
    });

    expect(markdown).toContain('> Exported from Workboard on .');
    expect(markdown).toContain(
      '| WB-104 | Add CSV and Markdown export | In Progress | medium | agent:opencode | tier:1, area:ux |  |'
    );
  });
});
