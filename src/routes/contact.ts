import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('contact.njk', {
        title: 'Contact Us — Norstar Inline Hockey',
    });
});

export default router;
