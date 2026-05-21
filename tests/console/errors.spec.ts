import { test, expect } from '@playwright/test';

test.describe('Console Error Detection', () => {
  const routes = ['/', '/auth'];

  for (const route of routes) {
    test(`no page errors on ${route}`, async ({ page }) => {
      const errors: string[] = [];

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Give the page time to hydrate without waiting for networkidle (which can hang)
      await page.waitForTimeout(5000);

      expect(errors).toEqual([]);
    });
  }
});
