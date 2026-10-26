import { expect, test } from '@playwright/test';

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

test.describe('Calendar', () => {
  test('shows due tasks by day, filters by project, and opens task detail', async ({ page }) => {
    const today = new Date();
    const todayKey = toDateInput(today);
    const tomorrowKey = toDateInput(addDays(today, 1));
    const todayHeading = today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // A dated task is required because the dev seed has no due dates.
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'New Task' }).click();
    const createDialog = page.getByRole('dialog', { name: 'Create Task' });
    await expect(createDialog).toBeVisible();

    const projectSelect = createDialog.getByLabel('Project');
    await projectSelect.selectOption({ index: 1 });
    const projectName = (await projectSelect.locator('option:checked').textContent())?.trim() ?? '';
    expect(projectName).not.toBe('');

    await createDialog.getByLabel('Title').fill('Calendar journey task');
    await createDialog.getByLabel('Due Date (optional)').fill(todayKey);
    await createDialog.getByRole('button', { name: 'Create Task' }).click();
    await expect(createDialog).toBeHidden();
    await expect(page.getByText('Calendar journey task').first()).toBeVisible();

    // Default month view is canonicalised into the URL so links are shareable.
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Calendar', level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/view=month/);
    await expect(page).toHaveURL(new RegExp(`date=${todayKey}`));
    await expect(page.getByRole('grid')).toBeVisible();
    await expect(page.getByRole('gridcell')).toHaveCount(42);

    const selectedCell = page.locator('[role="gridcell"][aria-selected="true"]');
    await expect(selectedCell).toHaveAttribute('data-calendar-date', todayKey);
    await expect(selectedCell).toContainText('Calendar journey task');

    const details = page.locator('aside[aria-label="Calendar details"]');
    await expect(details.getByRole('heading', { name: todayHeading })).toBeVisible();
    await expect(details.getByRole('heading', { name: new RegExp(projectName) })).toBeVisible();
    await expect(details.getByRole('button', { name: /Calendar journey task/ })).toBeVisible();

    // Range navigation is URL-backed; Today returns to the task.
    await page.getByRole('button', { name: 'Next month' }).click();
    await expect(page).not.toHaveURL(new RegExp(`date=${todayKey}`));
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(page).toHaveURL(new RegExp(`date=${todayKey}`));

    // Clicking a task opens the existing edit dialog as the detail surface.
    await details.getByRole('button', { name: /Calendar journey task/ }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Task' });
    await expect(editDialog).toBeVisible();
    await expect(editDialog.getByLabel('Title')).toHaveValue('Calendar journey task');
    await editDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(editDialog).toBeHidden();

    // Project filtering is URL-backed and updates the grid + panel.
    const projectFilter = page.getByLabel('Filter by project');
    await projectFilter.selectOption({ label: projectName });
    await expect(page).toHaveURL(/project=/);
    await expect(selectedCell).toContainText('Calendar journey task');

    await projectFilter.selectOption({ index: 2 });
    await expect(page.locator('[role="gridcell"][aria-selected="true"]')).not.toContainText(
      'Calendar journey task'
    );
    await expect(details.getByText('No tasks due on this day.')).toBeVisible();

    await projectFilter.selectOption('');
    await expect(page).not.toHaveURL(/project=/);
    await expect(selectedCell).toContainText('Calendar journey task');

    // Clicking an empty day updates the panel; clicking today brings the task back.
    await page.locator(`[data-calendar-date="${tomorrowKey}"]`).click();
    await expect(selectedCell).toHaveAttribute('data-calendar-date', tomorrowKey);
    await expect(details.getByText('No tasks due on this day.')).toBeVisible();
    await page.locator(`[data-calendar-date="${todayKey}"]`).click();
    await expect(selectedCell).toHaveAttribute('data-calendar-date', todayKey);
    await expect(details.getByRole('button', { name: /Calendar journey task/ })).toBeVisible();

    // Week view renders seven cells and keeps the selected day.
    await page.getByRole('button', { name: 'Week' }).click();
    await expect(page).toHaveURL(/view=week/);
    await expect(page.getByRole('gridcell')).toHaveCount(7);
    await expect(selectedCell).toHaveAttribute('data-calendar-date', todayKey);

    // Arrow keys move the roving tabindex and selection.
    await selectedCell.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator(`[data-calendar-date="${tomorrowKey}"]`)).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`day=${tomorrowKey}`));
    await expect(details.getByText('No tasks due on this day.')).toBeVisible();

    // Tasks without due dates are called out explicitly rather than hidden.
    await expect(page.getByRole('heading', { name: 'No due date' })).toBeVisible();
    await expect(details.getByText(/without a due date/)).toBeVisible();
  });
});
