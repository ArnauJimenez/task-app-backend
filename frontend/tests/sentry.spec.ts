import { expect, test } from '@playwright/test';

test('reports React render errors through the Sentry test button', async ({ page }) => {
  await page.goto('/');
  const sentryResponse = process.env.VITE_SENTRY_DSN
    ? page.waitForResponse(
      (response) => new URL(response.url()).hostname.includes('.ingest.')
        && response.request().method() === 'POST',
      { timeout: 15_000 },
    )
    : undefined;

  await page.getByRole('button', { name: 'Break the world' }).click();

  await expect(page.getByRole('status')).toHaveText('Test error sent to Sentry.');
  await expect(page.getByRole('heading', { name: 'TaskApp Login' })).toBeVisible();
  if (sentryResponse) {
    expect((await sentryResponse).ok()).toBe(true);
  }
});
