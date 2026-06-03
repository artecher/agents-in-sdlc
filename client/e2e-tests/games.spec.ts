import { test, expect, type Response } from '@playwright/test';

test.describe('Game Listing and Navigation', () => {
  test('should display games with titles on index page', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
    });

    await test.step('Verify games grid is visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Verify game cards are displayed', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first()).toBeVisible();
      expect(await gameCards.count()).toBeGreaterThan(0);
    });

    await test.step('Verify game cards have titles with content', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first().getByTestId('game-title')).toBeVisible();
      await expect(gameCards.first().getByTestId('game-title')).not.toBeEmpty();
    });
  });

  test('should filter games by publisher and category and allow clearing filters', async ({ page }) => {
    await test.step('Navigate to homepage and wait for filters to be visible', async () => {
      await page.goto('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();
      await expect(page.getByTestId('publisher-filter')).toBeVisible();
      await expect(page.getByTestId('category-filter')).toBeVisible();
    });

    await test.step('Apply a publisher filter and verify filtered state appears', async () => {
      const cards = page.getByTestId('game-card');
      const initialCount = await cards.count();

      const publisherFilter = page.getByTestId('publisher-filter');
      const publisherOptions = publisherFilter.locator('option');
      expect(await publisherOptions.count()).toBeGreaterThan(1);

      const firstPublisherValue = await publisherOptions.nth(1).getAttribute('value');
      await publisherFilter.selectOption(firstPublisherValue ?? 'all');
      await expect(page.getByTestId('active-filter-summary')).toBeVisible();

      const countAfterPublisherFilter = await cards.count();
      expect(countAfterPublisherFilter).toBeLessThanOrEqual(initialCount);
    });

    await test.step('Apply a category filter and verify combined result does not grow', async () => {
      const cards = page.getByTestId('game-card');
      const countAfterPublisherFilter = await cards.count();

      const categoryFilter = page.getByTestId('category-filter');
      const categoryOptions = categoryFilter.locator('option');
      expect(await categoryOptions.count()).toBeGreaterThan(1);

      const firstCategoryValue = await categoryOptions.nth(1).getAttribute('value');
      await categoryFilter.selectOption(firstCategoryValue ?? 'all');

      const countAfterCombinedFilter = await cards.count();
      expect(countAfterCombinedFilter).toBeLessThanOrEqual(countAfterPublisherFilter);
    });

    await test.step('Clear filters and verify filters reset to defaults', async () => {
      await page.getByTestId('clear-filters-button').click();
      await expect(page.getByTestId('publisher-filter')).toHaveValue('all');
      await expect(page.getByTestId('category-filter')).toHaveValue('all');
      await expect(page.getByTestId('games-grid')).toBeVisible();
    });
  });

  test('should navigate to correct game details page when clicking on a game', async ({ page }) => {
    let gameId: string | null;
    let gameTitle: string | null;

    await test.step('Navigate to homepage and wait for games to load', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Get first game information and click it', async () => {
      const firstGameCard = page.getByTestId('game-card').first();
      gameId = await firstGameCard.getAttribute('data-game-id');
      gameTitle = await firstGameCard.getAttribute('data-game-title');
      await firstGameCard.click();
    });

    await test.step('Verify navigation to game details page', async () => {
      await expect(page).toHaveURL(`/game/${gameId}`);
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title matches clicked game', async () => {
      if (gameTitle) {
        await expect(page.getByTestId('game-details-title')).toHaveText(gameTitle);
      }
    });
  });

  test('should display game details with all required information', async ({ page }) => {
    await test.step('Navigate to specific game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title is displayed', async () => {
      const gameTitle = page.getByTestId('game-details-title');
      await expect(gameTitle).toBeVisible();
      await expect(gameTitle).not.toBeEmpty();
    });

    await test.step('Verify game description is displayed', async () => {
      const gameDescription = page.getByTestId('game-details-description');
      await expect(gameDescription).toBeVisible();
      await expect(gameDescription).not.toBeEmpty();
    });

    await test.step('Verify publisher or category information is present', async () => {
      const publisherExists = await page.getByTestId('game-details-publisher').isVisible();
      const categoryExists = await page.getByTestId('game-details-category').isVisible();
      expect(publisherExists || categoryExists).toBeTruthy();

      if (publisherExists) {
        await expect(page.getByTestId('game-details-publisher')).not.toBeEmpty();
      }

      if (categoryExists) {
        await expect(page.getByTestId('game-details-category')).not.toBeEmpty();
      }
    });
  });

  test('should display a button to back the game', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify back game button is visible and enabled', async () => {
      const backButton = page.getByTestId('back-game-button');
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText('Support This Game');
      await expect(backButton).toBeEnabled();
    });
  });

  test('should be able to navigate back to home from game details', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Click back to all games link', async () => {
      const backLink = page.getByRole('link', { name: /back to all games/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
    });

    await test.step('Verify navigation back to homepage', async () => {
      await expect(page).toHaveURL('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();
    });
  });

  test('should handle navigation to non-existent game gracefully', async ({ page }) => {
    let response: Response | null;

    await test.step('Navigate to non-existent game', async () => {
      response = await page.goto('/game/99999');
    });

    await test.step('Verify page handles error gracefully', async () => {
      expect(response?.status()).toBeLessThan(500);
      await expect(page).toHaveTitle(/Game Details - Tailspin Toys/);
    });
  });
});