import { Router, Request, Response } from 'express';
import { login } from '../utils/api';

const router = Router();

// GET /login — show the login page
router.get('/', (req: Request, res: Response) => {
    // If already logged in, redirect to dashboard
    if (req.session?.user) {
        res.redirect('/dashboard');
        return;
    }

    res.render('login.njk', {
        title: 'Login — Norstar Inline Hockey',
        error: null,
    });
});

// POST /login — authenticate with the backend API
router.post('/', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Honeypot check (anti-bot)
    if (req.body.website) {
        res.redirect('/login');
        return;
    }

    if (!email || !password) {
        res.render('login.njk', {
            title: 'Login — Norstar Inline Hockey',
            error: 'Please enter your email and password.',
        });
        return;
    }

    const result = await login(email, password);

    if (!result.success || !result.data) {
        res.render('login.njk', {
            title: 'Login — Norstar Inline Hockey',
            error: result.error || 'Invalid email or password.',
            email, // Keep the email field filled
        });
        return;
    }

    // Store tokens and user in server-side session
    req.session.accessToken = result.data.accessToken;
    req.session.refreshToken = result.data.refreshToken;
    req.session.user = {
        id: result.data.user.id,
        email: result.data.user.email,
        role: result.data.user.role,
    };

    // Redirect to dashboard
    res.redirect('/dashboard');
});

export default router;
