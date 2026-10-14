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

test.describe('Navigation', () => {
  test('loads dashboard directly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('loads projects page directly', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Projects');
  });

  test('loads tasks page directly', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Tasks');
  });

  test('loads settings page directly', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('loads project detail directly', async ({ page }) => {
    // First create a project to get a valid ID
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Direct Load Project');
    await page.click('button:has-text("Create Project")');
    await page.waitForURL('/projects');

    // Get the project ID from the URL after clicking
    await page.click('article:has-text("Direct Load Project") a');
    await page.waitForLoadState('networkidle');

    const projectUrl = page.url();
    const projectId = projectUrl.split('/projects/')[1];

    // Now load directly
    await page.goto(`/projects/${projectId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Direct Load Project');
  });

  test('loads filtered tasks directly via URL', async ({ page }) => {
    await page.goto('/tasks?status=done&priority=high');
    await page.waitForLoadState('networkidle');

    // Should have filters applied
    await expect(page.locator('select[aria-label="Filter by status"]')).toHaveValue('done');
    await expect(page.locator('select[aria-label="Filter by priority"]')).toHaveValue('high');
  });

  test('browser back/forward navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to projects
    await openSidebarIfNeeded(page);
    await page.click('a[href="/projects"]');
    await page.waitForURL('/projects');
    await expect(page.locator('h1')).toContainText('Projects');

    // Navigate to tasks
    await openSidebarIfNeeded(page);
    await page.click('a[href="/tasks"]');
    await page.waitForURL('/tasks');
    await expect(page.locator('h1')).toContainText('Tasks');

    // Go back
    await page.goBack();
    await page.waitForURL('/projects');
    await expect(page.locator('h1')).toContainText('Projects');

    // Go back again
    await page.goBack();
    await page.waitForURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Go forward
    await page.goForward();
    await page.waitForURL('/projects');
    await expect(page.locator('h1')).toContainText('Projects');
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Tab to first focusable element
    await page.keyboard.press('Tab');

    // Should be able to navigate through navigation links
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Enter on a link
    await page.keyboard.press('Enter');

    // Should navigate
    await page.waitForLoadState('networkidle');
  });

  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Page Not Found');
    await expect(page.locator('text=The page you')).toBeVisible();
    await expect(page.locator('a:has-text("Go to Dashboard")')).toBeVisible();
  });

  test('skip link works', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Tab to skip link
    await page.keyboard.press('Tab');

    // Should focus skip link
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();

    // Press Enter
    await page.keyboard.press('Enter');

    // Should focus main content
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });
});
