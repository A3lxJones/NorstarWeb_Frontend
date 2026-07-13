import { test, expect, Page } from '@playwright/test';

/**
 * Authenticated flow tests.
 *
 * These exercise pages behind the auth guard by logging in through the real
 * login form. A mock backend (tests/mock-backend/server.js) stands in for the
 * API and returns a role based on the email prefix used to sign in.
 */

/** Log in via the login form as the given role. Leaves the browser on /dashboard. */
async function loginAs(page: Page, role: 'parent' | 'coach' | 'admin'): Promise<void> {
    await page.goto('/login');
    const form = page.locator('form', { has: page.locator('#login-email') });
    await form.locator('#login-email').fill(`${role}@test.com`);
    await form.locator('#login-password').fill('password123');
    await form.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('login', () => {
    test('invalid credentials show an error and stay on /login', async ({ page }) => {
        await page.goto('/login');
        const form = page.locator('form', { has: page.locator('#login-email') });
        await form.locator('#login-email').fill('wrong@test.com');
        await form.locator('#login-password').fill('password123');
        await form.getByRole('button', { name: /sign in/i }).click();

        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    });
});

test.describe('role-based dashboards', () => {
    test('parent sees the parent dashboard', async ({ page }) => {
        await loginAs(page, 'parent');
        await expect(
            page.getByText(/manage your children's inline hockey activities/i)
        ).toBeVisible();
    });

    test('coach sees the coach dashboard', async ({ page }) => {
        await loginAs(page, 'coach');
        await expect(page.getByText(/welcome back coach \/ team manager/i)).toBeVisible();
    });

    test('admin sees the admin dashboard', async ({ page }) => {
        await loginAs(page, 'admin');
        await expect(page.getByText(/welcome back, administrator/i)).toBeVisible();
    });
});

test.describe('authenticated pages', () => {
    test('logged-in user can view /fixtures (no redirect)', async ({ page }) => {
        await loginAs(page, 'parent');
        const response = await page.goto('/fixtures');

        expect(response!.status()).toBe(200);
        await expect(page).toHaveURL(/\/fixtures$/);
        await expect(page).toHaveTitle(/fixtures/i);
    });

    test('logged-in user can view the teams page', async ({ page }) => {
        await loginAs(page, 'coach');
        const response = await page.goto('/dashboard/teams');

        expect(response!.status()).toBe(200);
        await expect(page).toHaveURL(/\/dashboard\/teams$/);
        await expect(page).toHaveTitle(/teams/i);
    });

    test('parent can open the add-child form', async ({ page }) => {
        await loginAs(page, 'parent');
        const response = await page.goto('/dashboard/children/add');

        expect(response!.status()).toBe(200);
        await expect(page).toHaveTitle(/add child/i);
    });
});

test.describe('logout', () => {
    test('logging out clears the session and re-locks protected routes', async ({ page }) => {
        await loginAs(page, 'parent');

        // GET /logout is supported for convenience and destroys the session.
        await page.goto('/logout');
        await expect(page).toHaveURL(/\/$/);

        // Protected route should now redirect back to /login.
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login$/);
    });
});
