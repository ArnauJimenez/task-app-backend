import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.describe('Flujo de Autenticación E2E', () => {
  test('debería permitir registrarse y luego iniciar sesión correctamente', async ({ page }) => {
    test.setTimeout(60_000);

    const email = `playwright-${Date.now()}-${randomUUID()}@example.com`;
    const password = 'Password123!';

    await page.goto('/');
    await page.getByRole('button', { name: '¿No tienes cuenta? Regístrate gratis' }).click();
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    const registrationResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname.endsWith('/api/auth/register')
        && response.request().method() === 'POST',
      { timeout: 45_000 },
    );
    await page.getByRole('button', { name: 'Registrarme' }).click();
    const registrationResponse = await registrationResponsePromise;
    const responseBody = await registrationResponse.text();
    expect(
      registrationResponse.status(),
      `El registro respondió ${registrationResponse.status()}: ${responseBody}`,
    ).toBe(201);
    await expect(page.getByText('¡Cuenta creada con éxito! Ya puedes iniciar sesión.'))
      .toBeVisible({ timeout: 10_000 });

    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('heading', { name: 'TaskApp Dashboard' })).toBeVisible();
  });
});