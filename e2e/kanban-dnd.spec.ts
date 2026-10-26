import { expect, test, type Locator, type Page } from '@playwright/test';

const projectName = 'Kanban DnD Project';
const taskName = 'Draggable task';

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

test.describe('Kanban status changes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New Project' }).click();

    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel('Project Name').fill(projectName);
    await createDialog.getByRole('button', { name: 'Create Project' }).click();
    await expect(createDialog).toBeHidden();

    const projectCard = page.locator('article', { hasText: projectName });
    await expect(projectCard).toBeVisible();
    await projectCard.getByRole('link').first().click();
    await page.waitForURL(/\/projects\/[^/]+$/);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'New Task' }).click();
    await page.fill('input[name="title"]', taskName);
    await page.getByRole('button', { name: 'Create Task' }).click();
    await expect(page.locator('article', { hasText: taskName })).toBeVisible();
  });

  test('moves a card between columns with drag or the touch status control', async ({
    page,
    isMobile,
  }) => {
    const todoColumn = page.getByRole('list', { name: 'To Do tasks' });
    const inProgressColumn = page.getByRole('list', { name: 'In Progress tasks' });
    const card = page.locator('article', { hasText: taskName });

    await expect(todoColumn.locator('article', { hasText: taskName })).toBeVisible();

    if (isMobile) {
      // Native HTML5 drag-and-drop does not fire on touch devices. The status
      // buttons are the supported mobile path and the accessibility fallback.
      await todoColumn.getByRole('button', { name: 'Start' }).click();
    } else {
      await dragAndDrop(page, card, inProgressColumn);
    }

    await expect(inProgressColumn.locator('article', { hasText: taskName })).toBeVisible();
    await expect(todoColumn.locator('article', { hasText: taskName })).toHaveCount(0);
  });

  test('moves a card between columns with the keyboard', async ({ page }) => {
    const todoColumn = page.getByRole('list', { name: 'To Do tasks' });
    const inProgressColumn = page.getByRole('list', { name: 'In Progress tasks' });

    const startButton = todoColumn.getByRole('button', { name: 'Start' });
    await startButton.focus();
    await expect(startButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(inProgressColumn.locator('article', { hasText: taskName })).toBeVisible();
    await expect(todoColumn.locator('article', { hasText: taskName })).toHaveCount(0);
  });
});
