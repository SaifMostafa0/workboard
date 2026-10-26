import { expect, test } from '@playwright/test';

test.describe('Filters and Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('searches tasks by title', async ({ page }) => {
    await page.fill('input[placeholder="Search tasks..."]', 'Virtualize');

    // Should filter results down to the matching task
    await expect(
      page.locator('article', { hasText: 'WB-403 Virtualize long lists' })
    ).toBeVisible();
    await expect(page.locator('article', { hasText: 'WB-101 Finish Saved Views' })).toHaveCount(0);
  });

  test('filters by status', async ({ page }) => {
    // Widen the page so both done and open seed tasks are present before filtering.
    await page.selectOption('select[id="page-size"]', '50');

    const cards = page.locator('article');
    const todoCard = cards.filter({ has: page.getByText('To Do', { exact: true }) }).first();
    await expect(todoCard).toBeVisible();
    const todoTitle = (await todoCard.locator('h3').innerText()).trim();

    await page.selectOption('select[aria-label="Filter by status"]', 'done');

    // Every visible card is done, and the open task we captured is gone.
    await expect(cards.first()).toBeVisible();
    const visibleCount = await cards.count();
    await expect(cards.filter({ has: page.getByText('Done', { exact: true }) })).toHaveCount(
      visibleCount
    );
    await expect(
      cards.filter({ has: page.getByRole('heading', { name: todoTitle, exact: true }) })
    ).toHaveCount(0);
  });

  test('filters by priority', async ({ page }) => {
    await page.selectOption('select[aria-label="Filter by priority"]', 'high');

    await expect(
      page.locator('article', { hasText: 'WB-403 Virtualize long lists' })
    ).toBeVisible();
    await expect(page.locator('article', { hasText: 'WB-202 Add a calendar view' })).toHaveCount(0);
  });

  test('filters by project', async ({ page }) => {
    await page.selectOption('select[aria-label="Filter by project"]', { index: 1 });

    // Should filter by selected project
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('filters by due date', async ({ page }) => {
    // The backlog tracks no due dates, so nothing is overdue…
    await page.selectOption('select[aria-label="Filter by due date"]', 'overdue');
    await expect(page.locator('article')).toHaveCount(0);

    // …while the "No Due Date" filter matches the whole backlog.
    await page.selectOption('select[aria-label="Filter by due date"]', 'no-date');
    await expect(
      page.locator('article', { hasText: 'WB-403 Virtualize long lists' })
    ).toBeVisible();
  });

  test('combines multiple filters', async ({ page }) => {
    await page.fill('input[placeholder="Search tasks..."]', 'a');
    await page.selectOption('select[aria-label="Filter by status"]', 'todo');
    await page.selectOption('select[aria-label="Filter by priority"]', 'medium');

    // Should apply all filters (AND logic) — every visible card is todo + medium.
    const cards = page.locator('article');
    await expect(cards.first()).toBeVisible();
    const visibleCount = await cards.count();
    await expect(cards.filter({ has: page.getByText('To Do', { exact: true }) })).toHaveCount(
      visibleCount
    );
    await expect(cards.filter({ has: page.getByText('Medium', { exact: true }) })).toHaveCount(
      visibleCount
    );
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

    // The seeded backlog spans more than one page.
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    await expect(page).toHaveURL(/page=2/);

    await page.locator('button:has-text("Previous")').click();
    await expect(page).not.toHaveURL(/page=2/);
  });

  test('changes page size', async ({ page }) => {
    await page.selectOption('select[id="page-size"]', '50');

    // Should update URL with pageSize param
    await expect(page).toHaveURL(/pageSize=50/);
  });

  test('resets pagination when filters change', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Next")');

    await expect(nextButton).toBeVisible();
    await nextButton.click();
    await expect(page).toHaveURL(/page=2/);

    await page.fill('input[placeholder="Search tasks..."]', 'a');

    // Should reset to page 1 (the page param is dropped)
    await expect(page).not.toHaveURL(/page=2/);
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
