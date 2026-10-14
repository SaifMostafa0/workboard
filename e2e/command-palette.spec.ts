import { expect, test } from '@playwright/test';

test.describe('Command palette', () => {
  test('opens with Ctrl+K and navigates to a section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Control+k');

    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();

    await page.getByRole('combobox', { name: 'Search commands' }).fill('projects');
    await page.getByRole('option', { name: /Go to Projects/ }).click();

    await page.waitForURL('/projects');
    await expect(page.locator('h1')).toContainText('Projects');
  });

  test('creates a new project from the palette', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Search commands' }).fill('new project');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('dialog', { name: 'Create Project' })).toBeVisible();
  });

  test('closes with Escape', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
  });
});

test.describe('Keyboard shortcuts', () => {
  test('? opens the shortcuts dialog', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('?');

    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  });

  test('g then p navigates to Projects', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('g');
    await page.keyboard.press('p');

    await page.waitForURL('/projects');
    await expect(page.locator('h1')).toContainText('Projects');
  });
});
