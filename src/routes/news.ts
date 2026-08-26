import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('news.njk', {
        title: 'Club News & Match Reports — Norstar Inline Hockey, Ballymena',
        description:
            'The latest news, match reports and announcements from Norstar Inline Hockey Club in Ballymena — registration dates, results and coaching updates.',
        keywords:
            'Norstar inline hockey news, Ballymena hockey results, inline hockey Northern Ireland, youth hockey match reports',
        ogImage: '/images/NorstarTeams3.png',
        ogImageAlt: 'Norstar Inline Hockey Club team photo',
    });
});

export default router;
