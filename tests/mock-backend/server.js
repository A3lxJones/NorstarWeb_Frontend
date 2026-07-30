/**
 * Mock backend API for Playwright E2E tests.
 *
 * The frontend server talks to the backend API server-side (Node fetch),
 * so browser-level request mocking cannot intercept those calls. Instead we
 * run this tiny stand-in backend on the same port the app expects (API_URL)
 * and return canned, deterministic responses.
 *
 * The user's role is derived from the login email prefix, e.g.
 *   parent@test.com  -> role "parent"
 *   coach@test.com   -> role "coach"
 *   admin@test.com   -> role "admin"
 * and encoded into the returned access token (`token-<role>`) so that
 * subsequent authenticated calls can recover it.
 *
 * This file is intentionally plain CommonJS JavaScript so it needs no build step.
 */

const express = require('express');

const app = express();
app.use(express.json());

const PORT = Number(process.env.MOCK_API_PORT || 3000);

const VALID_ROLES = ['parent', 'coach', 'admin'];

/** Derive a role from a login email address. Defaults to "parent". */
function roleFromEmail(email) {
    const prefix = String(email || '').split('@')[0].toLowerCase();
    return VALID_ROLES.includes(prefix) ? prefix : 'parent';
}

/** Recover the role from a `token-<role>` access token. */
function roleFromToken(req) {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    const role = token.replace(/^token-/, '');
    return VALID_ROLES.includes(role) ? role : 'parent';
}

function userForRole(role) {
    return {
        id: `${role}-id-123`,
        email: `${role}@test.com`,
        role,
        full_name: `Test ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
    };
}

// ─── Health check (used by Playwright's webServer readiness probe) ───
app.get('/', (_req, res) => {
    res.json({ success: true, message: 'mock backend up' });
});

// ─── Auth ───────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};

    // Simulate an invalid credential path for a specific test account.
    if (!email || !password || email === 'wrong@test.com') {
        res.json({ success: false, error: 'Invalid email or password.' });
        return;
    }

    const role = roleFromEmail(email);
    res.json({
        success: true,
        data: {
            accessToken: `token-${role}`,
            refreshToken: `refresh-${role}`,
            user: userForRole(role),
        },
    });
});

app.post('/api/auth/signup', (_req, res) => {
    res.json({ success: true, data: { userId: 'new-user-id' } });
});

app.get('/api/auth/me', (req, res) => {
    res.json({ success: true, data: userForRole(roleFromToken(req)) });
});

app.post('/api/auth/forgot-password', (_req, res) => {
    res.json({ success: true, data: { message: 'Reset email sent.' } });
});

// ─── Dashboard (object payload) ─────────────────────────────
app.get('/api/dashboard', (_req, res) => {
    res.json({
        success: true,
        data: {
            children: [],
            teams: [],
            registrations: [],
            pendingRegistrations: [],
            upcomingGames: [],
            games: [],
        },
    });
});

// ─── Catch-all: every other API endpoint returns an empty list ──
// Frontend routes defensively fall back to [] / {}, so empty but
// successful responses render the pages without errors.
app.all(/^\/api\/.*/, (_req, res) => {
    res.json({ success: true, data: [] });
});

const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Mock backend API listening on http://localhost:${PORT}`);
});

// Allow a clean shutdown when Playwright tears the server down.
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
