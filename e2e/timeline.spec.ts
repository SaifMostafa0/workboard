import { expect, test } from '@playwright/test';

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

test.describe('Timeline', () => {
  test('positions dated tasks, filters, zooms, and opens task detail', async ({ page }) => {
    const todayKey = toDateInput(new Date());

    // The dev seed has no due dates, so create one dated task through the UI.
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'New Task' }).click();

    const createDialog = page.getByRole('dialog', { name: 'Create Task' });
    await expect(createDialog).toBeVisible();

    const projectSelect = createDialog.getByLabel('Project');
    await projectSelect.selectOption({ index: 1 });
    const projectId = await projectSelect.inputValue();
    const projectName = (await projectSelect.locator('option:checked').textContent())?.trim() ?? '';
    expect(projectName).not.toBe('');

    await createDialog.getByLabel('Title').fill('Timeline journey task');
    await createDialog.getByLabel('Due Date (optional)').fill(todayKey);
    await createDialog.getByRole('button', { name: 'Create Task' }).click();
    await expect(createDialog).toBeHidden();

    // Defaults are canonicalised into the URL so the view is shareable.
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Timeline', level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/zoom=week/);
    await expect(page).toHaveURL(new RegExp(`date=${todayKey}`));

    const bar = page.locator('[data-timeline-task-id]').filter({
      hasText: 'Timeline journey task',
    });
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('data-timeline-due-date', todayKey);
    await expect(bar).toHaveAttribute(
      'aria-label',
      /Timeline journey task.*Due .*To Do.*Medium priority/
    );
    await expect(page.locator('[data-timeline-today]')).toHaveAttribute(
      'data-timeline-today',
      todayKey
    );

    // Empty project rows are kept, so the roadmap shows the whole plan.
    await expect(page.getByText('No tasks in this window').first()).toBeVisible();

    // Range navigation is URL-backed; Today brings the bar back.
    await page.getByRole('button', { name: 'Next window' }).click();
    await expect(page).not.toHaveURL(new RegExp(`date=${todayKey}`));
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(page).toHaveURL(new RegExp(`date=${todayKey}`));
    await expect(bar).toBeVisible();

    // Every zoom level keeps the dated task positioned in the window.
    const zoomGroup = page.getByRole('group', { name: 'Timeline zoom' });
    await zoomGroup.getByRole('button', { name: 'Day', exact: true }).click();
    await expect(page).toHaveURL(/zoom=day/);
    await expect(bar).toBeVisible();
    await zoomGroup.getByRole('button', { name: 'Month', exact: true }).click();
    await expect(page).toHaveURL(/zoom=month/);
    await expect(bar).toBeVisible();
    await zoomGroup.getByRole('button', { name: 'Week', exact: true }).click();
    await expect(bar).toBeVisible();

    // Project filtering is URL-backed and excludes other projects.
    const projectFilter = page.getByLabel('Filter by project');
    await projectFilter.selectOption(projectId);
    await expect(page).toHaveURL(/project=/);
    await expect(bar).toBeVisible();

    const otherProject = await projectFilter
      .locator('option')
      .evaluateAll(
        (options, own) =>
          options
            .map((option) => (option as HTMLOptionElement).value)
            .find((value) => value !== '' && value !== own),
        projectId
      );
    if (!otherProject) throw new Error('Expected another seeded project');

    await projectFilter.selectOption(otherProject);
    await expect(bar).toHaveCount(0);
    await expect(page.getByText('No tasks in this window').first()).toBeVisible();

    await projectFilter.selectOption('');
    await expect(bar).toBeVisible();

    // Status filtering removes the open task and brings it back.
    const statusFilter = page.getByLabel('Filter by status');
    await statusFilter.selectOption('done');
    await expect(page).toHaveURL(/status=done/);
    await expect(bar).toHaveCount(0);
    await statusFilter.selectOption('');
    await expect(bar).toBeVisible();

    // Bars are keyboard reachable and open the existing edit dialog.
    await bar.focus();
    await page.keyboard.press('Enter');
    const editDialog = page.getByRole('dialog', { name: 'Edit Task' });
    await expect(editDialog).toBeVisible();
    await expect(editDialog.getByLabel('Title')).toHaveValue('Timeline journey task');
    await editDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(editDialog).toBeHidden();

    // Tasks without due dates are called out instead of disappearing.
    await expect(page.getByRole('heading', { name: 'No due date' })).toBeVisible();
    await expect(page.getByText(/cannot be placed on the timeline/)).toBeVisible();
  });
});
