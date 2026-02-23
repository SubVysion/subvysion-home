import { test, expect } from '@playwright/test'';

test('navigate to example.com', async ({ page }) => {
  await page.goto('http://example.com');
  await expect(page).toHaveTitle(/Example Domain/i);
});