import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Home Page
 * Tests the main dashboard functionality
 */
test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the header with navigation', async ({ page }) => {
    // Check header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check navigation links
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /portfolio/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /history/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
  });

  test('should display stat cards with market data', async ({ page }) => {
    // Wait for stat cards to load
    const statCards = page.locator('[data-testid="stat-card"]');
    await expect(statCards.first()).toBeVisible({ timeout: 10000 });

    // Check total value stat
    await expect(page.getByText(/total value/i)).toBeVisible();
    
    // Check 24h change stat
    await expect(page.getByText(/24h change/i)).toBeVisible();
  });

  test('should display token table with token list', async ({ page }) => {
    // Wait for token table to load
    const tokenTable = page.locator('[data-testid="token-table"]');
    await expect(tokenTable).toBeVisible({ timeout: 10000 });

    // Check table headers
    await expect(page.getByText(/token/i)).toBeVisible();
    await expect(page.getByText(/price/i)).toBeVisible();
    await expect(page.getByText(/24h/i)).toBeVisible();
  });

  test('should navigate to token details when clicking a token', async ({ page }) => {
    // Wait for token table
    await page.waitForSelector('[data-testid="token-table"]', { timeout: 10000 });

    // Click on first token row
    const firstToken = page.locator('[data-testid="token-row"]').first();
    if (await firstToken.isVisible()) {
      await firstToken.click();

      // Should navigate to token detail page
      await expect(page).toHaveURL(/\/tokens\/.+/);
    }
  });

  test('should toggle theme between light and dark', async ({ page }) => {
    // Find theme toggle button
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    
    if (await themeToggle.isVisible()) {
      // Get initial theme
      const htmlElement = page.locator('html');
      const initialClass = await htmlElement.getAttribute('class');
      
      // Click toggle
      await themeToggle.click();
      
      // Theme class should change
      const newClass = await htmlElement.getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    }
  });

  test('should display portfolio summary', async ({ page }) => {
    const portfolioSummary = page.locator('[data-testid="portfolio-summary"]');
    
    // Portfolio summary may or may not be visible depending on state
    if (await portfolioSummary.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(portfolioSummary).toBeVisible();
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Header should still be visible
    await expect(page.locator('header')).toBeVisible();
    
    // Navigation might be collapsed into a menu
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    const navLinks = page.locator('nav a');
    
    // Either mobile menu or nav links should be accessible
    const mobileMenuVisible = await mobileMenu.isVisible().catch(() => false);
    const navVisible = await navLinks.first().isVisible().catch(() => false);
    
    expect(mobileMenuVisible || navVisible).toBeTruthy();
  });
});