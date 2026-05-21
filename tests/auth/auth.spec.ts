import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('auth page renders correctly', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    // The auth page should have at least one input field (email/password)
    // Wait for client-side hydration to complete
    await expect(page.locator('input').first()).toBeVisible({ timeout: 30000 });
  });

  test('auth page has no crashes', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test('auth page signup mode accessible', async ({ page }) => {
    const response = await page.goto('/auth?mode=signup', { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });
});
