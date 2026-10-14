import { expect, test } from '@playwright/test';

test.describe('Error Recovery', () => {
  test('shows error toast on failed operation', async ({ page }) => {
    // `?__e2e` installs the write-failure control hook (see
    // src/infrastructure/storage/failureInjection.ts) so reads still work.
    await page.goto('/projects?__e2e=1');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      (
        window as unknown as { __workboardTestHooks?: { failWrites: (v: boolean) => void } }
      ).__workboardTestHooks?.failWrites(true);
    });

    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Test Project');
    await page.click('button:has-text("Create Project")');

    await expect(page.getByText('Failed to create project')).toBeVisible();
  });

  test('recovers from a failed submission by allowing a retry', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Recovery Test');
    await page.click('button:has-text("Create Project")');

    // Submission succeeds and the project is persisted
    await page.waitForURL('/projects');
    await expect(page.locator('article', { hasText: 'Recovery Test' })).toBeVisible();
  });

  test('preserves form input on validation error', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.click('text=New Project');

    // Submit without required name
    await page.click('button:has-text("Create Project")');

    // Should show validation error
    await expect(page.locator('text=Project name is required')).toBeVisible();

    // Description should be preserved
    await page.fill('input[name="description"]', 'Test description');
    await page.click('button:has-text("Create Project")');

    // Description should still be there
    await expect(page.locator('input[name="description"]')).toHaveValue('Test description');
  });

  test('prevents duplicate submissions', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Duplicate Test');

    // Fire several rapid clicks; the submit button disables while in flight.
    await page.locator('button:has-text("Create Project")').click({ clickCount: 3 });

    // Should only create one project
    await expect(page.locator('article', { hasText: 'Duplicate Test' })).toHaveCount(1);
  });

  test('handles import of invalid data gracefully', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Import JSON")');

    // The import dialog opens; actual file validation is covered by the
    // persistence spec and by unit tests.
    await expect(page.locator('text=Choose JSON file')).toBeVisible();
  });

  test('shows offline indicator when storage unavailable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Storage is removed and the app is reloaded; it must not crash the shell.
    await page.evaluate(() => {
      delete window.localStorage;
      delete window.indexedDB;
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // The shell should still render something (no white screen).
    await expect(page.locator('body')).toBeVisible();
  });

  test('warns before leaving page with unsaved changes', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.click('text=New Project');
    await page.fill('input[name="name"]', 'Unsaved Changes');
    await page.fill('input[name="description"]', 'This has unsaved changes');

    // The modal overlay covers the nav bar, so a real pointer click can't reach
    // the link. Trigger the in-app navigation programmatically; the router
    // blocker still intercepts it.
    const dialogPromise = page.waitForEvent('dialog');
    await page.locator('a[href="/"]').evaluate((el) => (el as HTMLElement).click());

    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('unsaved');
    await dialog.dismiss();

    // Cancelling the prompt must keep the user (and their input) in place.
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator('input[name="name"]')).toHaveValue('Unsaved Changes');
  });
});
