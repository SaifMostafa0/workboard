import { expect, test, type Locator, type Page } from '@playwright/test';

const taskCards = (page: Page) => page.locator('article[data-task-id]');

async function taskId(card: Locator): Promise<string> {
  const id = await card.getAttribute('data-task-id');
  if (!id) throw new Error('Task card is missing data-task-id');
  return id;
}

async function taskTitle(card: Locator): Promise<string> {
  return (await card.locator('h3').innerText()).trim();
}

/** Wait until the rendered list is non-empty and every visible card matches the selector. */
async function expectAllCardsMatch(page: Page, selector: string): Promise<void> {
  const cards = taskCards(page);
  await expect
    .poll(async () => {
      const total = await cards.count();
      if (total === 0) return false;
      return (await page.locator(selector).count()) === total;
    })
    .toBe(true);
}

test.describe('Filters and Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('searches tasks by title', async ({ page }) => {
    const cards = taskCards(page);
    await expect(cards.first()).toBeVisible();

    const first = cards.first();
    const second = cards.nth(1);
    const [firstId, secondId, firstTitle] = await Promise.all([
      taskId(first),
      taskId(second),
      taskTitle(first),
    ]);

    await page.fill('input[placeholder="Search tasks..."]', firstTitle);

    // The searched task remains; an unrelated task is filtered out.
    await expect(page.locator(`article[data-task-id="${firstId}"]`)).toBeVisible();
    await expect(page.locator(`article[data-task-id="${secondId}"]`)).toHaveCount(0);
  });

  test('filters by status', async ({ page }) => {
    // Widen the page so both done and open seed tasks are present before filtering.
    await page.selectOption('select[id="page-size"]', '50');

    const todoId = await taskId(page.locator('article[data-task-status="todo"]').first());

    await page.selectOption('select[aria-label="Filter by status"]', 'done');
    await expect(page).toHaveURL((url) => url.searchParams.get('status') === 'done');

    // Every visible card is done, and the open task we captured is gone.
    await expectAllCardsMatch(page, 'article[data-task-status="done"]');
    await expect(page.locator(`article[data-task-id="${todoId}"]`)).toHaveCount(0);
  });

  test('filters by priority', async ({ page }) => {
    await page.selectOption('select[id="page-size"]', '50');

    const highCard = page.locator('article[data-task-priority="high"]').first();
    const mediumCard = page.locator('article[data-task-priority="medium"]').first();
    await expect(highCard).toBeVisible();
    await expect(mediumCard).toBeVisible();
    const mediumId = await taskId(mediumCard);

    await page.selectOption('select[aria-label="Filter by priority"]', 'high');
    await expect(page).toHaveURL((url) => url.searchParams.get('priority') === 'high');

    await expectAllCardsMatch(page, 'article[data-task-priority="high"]');
    await expect(page.locator(`article[data-task-id="${mediumId}"]`)).toHaveCount(0);
  });

  test('filters by project', async ({ page }) => {
    const firstCard = taskCards(page).first();
    await expect(firstCard).toBeVisible();
    const projectId = await firstCard.getAttribute('data-task-project-id');
    if (!projectId) throw new Error('First task is not attached to a project');

    await page.selectOption('select[aria-label="Filter by project"]', projectId);
    await expect(page).toHaveURL((url) => url.searchParams.get('project') === projectId);

    await expectAllCardsMatch(page, `article[data-task-project-id="${projectId}"]`);
  });

  test('filters by due date', async ({ page }) => {
    const today = new Date().toLocaleDateString('en-CA');

    await page.selectOption('select[aria-label="Filter by due date"]', 'overdue');
    await expect(page).toHaveURL((url) => url.searchParams.get('due') === 'overdue');
    await expect
      .poll(async () =>
        taskCards(page).evaluateAll((cards) =>
          cards.every((card) => {
            const dueDate = card.getAttribute('data-task-due-date') ?? '';
            const status = card.getAttribute('data-task-status') ?? '';
            return status !== 'done' && dueDate !== '' && dueDate <= today;
          })
        )
      )
      .toBe(true);

    await page.selectOption('select[aria-label="Filter by due date"]', 'no-date');
    await expect(page).toHaveURL((url) => url.searchParams.get('due') === 'no-date');
    await expect
      .poll(async () => {
        const cards = taskCards(page);
        const total = await cards.count();
        if (total === 0) return false;
        return cards.evaluateAll((elements) =>
          elements.every((card) => (card.getAttribute('data-task-due-date') ?? '') === '')
        );
      })
      .toBe(true);
  });

  test('combines multiple filters', async ({ page }) => {
    await page.selectOption('select[aria-label="Filter by status"]', 'todo');
    await page.selectOption('select[aria-label="Filter by priority"]', 'medium');
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get('status') === 'todo' && url.searchParams.get('priority') === 'medium'
    );
    await expectAllCardsMatch(
      page,
      'article[data-task-status="todo"][data-task-priority="medium"]'
    );

    const cards = taskCards(page);
    const targetId = await taskId(cards.first());
    const targetTitle = await taskTitle(cards.first());

    await page.fill('input[placeholder="Search tasks..."]', targetTitle);
    await expect(page).toHaveURL((url) => url.searchParams.get('q') === targetTitle);

    // Should apply all filters (AND logic) — every visible card is todo + medium.
    await expect(page.locator(`article[data-task-id="${targetId}"]`)).toBeVisible();
    await expectAllCardsMatch(
      page,
      'article[data-task-status="todo"][data-task-priority="medium"]'
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
