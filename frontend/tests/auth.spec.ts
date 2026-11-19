import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.describe('Authentication E2E flow', () => {
  test('allows registration followed by sign-in', async ({ page }) => {
    test.setTimeout(60_000);

    const email = `playwright-${Date.now()}-${randomUUID()}@example.com`;
    const password = 'Password123!';

    await page.goto('/');
    await page.getByRole('button', { name: "Don't have an account? Sign up for free" }).click();
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    const registrationResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname.endsWith('/api/auth/register')
        && response.request().method() === 'POST',
      { timeout: 45_000 },
    );
    await page.getByRole('button', { name: 'Sign up' }).click();
    const registrationResponse = await registrationResponsePromise;
    const responseBody = await registrationResponse.text();
    expect(
      registrationResponse.status(),
      `Registration returned ${registrationResponse.status()}: ${responseBody}`,
    ).toBe(201);
    await expect(page.getByText('Account created successfully! You can now sign in.'))
      .toBeVisible({ timeout: 10_000 });

    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'TaskApp Dashboard' })).toBeVisible();
  });
});