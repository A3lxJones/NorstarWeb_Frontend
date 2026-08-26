import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('contact.njk', {
        title: 'Contact Us — Norstar Inline Hockey Club, Ballymena',
        description:
            'Get in touch with Norstar Inline Hockey Club. We train at Ballymena North Centre, Co. Antrim every Saturday 13:30–16:30. Email us to book a taster session.',
        keywords:
            'contact Norstar inline hockey, Ballymena North Centre hockey, join inline hockey Ballymena, youth hockey taster session',
        ogImage: '/images/NortstarTeams2.png',
        ogImageAlt: 'Norstar Inline Hockey Club players at Ballymena North Centre',
    });
});

export default router;
