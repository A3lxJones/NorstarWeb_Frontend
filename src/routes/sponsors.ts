import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('sponsors.njk', {
        title: 'Sponsorship & Partners — Norstar Inline Hockey, Ballymena',
        description:
            'Partner with Norstar Inline Hockey Club in Ballymena and support youth inline hockey in Northern Ireland. Sponsorship packages for local businesses.',
        keywords:
            'sponsor youth sport Ballymena, hockey club sponsorship Northern Ireland, local business sponsorship Co. Antrim',
        ogImage: '/images/NorstarTeam4.png',
        ogImageAlt: 'Norstar Inline Hockey Club squad',
    });
});

export default router;
