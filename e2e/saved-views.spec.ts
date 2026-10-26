import { expect, test, type Page } from '@playwright/test';

interface CardTags {
  id: string;
  tags: string[];
}

const taskCards = (page: Page) => page.locator('article[data-task-id]');

async function readCardTags(page: Page): Promise<CardTags[]> {
  return taskCards(page).evaluateAll((cards) =>
    cards
      .map((card) => ({
        id: card.getAttribute('data-task-id') ?? '',
        tags: JSON.parse(card.getAttribute('data-task-tags') ?? '[]') as string[],
      }))
      .filter((card) => card.id !== '')
  );
}

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

    // Only todo tasks remain: every visible card has a todo status.
    await expect
      .poll(async () => {
        const total = await taskCards(page).count();
        if (total === 0) return false;
        return (await page.locator('article[data-task-status="todo"]').count()) === total;
      })
      .toBe(true);

    // Choosing "All views" returns to the default state.
    await page.selectOption('select[aria-label="Apply a saved view"]', { label: 'All views' });
    await expect(page).not.toHaveURL(/status=todo/);
    await expect(page).not.toHaveURL(/view=/);
  });

  test('filters by tag and reflects the selection in the URL', async ({ page }) => {
    await page.selectOption('select[id="page-size"]', '100');
    await expect(page).toHaveURL((url) => url.searchParams.get('pageSize') === '100');

    // Read the header total so the tag choice is based on the complete task set.
    const subtitle = await page.locator('header p').first().innerText();
    const total = Number(/(\d+)\s+tasks/.exec(subtitle)?.[1] ?? 0);
    if (total === 0) throw new Error('Task total was not rendered');
    await expect(taskCards(page)).toHaveCount(total);

    const before = await readCardTags(page);
    expect(before.length).toBeGreaterThan(0);

    // Pick a tag that appears on some tasks but not all, so the filter is
    // demonstrably doing something without naming a specific seeded ticket.
    const allTags = [...new Set(before.flatMap((card) => card.tags))];
    const tag = allTags.find(
      (candidate) =>
        before.some((card) => card.tags.includes(candidate)) &&
        before.some((card) => !card.tags.includes(candidate))
    );
    if (!tag) throw new Error('Seed data has no partially applied tags');

    const excluded = before.find((card) => !card.tags.includes(tag));
    if (!excluded) throw new Error('Tag unexpectedly applies to every task');

    const chip = page
      .getByRole('group', { name: 'Tags' })
      .getByRole('button', { name: tag, exact: true });

    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/tags=/);

    await expect
      .poll(async () => {
        const after = await readCardTags(page);
        return (
          after.length > 0 &&
          after.length < before.length &&
          after.every((card) => card.tags.includes(tag))
        );
      })
      .toBe(true);
    await expect(page.locator(`article[data-task-id="${excluded.id}"]`)).toHaveCount(0);
  });
});
