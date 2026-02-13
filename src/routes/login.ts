import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('login.njk', {
        title: 'Login — Norstar Inline Hockey',
    });
});

export default router;
