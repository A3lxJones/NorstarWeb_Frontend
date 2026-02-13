import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('news.njk', {
        title: 'News — Norstar Inline Hockey',
    });
});

export default router;
