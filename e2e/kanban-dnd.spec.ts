import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Playwright's mouse-based dragTo does not drive the browser's native HTML5
 * drag-and-drop pipeline, so we dispatch the drag events directly (the
 * documented approach for testing HTML5 DnD).
 */
async function dragAndDrop(page: Page, source: Locator, target: Locator) {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent('dragstart', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
  await source.dispatchEvent('dragend', { dataTransfer });
}

test.describe('Kanban drag and drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Kanban Test Project');
    await page.click('button:has-text("Create Project")');
    await page.waitForURL('/projects');

    await page.click('article:has-text("Kanban Test Project") a');
    await page.waitForLoadState('networkidle');

    await page.click('text=New Task');
    await page.fill('input[name="title"]', 'Drag Me');
    await page.click('button:has-text("Create Task")');
    await expect(page.locator('article', { hasText: 'Drag Me' })).toBeVisible();
  });

  test('moves a card between columns by dragging', async ({ page, isMobile }) => {
    // Native HTML5 drag-and-drop does not fire on touch devices; the status
    // buttons remain the accessible fallback there.
    test.skip(isMobile, 'HTML5 drag-and-drop is not supported on touch devices');

    const todoColumn = page.locator('[role="list"][aria-label="To Do tasks"]');
    const inProgressColumn = page.locator('[role="list"][aria-label="In Progress tasks"]');

    await expect(todoColumn.locator('article', { hasText: 'Drag Me' })).toBeVisible();

    await dragAndDrop(page, page.locator('article', { hasText: 'Drag Me' }), inProgressColumn);

    await expect(inProgressColumn.locator('article', { hasText: 'Drag Me' })).toBeVisible();
    await expect(todoColumn.locator('article', { hasText: 'Drag Me' })).toHaveCount(0);
  });
});
