import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('learn-to-skate.njk', {
        title: 'Learn to Skate Programme — Norstar Inline Hockey, Ballymena',
        description:
            'Learn to Skate with Norstar Inline Hockey Club in Ballymena. Beginner-friendly inline skating sessions for children — no experience needed, coming soon to Co. Antrim.',
        keywords:
            'learn to skate Ballymena, inline skating lessons Northern Ireland, kids skating classes Co. Antrim, beginner inline hockey',
        ogImage: '/images/NorstarTeam5.png',
        ogImageAlt: 'Young skaters learning to skate with Norstar Inline Hockey Club',
    });
});

export default router;
