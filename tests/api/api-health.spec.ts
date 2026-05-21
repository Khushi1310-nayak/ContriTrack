import { test, expect } from '@playwright/test';

test.describe('API Health Checks', () => {
  test('homepage returns 200', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
  });

  test('auth page returns 200', async ({ request }) => {
    const response = await request.get('/auth');
    expect(response.status()).toBe(200);
  });

  test('manifest.json is accessible', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.name).toBeDefined();
  });

  test('favicon is accessible', async ({ request }) => {
    const response = await request.get('/favicon.ico');
    expect(response.status()).toBe(200);
  });

  test('no 404 on main routes', async ({ request }) => {
    const routes = ['/', '/auth', '/dashboard'];
    for (const route of routes) {
      const response = await request.get(route);
      expect(response.status()).not.toBe(404);
    }
  });
});
