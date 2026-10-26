import { expect, test } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('shows dashboard with seeded data', async ({ page }) => {
    // Should show dashboard title
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Should show metrics cards
    await expect(page.locator('text=Total Projects')).toBeVisible();
    await expect(page.locator('text=Total Tasks')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('p', { hasText: 'In Progress' })).toBeVisible();
    await expect(page.getByText('Overdue', { exact: true })).toBeVisible();
  });

  test('shows upcoming due dates section', async ({ page }) => {
    // The heading role disambiguates from the "No upcoming due dates" text.
    await expect(page.getByRole('heading', { name: 'Upcoming Due Dates' })).toBeVisible();
  });

  test('shows recent activity section', async ({ page }) => {
    await expect(page.locator('text=Recent Activity')).toBeVisible();
  });

  test('navigates to projects page from quick actions', async ({ page }) => {
    await page.click('text=New Project');
    await expect(page).toHaveURL('/projects/new');
  });

  test('navigates to tasks page from quick actions', async ({ page }) => {
    await page.click('text=New Task');
    await expect(page).toHaveURL('/tasks/new');
  });
});
