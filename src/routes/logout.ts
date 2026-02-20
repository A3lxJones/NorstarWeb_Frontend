import { Router, Request, Response } from 'express';

const router = Router();

// POST /logout — destroy session and redirect to home
router.post('/', (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.clearCookie('norstar.sid');
        res.redirect('/');
    });
});

// GET /logout — also support GET for convenience
router.get('/', (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.clearCookie('norstar.sid');
        res.redirect('/');
    });
});

export default router;
