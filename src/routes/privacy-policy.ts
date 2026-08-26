import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('privacy-policy.njk', {
        title: 'Privacy Policy — Norstar Inline Hockey Club',
        description:
            'How Norstar Inline Hockey Club collects, stores and protects the personal data of members, parents and website visitors.',
    });
});

export default router;
