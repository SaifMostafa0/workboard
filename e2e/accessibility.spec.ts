import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Projects', path: '/projects' },
  { name: 'Tasks', path: '/tasks' },
  { name: 'Calendar', path: '/calendar' },
  { name: 'Timeline', path: '/timeline' },
  { name: 'Reports', path: '/reports' },
  { name: 'Trash', path: '/trash' },
  { name: 'Settings', path: '/settings' },
] as const;

test.describe('Accessibility', () => {
  for (const { name, path } of PAGES) {
    test(`${name} page has no detected accessibility violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }

  test('command palette has no detected accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('task bulk actions have no detected accessibility violations', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // exact: true — seeded task titles contain the word "Select" too.
    await page.getByRole('button', { name: 'Select', exact: true }).click();
    await expect(page.getByText('0 selected')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
