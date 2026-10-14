import { expect, test, type Page } from '@playwright/test';

/**
 * On small viewports the sidebar is an off-canvas drawer, so the navigation
 * links are only reachable after opening the menu.
 */
async function openSidebarIfNeeded(page: Page) {
  const menuButton = page.locator('button[aria-label="Open menu"]');
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
}

async function goToTrash(page: Page) {
  await openSidebarIfNeeded(page);
  await page.click('a[href="/trash"]');
  await page.waitForURL('/trash');
  await page.waitForLoadState('networkidle');
}

test.describe('Trash', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Create a project and open its detail page so task creation is available.
    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Trash Test Project');
    await page.click('button:has-text("Create Project")');
    await page.waitForURL('/projects');

    await page.click('article:has-text("Trash Test Project") a');
    await page.waitForLoadState('networkidle');
  });

  test('moves a deleted task to Trash and restores it', async ({ page }) => {
    await page.click('text=New Task');
    await page.fill('input[name="title"]', 'Trash Me');
    await page.click('button:has-text("Create Task")');
    await expect(page.locator('article', { hasText: 'Trash Me' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('article:has-text("Trash Me") button[aria-label^="Delete"]').click();
    await expect(page.locator('article', { hasText: 'Trash Me' })).toHaveCount(0);

    await goToTrash(page);
    const trashedTask = page.locator('li', { hasText: 'Trash Me' });
    await expect(trashedTask).toBeVisible();

    await trashedTask.getByRole('button', { name: 'Restore' }).click();
    await expect(page.locator('li', { hasText: 'Trash Me' })).toHaveCount(0);
    await expect(page.locator('text=Trash is empty')).toBeVisible();
  });

  test('undoes a task deletion from the toast', async ({ page }) => {
    await page.click('text=New Task');
    await page.fill('input[name="title"]', 'Undo Me');
    await page.click('button:has-text("Create Task")');
    await expect(page.locator('article', { hasText: 'Undo Me' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('article:has-text("Undo Me") button[aria-label^="Delete"]').click();
    await expect(page.locator('article', { hasText: 'Undo Me' })).toHaveCount(0);

    // The info toast offers an inline Undo action.
    await page.getByRole('button', { name: 'Undo' }).click();

    await expect(page.locator('article', { hasText: 'Undo Me' })).toBeVisible();
  });

  test('restores a deleted project (and its tasks) from Trash', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    page.once('dialog', (dialog) => dialog.accept());
    await page
      .locator('article:has-text("Trash Test Project") button[aria-label^="Delete"]')
      .click();
    await expect(page.locator('article', { hasText: 'Trash Test Project' })).toHaveCount(0);

    await goToTrash(page);
    const trashedProject = page.locator('li', { hasText: 'Trash Test Project' });
    await expect(trashedProject).toBeVisible();

    await trashedProject.getByRole('button', { name: 'Restore' }).click();
    await expect(page.locator('li', { hasText: 'Trash Test Project' })).toHaveCount(0);

    await openSidebarIfNeeded(page);
    await page.click('a[href="/projects"]');
    await page.waitForURL('/projects');
    await expect(page.locator('article', { hasText: 'Trash Test Project' })).toBeVisible();
  });

  test('empties the trash permanently', async ({ page }) => {
    await page.click('text=New Task');
    await page.fill('input[name="title"]', 'Delete Forever');
    await page.click('button:has-text("Create Task")');
    await expect(page.locator('article', { hasText: 'Delete Forever' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('article:has-text("Delete Forever") button[aria-label^="Delete"]').click();

    await goToTrash(page);
    await expect(page.locator('li', { hasText: 'Delete Forever' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Empty Trash' }).click();

    await expect(page.locator('text=Trash is empty')).toBeVisible();
    await expect(page.locator('li', { hasText: 'Delete Forever' })).toHaveCount(0);
  });
});
