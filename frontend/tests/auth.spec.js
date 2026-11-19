/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
test.describe('Authentication E2E flow', () => {
    test('allows registration followed by login', async ({ page }) => {
        // Generate a unique email so the test is repeatable.
        const uniqueEmail = `user_${Date.now()}@example.com`;
        const password = 'Password123!';
        // 1. Open the registration page.
        await page.goto('/register');
        // 2. Fill in the registration form.
        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');
        // 3. Navigate to login after registration.
        await page.goto('/login');
        // 4. Log in with the new credentials.
        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');
        // 5. Check the dashboard URL.
        await expect(page).toHaveURL(/.*dashboard/);
    });
});
