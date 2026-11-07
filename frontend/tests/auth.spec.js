/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
test.describe('Flujo de Autenticación E2E', () => {
    test('debería permitir registrarse y luego iniciar sesión correctamente', async ({ page }) => {
        // Generar un email único para que el test sea repetible
        const uniqueEmail = `user_${Date.now()}@example.com`;
        const password = 'Password123!';
        // 1. Ir a la página de registro
        await page.goto('/register');
        // 2. Rellenar el formulario de registro
        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');
        // 3. Esperar a que aparezca algún indicador de éxito o navegar manualmente al login si tu app lo requiere
        // (Por ejemplo, esperamos un texto de éxito o que el formulario cambie)
        // O si tienes que ir al login haciendo clic en un enlace:
        // await page.click('text=Iniciar sesión'); // o el selector del link que tengas
        // O si te redirige al login tras unos segundos, puedes forzar la navegación:
        await page.goto('/login');
        // 4. Iniciar sesión con las credenciales recién creadas
        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');
        // 5. Comprobar que entra al dashboard o página principal de tareas
        await expect(page).toHaveURL(/.*dashboard/);
    });
});
