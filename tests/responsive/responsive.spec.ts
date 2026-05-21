import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 812 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`homepage renders correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page, browserName }) => {
      // WebKit on Windows can crash at large viewport sizes due to memory allocation
      test.skip(browserName === 'webkit' && viewport.name === 'Desktop', 'WebKit Desktop crashes on Windows');

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible();
      await expect(page.getByText(/ContriTrack/i).first()).toBeVisible({ timeout: 15000 });
    });
  }
});
