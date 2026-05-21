import { test, expect } from '@playwright/test';

test.describe('Performance Audit', () => {
  test('homepage loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    console.log(`Homepage Load Time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('auth page loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    console.log(`Auth Page Load Time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('dashboard loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    console.log(`Dashboard Load Time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });
});
