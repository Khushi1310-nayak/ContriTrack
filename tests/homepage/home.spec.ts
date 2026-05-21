import { test, expect } from '@playwright/test';

test.describe('Homepage Health Check', () => {
  test('homepage loads successfully with correct title', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/ContriTrack/i);
  });

  test('homepage renders hero content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // The hero section has "Because group projects deserve accountability"
    // Use the hero section locator to avoid matching text elsewhere on the page
    const heroSection = page.locator('#hero');
    await expect(heroSection.getByText(/Because group projects deserve/i)).toBeVisible({ timeout: 15000 });
  });

  test('homepage has working CTA buttons', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const getStartedLink = page.locator('a[href*="/auth"]').first();
    await expect(getStartedLink).toBeVisible({ timeout: 15000 });
  });

  test('homepage has no page errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test('homepage renders trust badges', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Use more specific locators targeting the spans specifically to avoid strict mode violations
    const heroSection = page.locator('#hero');
    await expect(heroSection.locator('span', { hasText: 'GitHub Integration' }).first()).toBeVisible({ timeout: 20000 });
    await expect(heroSection.locator('span', { hasText: 'Real-time Tracking' }).first()).toBeVisible({ timeout: 10000 });
    await expect(heroSection.locator('span', { hasText: 'Smart Reports' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('homepage footer is visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const footer = page.locator('footer');
    await expect(footer).toBeVisible({ timeout: 15000 });
  });
});
