import { Router, Request, Response } from 'express';
import { resetPassword } from '../utils/api';

const router = Router();

// GET /reset-password — render the "set new password" form
// The access_token is in the URL hash (fragment) — client JS reads it.
router.get('/', (_req: Request, res: Response) => {
    res.render('reset-password.njk', { title: 'Reset Password' });
});

// POST /reset-password — call backend to update the password
router.post('/', async (req: Request, res: Response) => {
    const { access_token, password, confirm_password, website } = req.body as {
        access_token?: string;
        password?: string;
        confirm_password?: string;
        website?: string;
    };

    // Honeypot check
    if (website) {
        res.render('reset-password.njk', {
            title: 'Reset Password',
            error: 'Something went wrong. Please try again.',
        });
        return;
    }

    if (!access_token || typeof access_token !== 'string') {
        res.render('reset-password.njk', {
            title: 'Reset Password',
            error: 'Invalid or missing reset token. Please request a new reset link.',
        });
        return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
        res.render('reset-password.njk', {
            title: 'Reset Password',
            error: 'Password must be at least 8 characters.',
        });
        return;
    }

    if (password !== confirm_password) {
        res.render('reset-password.njk', {
            title: 'Reset Password',
            error: 'Passwords do not match.',
        });
        return;
    }

    try {
        const result = await resetPassword(access_token, password);

        if (!result.success) {
            res.render('reset-password.njk', {
                title: 'Reset Password',
                error: result.error || 'Failed to reset password. The link may have expired.',
            });
            return;
        }

        res.render('reset-password.njk', {
            title: 'Reset Password',
            success: 'Your password has been reset successfully. You can now sign in.',
        });
    } catch {
        res.render('reset-password.njk', {
            title: 'Reset Password',
            error: 'An unexpected error occurred. Please try again.',
        });
    }
});

export default router;
