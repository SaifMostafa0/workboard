import { expect, test } from '@playwright/test';

test.describe('Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Create a project for testing tasks
    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Task Test Project');
    await page.click('button:has-text("Create Project")');
    await page.waitForURL('/projects');

    // Navigate to project detail
    await page.click('article:has-text("Task Test Project") a');
    await page.waitForLoadState('networkidle');
  });

  test('creates a new task', async ({ page }) => {
    await page.click('text=New Task');

    // Fill task form
    await page.fill('input[name="title"]', 'E2E Test Task');
    await page.fill('textarea[name="description"]', 'Task description');
    await page.selectOption('select[name="status"]', 'in_progress');
    await page.selectOption('select[name="priority"]', 'high');
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.fill('input[name="dueDate"]', futureDate);
    await page.fill('input[name="assignee"]', 'Test User');
    await page.fill('input[name="tags"]', 'frontend, bug, urgent');

    await page.click('button:has-text("Create Task")');

    // Should show the task card with its status and priority
    const card = page.locator('article', { hasText: 'E2E Test Task' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('In Progress');
    await expect(card).toContainText('High');
  });

  test('edits a task', async ({ page }) => {
    // Create a task first
    await page.click('text=New Task');
    await page.fill('input[name="title"]', 'Task to Edit');
    await page.click('button:has-text("Create Task")');

    await expect(page.locator('article', { hasText: 'Task to Edit' })).toBeVisible();

    // Click edit button
    const editButton = page.locator('article:has-text("Task to Edit") button[aria-label^="Edit"]');
    await editButton.click();

    // Update title
    await page.fill('input[name="title"]', 'Edited Task');
    await page.click('button:has-text("Save Changes")');

    // Should show updated task
    await expect(page.locator('article', { hasText: 'Edited Task' })).toBeVisible();
    await expect(page.locator('article', { hasText: 'Task to Edit' })).toHaveCount(0);
  });

  test('changes task status via kanban buttons', async ({ page }) => {
    // Create a task in todo
    await page.click('text=New Task');
    await page.fill('input[name="title"]', 'Status Test Task');
    await page.click('button:has-text("Create Task")');

    await expect(page.locator('article', { hasText: 'Status Test Task' })).toContainText('To Do');

    // Click Start button to move to in_progress
    await page.click('button:has-text("Start")');

    // Should now be in progress
    await expect(page.locator('article', { hasText: 'Status Test Task' })).toContainText(
      'In Progress'
    );

    // Click Complete button
    await page.click('button:has-text("Complete")');

    // Should now be done
    await expect(page.locator('article', { hasText: 'Status Test Task' })).toContainText('Done');
  });

  test('deletes a task with confirmation', async ({ page }) => {
    // Create a task
    await page.click('text=New Task');
    await page.fill('input[name="title"]', 'Task to Delete');
    await page.click('button:has-text("Create Task")');

    await expect(page.locator('article', { hasText: 'Task to Delete' })).toBeVisible();

    // Accept the native confirmation dialog (registered before the click)
    page.once('dialog', (dialog) => dialog.accept());

    // Click delete button — anchor the match so the "Edit ... Delete"
    // aria-label doesn't also match.
    const deleteButton = page.locator(
      'article:has-text("Task to Delete") button[aria-label^="Delete"]'
    );
    await deleteButton.click();

    // Task card should be gone
    await expect(page.locator('article', { hasText: 'Task to Delete' })).toHaveCount(0);
  });

  test('switches between kanban and list view', async ({ page }) => {
    // Create a task
    await page.click('text=New Task');
    await page.fill('input[name="title"]', 'View Test Task');
    await page.click('button:has-text("Create Task")');

    // Switch to list view
    await page.click('button:has-text("List")');

    // Should show list view
    await expect(page.locator('article', { hasText: 'View Test Task' })).toBeVisible();

    // Switch back to board view
    await page.click('button:has-text("Board")');

    // Should show kanban view
    await expect(page.locator('article', { hasText: 'View Test Task' })).toBeVisible();
  });
});
