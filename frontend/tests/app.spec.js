import { test, expect } from '@playwright/test';
test('test básico de comprobación', async ({ page }) => {
    await page.goto('http://localhost:5173'); // Ajusta al puerto de tu Vite si es distinto
    const title = await page.title();
    console.log(`Título de la página: ${title}`);
    expect(true).toBe(true);
});
