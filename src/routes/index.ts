import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('home.njk', {
        title: 'Norstar Inline Hockey Club — Ballymena',
        heroTitle: 'NORSTAR INLINE HOCKEY',
        heroSubtitle: 'Ballymena\'s home of inline hockey',
        heroCta: 'Join Us Today',
        programs: [
            {
                name: 'Junior U13',
                description: 'Competitive inline hockey for players under 13. Develop skills, teamwork, and a love for the game.',
                icon: '🏒',
            },
            {
                name: 'Learn to Play',
                description: 'New to hockey? Our structured programme takes you from beginner to confident player.',
                icon: '🎯',
            },
            {
                name: 'Learn to Skate',
                description: 'Master the fundamentals of inline skating in a fun, supportive environment.',
                icon: '⛸️',
            },
        ],
        news: [
            {
                title: 'Season Registration Now Open',
                date: '10 Feb 2026',
                excerpt: 'Registration for the upcoming spring season is now open. Secure your spot today!',
            },
            {
                title: 'U13s Win Regional Cup',
                date: '05 Feb 2026',
                excerpt: 'Our Junior U13 team claimed victory at the regional cup with an outstanding performance.',
            },
            {
                title: 'New Coaching Staff Announced',
                date: '28 Jan 2026',
                excerpt: 'We are excited to welcome new coaches to the Norstar family for the 2026 season.',
            },
        ],
    });
});

export default router;
