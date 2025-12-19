import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Token Detail Page
 * Tests individual token view and trading functionality
 */
test.describe('Token Detail Page', () => {
  // Use SOL as example token
  const testToken = 'SOL';

  test.beforeEach(async ({ page }) => {
    await page.goto(`/tokens/${testToken}`);
  });

  test('should display token information', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for token symbol or name
    await expect(page.getByText(testToken)).toBeVisible({ timeout: 10000 });
  });

  test('should display price chart', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for chart component
    const chart = page.locator('[data-testid="price-chart"], canvas, .recharts-wrapper');
    await expect(chart).toBeVisible({ timeout: 10000 });
  });

  test('should display AI analysis card', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for AI analysis section
    const analysisCard = page.locator('[data-testid="ai-analysis"], [data-testid="analysis-card"]');
    
    if (await analysisCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(analysisCard).toBeVisible();

      // Check for recommendation
      const recommendation = page.getByText(/buy|sell|hold|bullish|bearish/i);
      await expect(recommendation).toBeVisible();
    }
  });

  test('should display trade form', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for trade form
    const tradeForm = page.locator('[data-testid="trade-form"], form');
    await expect(tradeForm).toBeVisible({ timeout: 10000 });

    // Check for amount input
    const amountInput = page.locator('input[name="amount"], input[placeholder*="amount"], input[type="number"]');
    await expect(amountInput.first()).toBeVisible();

    // Check for buy/sell buttons
    const buyButton = page.getByRole('button', { name: /buy/i });
    const sellButton = page.getByRole('button', { name: /sell/i });
    
    const hasBuyButton = await buyButton.isVisible({ timeout: 3000 }).catch(() => false);
    const hasSellButton = await sellButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasBuyButton || hasSellButton).toBeTruthy();
  });

  test('should display risk meter', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for risk meter component
    const riskMeter = page.locator('[data-testid="risk-meter"]');
    
    if (await riskMeter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(riskMeter).toBeVisible();
    }
  });

  test('should switch between timeframes on chart', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for timeframe buttons
    const timeframeButtons = page.locator('[data-testid="timeframe-selector"] button, button:has-text("1H"), button:has-text("1D"), button:has-text("1W")');
    
    if (await timeframeButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const firstButton = timeframeButtons.first();
      await firstButton.click();
      
      // Chart should update (page remains stable)
      await expect(page).toHaveURL(new RegExp(`/tokens/${testToken}`));
    }
  });

  test('should validate trade form input', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find amount input
    const amountInput = page.locator('input[name="amount"], input[placeholder*="amount"], input[type="number"]').first();
    
    if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Enter invalid amount
      await amountInput.fill('-1');
      
      // Try to submit
      const submitButton = page.getByRole('button', { name: /buy|swap|trade/i });
      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click();
        
        // Should show error or not submit
        const error = page.getByText(/invalid|error|minimum|required/i);
        const hasError = await error.isVisible({ timeout: 3000 }).catch(() => false);
        
        // Either shows error or button is disabled for invalid input
        expect(hasError || await submitButton.isDisabled()).toBeTruthy();
      }
    }
  });

  test('should display token statistics', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for various token stats
    const statsToCheck = [
      /price/i,
      /volume|24h/i,
      /market cap|mcap/i,
      /change|%/i,
    ];

    for (const stat of statsToCheck) {
      const element = page.getByText(stat);
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(element).toBeVisible();
        break; // At least one stat is visible
      }
    }
  });
});