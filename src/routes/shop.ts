import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('shop.njk', {
        title: 'Club Shop — Norstar Inline Hockey Kit & Merchandise',
        description:
            'Official Norstar Inline Hockey Club shop — jerseys, training kit and club merchandise for players and supporters in Ballymena.',
        keywords:
            'Norstar hockey kit, inline hockey jersey Ballymena, club merchandise Northern Ireland',
    });
});

export default router;
