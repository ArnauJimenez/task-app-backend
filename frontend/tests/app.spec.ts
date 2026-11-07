import { test, expect } from '@playwright/test';

test('test básico de comprobación', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'TaskApp Login' })).toBeVisible();
});