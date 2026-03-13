import { Router, Request, Response } from 'express';
import { forgotPassword } from '../utils/api';

const router = Router();

const PASSWORD_RESET_REDIRECT_URL =
    process.env.PASSWORD_RESET_REDIRECT_URL || 'http://localhost:4000/reset-password';

// GET /forgot-password — show the "enter your email" form
router.get('/', (req: Request, res: Response) => {
    if (req.session?.accessToken) {
        res.redirect('/dashboard');
        return;
    }
    res.render('forgot-password.njk', { title: 'Forgot Password' });
});

// POST /forgot-password — ask the backend to send a reset email
router.post('/', async (req: Request, res: Response) => {
    const { email, website } = req.body as { email?: string; website?: string };

    // Honeypot check
    if (website) {
        res.render('forgot-password.njk', {
            title: 'Forgot Password',
            success: 'If an account with that email exists, a reset link has been sent.',
        });
        return;
    }

    if (!email || typeof email !== 'string' || email.length > 254) {
        res.render('forgot-password.njk', {
            title: 'Forgot Password',
            error: 'Please enter a valid email address.',
            email,
        });
        return;
    }

    try {
        await forgotPassword(email.trim(), PASSWORD_RESET_REDIRECT_URL);
    } catch {
        // swallow — never reveal whether an email exists
    }

    // Always show success to prevent email enumeration
    res.render('forgot-password.njk', {
        title: 'Forgot Password',
        success: 'If an account with that email exists, a reset link has been sent. Please check your inbox.',
    });
});

export default router;
