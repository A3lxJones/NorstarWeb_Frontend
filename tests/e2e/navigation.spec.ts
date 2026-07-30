import { test, expect } from '@playwright/test';

/**
 * Navigation tests — verify the primary navbar links work and land on the
 * correct pages. Guards against broken hrefs or missing routes after changes.
 */

test.describe('primary navigation', () => {
    test('navbar links route to the correct pages', async ({ page }) => {
        await page.goto('/');

        const links: { name: RegExp; expectedPath: string }[] = [
            { name: /^news$/i, expectedPath: '/news' },
            { name: /^contact$/i, expectedPath: '/contact' },
            { name: /^shop$/i, expectedPath: '/shop' },
        ];

        for (const link of links) {
            await page.goto('/');
            // Scope to the visible desktop nav (mobile dropdown links are hidden).
            await page.locator('.navbar-center').getByRole('link', { name: link.name }).click();
            await expect(page).toHaveURL(new RegExp(`${link.expectedPath}$`));
        }
    });

    test('brand logo links back to home', async ({ page }) => {
        await page.goto('/contact');
        await page.locator('.navbar-start').getByRole('link', { name: /norstar/i }).first().click();
        await expect(page).toHaveURL(/\/$/);
    });
});

/**
 * Auth guard tests — protected routes must redirect anonymous users to /login
 * and never leak dashboard content. This is a critical production safety check.
 */

test.describe('auth guards', () => {
    const protectedRoutes = ['/fixtures', '/dashboard', '/dashboard/teams', '/dashboard/children'];

    for (const route of protectedRoutes) {
        test(`anonymous access to ${route} redirects to /login`, async ({ page }) => {
            await page.goto(route);
            await expect(page).toHaveURL(/\/login$/);
            await expect(page.getByText(/sign in to your member account/i).first()).toBeVisible();
        });
    }
});

/**
 * Security header checks — verifies the hardening configured in app.ts is
 * actually served, so a regression in Helmet config is caught before deploy.
 */

test.describe('security headers', () => {
    test('key security headers are present and x-powered-by is hidden', async ({ page }) => {
        const response = await page.goto('/');
        const headers = response!.headers();

        expect(headers['content-security-policy']).toBeTruthy();
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(headers['x-powered-by']).toBeUndefined();
    });
});
