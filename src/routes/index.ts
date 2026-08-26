import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.render('home.njk', {
        title: 'Norstar Inline Hockey Club — Youth Inline Hockey in Ballymena, NI',
        description:
            "Norstar Inline Hockey Club is Ballymena's home of inline hockey. Junior U12/U14 teams and Learn to Skate sessions at Ballymena North Centre, Co. Antrim. New players always welcome.",
        keywords:
            'inline hockey Ballymena, inline hockey Northern Ireland, youth hockey club Co. Antrim, learn to skate Ballymena, U12 U14 hockey, roller hockey Northern Ireland',
        ogImage: '/images/NorstarTeams.png',
        ogImageAlt: 'Norstar Inline Hockey Club junior team in Ballymena',
        heroTitle: 'NORSTAR INLINE HOCKEY',
        heroSubtitle: 'Ballymena\'s home of inline hockey',
        heroCta: 'Join Us Today',
        programs: [
            {
                name: 'Junior U12/U14',
                description: 'Competitive inline hockey for our U12 and U14 players. Develop skills, teamwork, and a love for the game.',
                icon: '🏒',
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
                title: 'U14s Win Regional Cup',
                date: '05 Feb 2026',
                excerpt: 'Our Junior U14 team claimed victory at the regional cup with an outstanding performance.',
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
