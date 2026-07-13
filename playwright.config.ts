import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Norstar Inline Hockey Club frontend.
 *
 * These end-to-end tests act as a production safety net: on every push /
 * pull request they build the app, start the server, and verify that the
 * public-facing pages still render and that protected routes stay locked.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

const PORT = Number(process.env.PORT ?? 4000);
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;
const MOCK_API_PORT = Number(process.env.MOCK_API_PORT ?? 3000);

export default defineConfig({
    testDir: './tests/e2e',
    // Fail the build on CI if test.only is accidentally left in the source.
    forbidOnly: !!process.env.CI,
    // Retry flaky tests on CI only.
    retries: process.env.CI ? 2 : 0,
    // Opt out of parallel workers on CI for more predictable resource usage.
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI
        ? [['github'], ['html', { open: 'never' }]]
        : [['list'], ['html', { open: 'never' }]],

    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    /**
     * Start both the mock backend API and the compiled frontend server before
     * the tests run. The mock backend stands in for the real API so that
     * authenticated flows (login, dashboards) can be exercised deterministically.
     *
     * NODE_ENV is intentionally NOT "production" so the server can start
     * without HTTPS-only session cookies over plain HTTP in CI.
     */
    webServer: [
        {
            command: 'node tests/mock-backend/server.js',
            url: `http://127.0.0.1:${MOCK_API_PORT}`,
            timeout: 30 * 1000,
            reuseExistingServer: !process.env.CI,
            env: {
                MOCK_API_PORT: String(MOCK_API_PORT),
            },
        },
        {
            command: 'npm run build && npm start',
            url: BASE_URL,
            timeout: 120 * 1000,
            reuseExistingServer: !process.env.CI,
            env: {
                NODE_ENV: 'test',
                PORT: String(PORT),
                API_URL: `http://127.0.0.1:${MOCK_API_PORT}`,
                SESSION_SECRET: process.env.SESSION_SECRET ?? 'norstar-e2e-test-secret',
            },
        },
    ],
});
