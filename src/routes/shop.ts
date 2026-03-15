import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('shop.njk', {
        title: 'Shop — Norstar Inline Hockey',
    });
});

export default router;
