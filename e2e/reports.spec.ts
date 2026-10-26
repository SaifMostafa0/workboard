import { expect, test, type Page } from '@playwright/test';

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function createTask(
  page: Page,
  title: string,
  dueDate: string,
  status: 'todo' | 'done' = 'todo'
) {
  await page.getByRole('button', { name: 'New Task' }).click();

  const dialog = page.getByRole('dialog', { name: 'Create Task' });
  await expect(dialog).toBeVisible();

  const projectSelect = dialog.getByLabel('Project');
  await projectSelect.selectOption({ index: 1 });
  const projectId = await projectSelect.inputValue();

  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Due Date (optional)').fill(dueDate);
  if (status === 'done') {
    await dialog.getByLabel('Status').selectOption('done');
  }
  await dialog.getByRole('button', { name: 'Create Task' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Task created').first()).toBeVisible();

  const card = page.locator('article').filter({ hasText: title });
  await expect(card).toBeVisible();

  return { card, projectId };
}

function metric(page: Page, attribute: string): Promise<string | null> {
  return page.locator('[data-report-total-completed]').getAttribute(attribute);
}

test.describe('Reports', () => {
  test('builds data-driven throughput, cycle time, and overdue trends', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/weeks=8/);

    const rangeGroup = page.getByRole('group', { name: 'Report range' });
    const weekRows = page.locator('tbody tr[data-report-week-start]');

    await expect(weekRows).toHaveCount(8);
    await rangeGroup.getByRole('button', { name: '4 weeks' }).click();
    await expect(page).toHaveURL(/weeks=4/);
    await expect(weekRows).toHaveCount(4);
    await expect(page.locator('[data-report-total-completed]')).toHaveAttribute(
      'data-report-weeks',
      '4'
    );

    await rangeGroup.getByRole('button', { name: '12 weeks' }).click();
    await expect(page).toHaveURL(/weeks=12/);
    await expect(weekRows).toHaveCount(12);

    await rangeGroup.getByRole('button', { name: '8 weeks' }).click();
    await expect(weekRows).toHaveCount(8);

    // Chart bars are keyboard reachable and reveal the selected week's values.
    const firstBar = page.locator('[data-report-chart="throughput"]').first();
    await firstBar.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-report-week-detail]')).toContainText('completed');
    await expect(page.locator('[data-report-week-detail]')).toContainText('overdue');

    const baselineCompleted = Number(await metric(page, 'data-report-total-completed'));
    const baselineOverdue = Number(await metric(page, 'data-report-overdue-now'));
    const baselineCurrentWeekCompleted = Number(
      await weekRows.last().getAttribute('data-report-week-completed')
    );

    const today = new Date();

    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    const completedTitle = 'Reporting completed task';
    const completed = await createTask(page, completedTitle, toDateInput(today), 'done');

    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
    await expect
      .poll(async () => Number(await metric(page, 'data-report-total-completed')))
      .toBe(baselineCompleted + 1);
    await expect
      .poll(async () => Number(await metric(page, 'data-report-overdue-now')))
      .toBe(baselineOverdue);
    await expect
      .poll(async () => Number(await weekRows.last().getAttribute('data-report-week-completed')))
      .toBe(baselineCurrentWeekCompleted + 1);

    const projectRow = page.locator(`[data-report-project-id="${completed.projectId}"]`);
    await expect(projectRow).toBeVisible();
    expect(Number(await projectRow.getAttribute('data-report-project-completed'))).toBeGreaterThan(
      0
    );

    // The same values are exposed as a table, not only as colour-coded bars.
    const currentWeekRow = weekRows.last();
    await expect(currentWeekRow.getByRole('rowheader')).toBeVisible();
    await expect(currentWeekRow.getByRole('cell').first()).toHaveText(/^\d+$/);
    await expect(currentWeekRow.getByRole('cell').nth(1)).toHaveText(/^\d+$/);
  });

  test('counts work as overdue when its due date passes', async ({ page }) => {
    await page.clock.install({ time: new Date() });

    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    const baselineOverdue = Number(await metric(page, 'data-report-overdue-now'));

    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await createTask(page, 'Reporting due-today task', toDateInput(new Date()));

    // Move the browser clock past midnight so the open task becomes overdue.
    await page.clock.fastForward(24 * 60 * 60 * 1000);

    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();

    await expect
      .poll(async () => Number(await metric(page, 'data-report-overdue-now')))
      .toBe(baselineOverdue + 1);
    await expect
      .poll(async () =>
        Number(
          await page
            .locator('tbody tr[data-report-week-start]')
            .last()
            .getAttribute('data-report-week-overdue')
        )
      )
      .toBe(baselineOverdue + 1);
  });
});
