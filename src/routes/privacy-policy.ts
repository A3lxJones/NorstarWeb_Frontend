import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('privacy-policy.njk', {
        title: 'Privacy Policy — Norstar Inline Hockey',
    });
});

export default router;
