import { test, expect } from '@playwright/test';

test.describe('Chroma Shift PWA Smoke Tests', () => {
  test('should load the index page and verify PWA structure', async ({ page }) => {
    // Listen to console logs
    page.on('console', msg => {
      console.log(`PAGE LOG [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error(`PAGE ERROR: ${err.message}\n${err.stack}`);
    });

    // Open game landing URL
    await page.goto('/');

    // Check document title
    await expect(page).toHaveTitle('Chroma Shift');

    // Verify presence of core Game DOM Container
    const container = page.locator('#game-container');
    await expect(container).toBeVisible();

    // Verify presence of Add-to-Home-Screen custom prompt UI
    const installPrompt = page.locator('#ath-prompt');
    await expect(installPrompt).toBeAttached();

    // Verify update toast notification is in the DOM
    const updateToast = page.locator('#update-toast');
    await expect(updateToast).toBeAttached();
  });
});
