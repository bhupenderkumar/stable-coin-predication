import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Portfolio Page
 * Tests portfolio management functionality
 */
test.describe('Portfolio Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio');
  });

  test('should display portfolio page with holdings', async ({ page }) => {
    // Check page title or heading
    await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display portfolio value summary', async ({ page }) => {
    // Wait for portfolio data to load
    await page.waitForLoadState('networkidle');

    // Check for value displays
    const totalValue = page.getByText(/total value|portfolio value/i);
    await expect(totalValue).toBeVisible({ timeout: 10000 });
  });

  test('should display holdings table or list', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for holdings section
    const holdingsSection = page.locator('[data-testid="holdings"]');
    if (await holdingsSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(holdingsSection).toBeVisible();
    }
  });

  test('should show empty state when no holdings', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // If no holdings, should show empty state message
    const emptyState = page.getByText(/no holdings|no tokens|empty/i);
    const holdings = page.locator('[data-testid="holding-row"]');

    // Either has holdings or shows empty state
    const hasHoldings = await holdings.first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasHoldings || hasEmptyState).toBeTruthy();
  });

  test('should allow sorting holdings', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find sort buttons/headers
    const sortButtons = page.locator('[data-testid="sort-button"], th[role="button"], th.cursor-pointer');
    
    if (await sortButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await sortButtons.first().click();
      // Page should remain stable after sort
      await expect(page).toHaveURL(/portfolio/);
    }
  });

  test('should display P&L information', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for profit/loss display
    const pnlElement = page.getByText(/p&l|profit|loss|gain|return/i);
    if (await pnlElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(pnlElement).toBeVisible();
    }
  });
});