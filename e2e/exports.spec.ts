import { expect, test, type Download, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

interface TaskIdentity {
  id: string;
  title: string;
  key: string;
}

async function downloadText(download: Download): Promise<string> {
  const path = await download.path();
  if (!path) throw new Error('Download was not written to disk');
  return readFile(path, 'utf8');
}

async function firstTask(page: Page): Promise<TaskIdentity> {
  await page.goto('/tasks');
  await page.waitForLoadState('networkidle');

  const card = page.locator('article[data-task-id]').first();
  await expect(card).toBeVisible();

  const id = await card.getAttribute('data-task-id');
  if (!id) throw new Error('Task card is missing data-task-id');
  const title = (await card.locator('h3').innerText()).trim();
  const key = /^([A-Za-z]+-\d+)\b/.exec(title)?.[1] ?? id.slice(0, 8);

  return { id, title, key };
}

async function firstProjectName(page: Page): Promise<string> {
  await page.goto('/tasks');
  await page.waitForLoadState('networkidle');

  const names = (
    await page.locator('select[aria-label="Filter by project"] option').allInnerTexts()
  )
    .map((name) => name.trim())
    .filter((name) => name !== '' && name !== 'All Projects');

  if (names.length === 0) throw new Error('No seeded projects found');
  return names[0];
}

test.describe('Human-friendly exports', () => {
  test('exports tasks as RFC 4180 CSV and announces completion', async ({ page }) => {
    const task = await firstTask(page);

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Tasks CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^workboard-tasks-\d{4}-\d{2}-\d{2}\.csv$/);

    const text = await downloadText(download);
    const [header, ...rows] = text.split('\r\n');

    expect(header).toBe(
      'id,projectId,project,title,description,status,priority,dueDate,assignee,tags,parentId,epicId,blockedBy,createdAt,updatedAt,completedAt'
    );
    expect(rows.length).toBeGreaterThan(1);
    expect(text).toContain(task.id);

    await expect(page.getByRole('status').filter({ hasText: 'Tasks CSV exported' })).toBeVisible();
  });

  test('exports projects as CSV', async ({ page }) => {
    const projectName = await firstProjectName(page);

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Projects CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^workboard-projects-\d{4}-\d{2}-\d{2}\.csv$/);

    const text = await downloadText(download);
    expect(text.split('\r\n')[0]).toBe('id,name,description,color,createdAt,updatedAt');
    expect(text).toContain(projectName);

    await expect(
      page.getByRole('status').filter({ hasText: 'Projects CSV exported' })
    ).toBeVisible();
  });

  test('exports the backlog as a BACKLOG.md-shaped table', async ({ page }) => {
    const task = await firstTask(page);

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Backlog Markdown' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^workboard-backlog-\d{4}-\d{2}-\d{2}\.md$/);

    const text = await downloadText(download);
    expect(text.startsWith('# Workboard — Backlog')).toBe(true);
    expect(text).toContain('| ID | Title | Status | Priority | Assignee | Tags | Updated |');
    expect(text).toContain(`| ${task.key} |`);

    await expect(
      page.getByRole('status').filter({ hasText: 'Backlog Markdown exported' })
    ).toBeVisible();
  });

  test('exports can be triggered from the keyboard', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const button = page.getByRole('button', { name: 'Export Tasks CSV' });
    await button.focus();
    await expect(button).toBeFocused();

    const downloadPromise = page.waitForEvent('download');
    await page.keyboard.press('Enter');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^workboard-tasks-.*\.csv$/);
    await expect(page.getByRole('status').filter({ hasText: 'Tasks CSV exported' })).toBeVisible();
  });
});

test.describe('Print layout', () => {
  test('the project board prints without navigation chrome or actions', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.locator('article a').first().click();
    await page.waitForLoadState('networkidle');

    await page.emulateMedia({ media: 'print' });

    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
    await expect(page.getByRole('banner')).toBeHidden();
    await expect(page.getByRole('button', { name: /^Edit / }).first()).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.emulateMedia({ media: 'screen' });
  });

  test('the task list prints without filters or pagination', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    await page.emulateMedia({ media: 'print' });

    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
    await expect(page.getByRole('banner')).toBeHidden();
    await expect(page.getByRole('button', { name: /^Previous/ })).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'Tasks' })).toBeVisible();

    await page.emulateMedia({ media: 'screen' });
  });
});
