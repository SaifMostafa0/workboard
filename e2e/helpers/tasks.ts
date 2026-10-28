import { expect, type Page } from '@playwright/test';

/**
 * The E2E suite runs against Workboard's own backlog seed. When every ticket is
 * done that seed contains no open tasks, so status-filter specs must create one
 * instead of assuming a particular task state.
 */
export async function ensureTodoTask(page: Page): Promise<void> {
  const todoCards = page.locator('article[data-task-status="todo"]');
  if ((await todoCards.count()) > 0) return;

  await page.locator('button:has-text("New Task")').first().click();
  await page.selectOption('select[name="projectId"]', { index: 1 });
  await page.fill('input[name="title"]', 'E2E open task');
  await page.selectOption('select[name="status"]', 'todo');
  await page.selectOption('select[name="priority"]', 'medium');
  await page.click('button:has-text("Create Task")');

  await expect(page.locator('article[data-task-status="todo"]').first()).toBeVisible();
}
