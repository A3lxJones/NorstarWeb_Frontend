import { test, expect } from '@playwright/test';

/**
 * Smoke tests for public-facing pages.
 *
 * These pages render without the backend API, so they are a reliable
 * signal that a deploy hasn't broken the core marketing / entry pages.
 * Each check: page returns HTTP 200, the expected <title> is set, and
 * the shared layout (navbar + footer) is present.
 */

interface PublicPage {
    path: string;
    /** A substring expected to appear in the page <title>. */
    titleContains: string;
    /** Distinctive visible text unique to the page. */
    text: RegExp;
}

const publicPages: PublicPage[] = [
    { path: '/', titleContains: 'Norstar', text: /developing inline hockey players/i },
    { path: '/news', titleContains: 'News', text: /latest news/i },
    { path: '/contact', titleContains: 'Contact', text: /contact us/i },
    { path: '/shop', titleContains: 'Shop', text: /coming soon/i },
    { path: '/privacy-policy', titleContains: 'Privacy Policy', text: /privacy policy/i },
    { path: '/login', titleContains: 'Norstar', text: /sign in to your member account/i },
    { path: '/signup', titleContains: 'Sign Up', text: /create your parent account/i },
    { path: '/forgot-password', titleContains: 'Forgot Password', text: /reset your password/i },
];

for (const page of publicPages) {
    test(`GET ${page.path} renders successfully`, async ({ page: browserPage }) => {
        const response = await browserPage.goto(page.path);

        expect(response, `no response for ${page.path}`).not.toBeNull();
        expect(response!.status(), `unexpected status for ${page.path}`).toBe(200);

        await expect(browserPage).toHaveTitle(new RegExp(page.titleContains, 'i'));

        // Page-specific text is visible somewhere on the page.
        await expect(browserPage.getByText(page.text).first()).toBeVisible();

        // Shared chrome is present.
        await expect(browserPage.locator('.navbar').first()).toBeVisible();
        await expect(browserPage.locator('footer').first()).toBeVisible();
    });
}

test('unknown route returns a 404 page', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');

    expect(response!.status()).toBe(404);
    await expect(page.getByText(/404|went wide|not found/i).first()).toBeVisible();
});
