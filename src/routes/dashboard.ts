import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { apiRequest } from '../utils/api';

const router = Router();

// All dashboard routes require authentication
router.use(requireAuth);

// GET /dashboard — role-based dashboard
router.get('/', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const user = req.session.user!;

    try {
        if (user.role === 'parent') {
            // Fetch parent's children
            const childrenRes = await apiRequest<unknown[]>('/api/children', { token });
            res.render('dashboard/parent.njk', {
                title: 'My Dashboard — Norstar',
                children: childrenRes.data || [],
            });
        } else if (user.role === 'coach') {
            // Fetch teams and upcoming games
            const [teamsRes, gamesRes] = await Promise.all([
                apiRequest<unknown[]>('/api/teams', { token }),
                apiRequest<unknown[]>('/api/games?status=scheduled', { token }),
            ]);
            res.render('dashboard/coach.njk', {
                title: 'Coach Dashboard — Norstar',
                teams: teamsRes.data || [],
                games: gamesRes.data || [],
            });
        } else if (user.role === 'admin') {
            // Fetch overview data
            const [teamsRes, gamesRes, reportsRes] = await Promise.all([
                apiRequest<unknown[]>('/api/teams', { token }),
                apiRequest<unknown[]>('/api/games', { token }),
                apiRequest<unknown[]>('/api/reports', { token }),
            ]);
            res.render('dashboard/admin.njk', {
                title: 'Admin Dashboard — Norstar',
                teams: teamsRes.data || [],
                games: gamesRes.data || [],
                reports: reportsRes.data || [],
            });
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard/parent.njk', {
            title: 'Dashboard — Norstar',
            error: 'Unable to load dashboard data.',
            children: [],
        });
    }
});

export default router;
