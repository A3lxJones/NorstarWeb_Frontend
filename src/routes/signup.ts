import { Router, Request, Response } from 'express';
import { signup, login } from '../utils/api';

const router = Router();

// GET /signup — show the registration form
router.get('/', (req: Request, res: Response) => {
    if (req.session?.user) {
        res.redirect('/dashboard');
        return;
    }

    res.render('signup.njk', {
        title: 'Sign Up — Norstar Inline Hockey',
        error: null,
        values: {},
    });
});

// POST /signup — create a new account via the backend API
router.post('/', async (req: Request, res: Response) => {
    const { full_name, email, password, confirm_password, phone } = req.body;

    // Honeypot check
    if (req.body.website) {
        res.redirect('/signup');
        return;
    }

    // Basic validation
    const values = { full_name, email, phone };

    if (!full_name || !email || !password) {
        res.render('signup.njk', {
            title: 'Sign Up — Norstar Inline Hockey',
            error: 'Please fill in all required fields.',
            values,
        });
        return;
    }

    if (password.length < 8) {
        res.render('signup.njk', {
            title: 'Sign Up — Norstar Inline Hockey',
            error: 'Password must be at least 8 characters.',
            values,
        });
        return;
    }

    if (password !== confirm_password) {
        res.render('signup.njk', {
            title: 'Sign Up — Norstar Inline Hockey',
            error: 'Passwords do not match.',
            values,
        });
        return;
    }

    // Call the backend signup API
    const result = await signup({ email, password, full_name, phone });

    if (!result.success) {
        res.render('signup.njk', {
            title: 'Sign Up — Norstar Inline Hockey',
            error: result.error || 'Registration failed. Please try again.',
            values,
        });
        return;
    }

    // Auto-login after successful signup
    const loginResult = await login(email, password);

    if (loginResult.success && loginResult.data) {
        req.session.accessToken = loginResult.data.accessToken;
        req.session.refreshToken = loginResult.data.refreshToken;
        req.session.user = {
            id: loginResult.data.user.id,
            email: loginResult.data.user.email,
            role: loginResult.data.user.role,
        };
        res.redirect('/dashboard');
        return;
    }

    // If auto-login fails, redirect to login page with success message
    res.render('login.njk', {
        title: 'Login — Norstar Inline Hockey',
        error: null,
        success: 'Account created! Please sign in.',
        email,
    });
});

export default router;
