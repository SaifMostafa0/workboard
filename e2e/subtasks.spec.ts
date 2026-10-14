import { expect, test } from '@playwright/test';

test.describe('Sub-tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Create a project and open its detail page so tasks can be managed.
    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Sub-task Project');
    await page.click('button:has-text("Create Project")');
    await page.waitForURL('/projects');

    await page.click('article:has-text("Sub-task Project") a');
    await page.waitForLoadState('networkidle');
  });

  test('creates a sub-task and hides it until toggled on', async ({ page }) => {
    await page.click('text=New Task');
    await page.fill('input[name="title"]', 'Parent task');
    await page.click('button:has-text("Create Task")');
    await expect(page.locator('article', { hasText: 'Parent task' })).toBeVisible();

    // Start a sub-task from the parent card's action.
    await page
      .locator('article:has-text("Parent task") button[aria-label^="Add sub-task"]')
      .click();
    await expect(page.getByText('Sub-task of')).toBeVisible();
    await page.fill('input[name="title"]', 'Child task');
    await page.click('button:has-text("Create Sub-task")');

    // Sub-tasks are hidden from the top-level board by default...
    await expect(page.locator('article', { hasText: 'Child task' })).toHaveCount(0);
    // ...but the parent shows its progress.
    await expect(page.locator('article', { hasText: 'Parent task' })).toContainText('0/1');

    // Toggling reveals the sub-task with a badge.
    await page.click('button:has-text("Show sub-tasks")');
    const child = page.locator('article', { hasText: 'Child task' });
    await expect(child).toBeVisible();
    await expect(child).toContainText('Sub-task');
  });

  test('completing a sub-task updates the parent progress', async ({ page }) => {
    await page.click('text=New Task');
    await page.fill('input[name="title"]', 'Parent progress');
    await page.click('button:has-text("Create Task")');
    await page
      .locator('article:has-text("Parent progress") button[aria-label^="Add sub-task"]')
      .click();
    await page.fill('input[name="title"]', 'Child progress');
    await page.click('button:has-text("Create Sub-task")');

    await expect(page.locator('article', { hasText: 'Parent progress' })).toContainText('0/1');

    await page.click('button:has-text("Show sub-tasks")');
    const child = page.locator('article', { hasText: 'Child progress' });
    await child.locator('button:has-text("Start")').click();
    await child.locator('button:has-text("Complete")').click();

    await expect(page.locator('article', { hasText: 'Parent progress' })).toContainText('1/1');
  });

  test('deleting a parent moves its sub-tasks to the trash too', async ({ page }) => {
    await page.click('text=New Task');
    await page.fill('input[name="title"]', 'Parent delete');
    await page.click('button:has-text("Create Task")');
    await page
      .locator('article:has-text("Parent delete") button[aria-label^="Add sub-task"]')
      .click();
    await page.fill('input[name="title"]', 'Child delete');
    await page.click('button:has-text("Create Sub-task")');

    // Accept the cascade confirmation, which mentions the sub-task count.
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('article:has-text("Parent delete") button[aria-label^="Delete"]').click();
    await expect(page.locator('article', { hasText: 'Parent delete' })).toHaveCount(0);

    // Both parent and child are in the trash.
    await page.goto('/trash');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('li', { hasText: 'Parent delete' })).toBeVisible();
    await expect(page.locator('li', { hasText: 'Child delete' })).toBeVisible();
  });
});
