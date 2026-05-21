import { test, expect } from '@playwright/test';

test.describe('Dashboard Rendering', () => {
  test('dashboard route responds without server error', async ({ page }) => {
    const response = await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test('dashboard renders body without crashing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
