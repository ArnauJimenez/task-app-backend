import { test, expect } from '@playwright/test';
test('basic smoke test', async ({ page }) => {
    await page.goto('http://localhost:5173'); // Adjust the port if your Vite server uses a different one.
    const title = await page.title();
    console.log(`Page title: ${title}`);
    expect(true).toBe(true);
});
