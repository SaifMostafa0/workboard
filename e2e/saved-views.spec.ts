import { expect, test } from '@playwright/test';

test.describe('Saved views', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('saves the current filters as a view and re-applies them', async ({ page }) => {
    const viewName = 'Todo work';

    // Apply a filter, then capture it as a view.
    await page.selectOption('select[aria-label="Filter by status"]', 'todo');
    await expect(page).toHaveURL(/status=todo/);

    await page.getByRole('button', { name: 'Save view' }).first().click();
    await page.getByRole('dialog').getByLabel('View name').fill(viewName);
    await page.getByRole('dialog').getByRole('button', { name: 'Save view' }).click();

    // The view is now active, named on the page, and encoded in the URL.
    await expect(page.getByText(`View: ${viewName}`)).toBeVisible();
    await expect(page).toHaveURL(/view=/);

    // Clearing returns to the full list and drops the view.
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page).not.toHaveURL(/status=todo/);
    await expect(page).not.toHaveURL(/view=/);

    // Re-applying the saved view from the dropdown restores the filters.
    await page.selectOption('select[aria-label="Apply a saved view"]', { label: viewName });
    await expect(page).toHaveURL(/status=todo/);
    await expect(page.getByText(`View: ${viewName}`)).toBeVisible();

    // Only todo tasks remain: every visible card has the To Do badge.
    const cards = page.locator('article');
    await expect(cards.first()).toBeVisible();
    const visibleCount = await cards.count();
    await expect(cards.filter({ has: page.getByText('To Do', { exact: true }) })).toHaveCount(
      visibleCount
    );

    // Choosing "All views" returns to the default state.
    await page.selectOption('select[aria-label="Apply a saved view"]', { label: 'All views' });
    await expect(page).not.toHaveURL(/status=todo/);
    await expect(page).not.toHaveURL(/view=/);
  });

  test('filters by tag and reflects the selection in the URL', async ({ page }) => {
    const chip = page.getByRole('button', { name: 'type:test', exact: true });

    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/tags=/);

    await expect(
      page.locator('article', { hasText: 'WB-508 Un-skip and fix the mobile Kanban drag' })
    ).toBeVisible();
    await expect(page.locator('article', { hasText: 'WB-202 Add a calendar view' })).toHaveCount(0);
  });
});
