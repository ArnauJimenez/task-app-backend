import { test, expect } from '@playwright/test';

test('basic smoke test', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'TaskApp Login' })).toBeVisible();
});