import { expect, test } from '@playwright/test';

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
  });

  test('shows project list page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Projects');
  });

  test('creates a new project', async ({ page }) => {
    await page.click('text=New Project');

    // Fill in project form
    await page.fill('input[name="name"]', 'E2E Test Project');
    await page.fill('input[name="description"]', 'Created by E2E test');
    await page.click('label:has-text("red")'); // Select red color

    await page.click('button:has-text("Create Project")');

    // Should redirect to projects list
    await expect(page).toHaveURL('/projects');

    // Should show the new project card
    await expect(page.locator('article', { hasText: 'E2E Test Project' })).toBeVisible();
  });

  test('searches projects', async ({ page }) => {
    // Create a project to search for
    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Searchable Project');
    await page.click('button:has-text("Create Project")');

    await page.waitForURL('/projects');

    // Search for it
    await page.fill('input[placeholder="Search projects..."]', 'Searchable');

    await expect(page.locator('article', { hasText: 'Searchable Project' })).toBeVisible();
    await expect(page.locator('article', { hasText: 'E2E Test Project' })).toHaveCount(0);
  });

  test('clears search', async ({ page }) => {
    await page.fill('input[placeholder="Search projects..."]', 'Searchable');
    await page.click('button:has-text("Clear")');

    await expect(page.locator('input[placeholder="Search projects..."]')).toHaveValue('');
  });

  test('deletes a project with confirmation', async ({ page }) => {
    // Create a project to delete
    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Project to Delete');
    await page.click('button:has-text("Create Project")');

    await page.waitForURL('/projects');

    // Accept the native confirmation dialog (must be registered before the click)
    page.once('dialog', (dialog) => dialog.accept());

    // Click delete button (trash icon) — anchor the match so "Edit ... Delete"
    // aria-labels don't also match.
    const deleteButton = page.locator(
      'article:has-text("Project to Delete") button[aria-label^="Delete"]'
    );
    await deleteButton.click();

    // Project card should be gone
    await expect(page.locator('article', { hasText: 'Project to Delete' })).toHaveCount(0);
  });

  test('navigates to project detail', async ({ page }) => {
    // Create a project
    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Detail Test Project');
    await page.click('button:has-text("Create Project")');

    await page.waitForURL('/projects');

    // Click on project card
    await page.click('article:has-text("Detail Test Project") a');

    // Should be on project detail page
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]{36}/);
    await expect(page.locator('h1')).toContainText('Detail Test Project');
  });
});
