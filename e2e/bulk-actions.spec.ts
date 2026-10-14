import { expect, test, type Page } from '@playwright/test';

async function openSidebarIfNeeded(page: Page) {
  const menuButton = page.locator('button[aria-label="Open menu"]');
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
}

async function goToTasks(page: Page) {
  await openSidebarIfNeeded(page);
  await page.click('a[href="/tasks"]');
  await page.waitForURL('/tasks');
  await page.waitForLoadState('networkidle');
}

test.describe('Bulk actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Create a project and a handful of tasks to act on.
    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Bulk Test Project');
    await page.click('button:has-text("Create Project")');
    await page.waitForURL('/projects');

    await page.click('article:has-text("Bulk Test Project") a');
    await page.waitForLoadState('networkidle');

    for (const title of ['Bulk A', 'Bulk B', 'Bulk C']) {
      await page.click('text=New Task');
      await page.fill('input[name="title"]', title);
      await page.click('button:has-text("Create Task")');
      await expect(page.locator('article', { hasText: title })).toBeVisible();
    }

    await goToTasks(page);
  });

  test('bulk updates the priority of selected tasks', async ({ page }) => {
    await page.getByRole('button', { name: 'Select' }).click();

    await page.getByRole('checkbox', { name: 'Select Bulk A' }).check();
    await page.getByRole('checkbox', { name: 'Select Bulk B' }).check();

    await expect(page.getByText('2 selected')).toBeVisible();

    await page.getByLabel('Set priority for selected tasks').selectOption('high');

    await expect(page.getByText('Tasks updated', { exact: true })).toBeVisible();
    await expect(page.locator('article', { hasText: 'Bulk A' })).toContainText('High');
    await expect(page.locator('article', { hasText: 'Bulk B' })).toContainText('High');
  });

  test('bulk deletes selected tasks and can undo', async ({ page }) => {
    await page.getByRole('button', { name: 'Select' }).click();

    await page.getByRole('checkbox', { name: 'Select Bulk A' }).check();
    await page.getByRole('checkbox', { name: 'Select Bulk B' }).check();
    await page.getByRole('checkbox', { name: 'Select Bulk C' }).check();
    await expect(page.getByText('3 selected')).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('3 tasks moved to trash')).toBeVisible();
    await expect(page.locator('article', { hasText: 'Bulk A' })).toHaveCount(0);
    await expect(page.locator('article', { hasText: 'Bulk C' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('article', { hasText: 'Bulk A' })).toBeVisible();
    await expect(page.locator('article', { hasText: 'Bulk C' })).toBeVisible();
  });
});
