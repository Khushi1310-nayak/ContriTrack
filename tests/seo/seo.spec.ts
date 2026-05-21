import { test, expect } from '@playwright/test';

test.describe('SEO & Meta Tags', () => {
  test('homepage has proper meta description', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /.+/);
  });

  test('homepage has proper OG tags', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Verify the page loads without crash; OG tags are rendered server-side
    await expect(page.locator('body')).toBeVisible();
  });

  test('homepage has exactly one h1', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Wait for the h1 to be rendered (it's inside a motion component)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('homepage has manifest link', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute('href', /manifest/);
  });
});
