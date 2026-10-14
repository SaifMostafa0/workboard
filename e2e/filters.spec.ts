import { expect, test } from '@playwright/test';

test.describe('Filters and Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('searches tasks by title', async ({ page }) => {
    await page.fill('input[placeholder="Search tasks..."]', 'homepage');

    // Should filter results down to the matching task
    await expect(page.locator('article', { hasText: 'Design the homepage hero' })).toBeVisible();
    await expect(page.locator('article', { hasText: 'Set up analytics' })).toHaveCount(0);
  });

  test('filters by status', async ({ page }) => {
    await page.selectOption('select[aria-label="Filter by status"]', 'done');

    // Only done tasks remain
    await expect(page.locator('article', { hasText: 'Set up analytics' })).toBeVisible();
    await expect(page.locator('article', { hasText: 'Write landing page copy' })).toHaveCount(0);
  });

  test('filters by priority', async ({ page }) => {
    await page.selectOption('select[aria-label="Filter by priority"]', 'urgent');

    await expect(page.locator('article', { hasText: 'Accessibility audit' })).toBeVisible();
    await expect(page.locator('article', { hasText: 'Write landing page copy' })).toHaveCount(0);
  });

  test('filters by project', async ({ page }) => {
    await page.selectOption('select[aria-label="Filter by project"]', { index: 1 });

    // Should filter by selected project
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('filters by due date', async ({ page }) => {
    await page.selectOption('select[aria-label="Filter by due date"]', 'overdue');

    // Only overdue tasks should remain
    await expect(page.locator('article', { hasText: 'Fix crash on startup' })).toBeVisible();
    await expect(page.locator('article', { hasText: 'Write landing page copy' })).toHaveCount(0);
  });

  test('combines multiple filters', async ({ page }) => {
    await page.fill('input[placeholder="Search tasks..."]', 'a');
    await page.selectOption('select[aria-label="Filter by status"]', 'todo');
    await page.selectOption('select[aria-label="Filter by priority"]', 'high');

    // Should apply all filters (AND logic) — every visible card is todo + high
    const cards = page.locator('article');
    await expect(cards.first()).toBeVisible();
    await expect(page.locator('article', { hasText: 'Set up analytics' })).toHaveCount(0);
  });

  test('clears all filters', async ({ page }) => {
    await page.fill('input[placeholder="Search tasks..."]', 'Test');
    await page.selectOption('select[aria-label="Filter by status"]', 'done');

    await page.click('button:has-text("Clear")');

    // All filters should be reset
    await expect(page.locator('input[placeholder="Search tasks..."]')).toHaveValue('');
    await expect(page.locator('select[aria-label="Filter by status"]')).toHaveValue('');
  });

  test('sorts tasks', async ({ page }) => {
    // Change sort field — selecting a new field starts ascending
    await page.selectOption('select[id="sort-by"]', 'dueDate');

    // Should update URL with sort params
    await expect(page).toHaveURL(/sort=dueDate/);
    await expect(page).toHaveURL(/order=asc/);

    // Toggle direction (descending is the default and is omitted from the URL)
    await page.click('button[aria-label="Sort descending"]');
    await expect(page).not.toHaveURL(/order=asc/);

    // Toggle back to ascending
    await page.click('button[aria-label="Sort ascending"]');
    await expect(page).toHaveURL(/order=asc/);
  });

  test('paginates results', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Next")');

    // Pagination only renders when there is more than one page.
    if (await nextButton.count()) {
      await nextButton.click();
      await expect(page).toHaveURL(/page=2/);

      await page.locator('button:has-text("Previous")').click();
      await expect(page).toHaveURL(/page=1/);
    }
  });

  test('changes page size', async ({ page }) => {
    await page.selectOption('select[id="page-size"]', '50');

    // Should update URL with pageSize param
    await expect(page).toHaveURL(/pageSize=50/);
  });

  test('resets pagination when filters change', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Next")');

    if (await nextButton.count()) {
      await nextButton.click();
      await expect(page).toHaveURL(/page=2/);

      await page.fill('input[placeholder="Search tasks..."]', 'a');

      // Should reset to page 1
      await expect(page).toHaveURL(/page=1/);
    }
  });

  test('persists filter state in URL', async ({ page }) => {
    await page.fill('input[placeholder="Search tasks..."]', 'a');
    await page.selectOption('select[aria-label="Filter by status"]', 'todo');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filters should be preserved
    await expect(page.locator('input[placeholder="Search tasks..."]')).toHaveValue('a');
    await expect(page.locator('select[aria-label="Filter by status"]')).toHaveValue('todo');
  });
});
