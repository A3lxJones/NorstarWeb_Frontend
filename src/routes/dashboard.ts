import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { apiRequest } from '../utils/api';

const router = Router();

// All dashboard routes require authentication
router.use(requireAuth);

// ─── POST /dashboard/switch-role — admin impersonation toggle ───
router.post(
    '/switch-role',
    requireRole('admin'),
    (req: Request, res: Response) => {
        const { role } = req.body;

        if (role && ['parent', 'coach'].includes(role)) {
            req.session.viewAsRole = role;
        } else {
            // Clear impersonation — go back to admin view
            delete req.session.viewAsRole;
        }

        res.redirect('/dashboard');
    }
);

// ─── GET /dashboard — role-based dashboard ──────────────────
router.get('/', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const user = req.session.user!;
    const isAdmin = user.role === 'admin';
    const viewAsRole = isAdmin ? req.session.viewAsRole : undefined;
    const effectiveRole = viewAsRole || user.role;
    const isImpersonating = isAdmin && !!viewAsRole;

    try {
        // Call the backend dashboard endpoint, passing X-View-As-Role if impersonating
        const dashboardRes = await apiRequest<Record<string, unknown>>('/api/dashboard', {
            token,
            viewAsRole,
        });

        const dashData = dashboardRes.data || {};

        if (effectiveRole === 'parent') {
            res.render('dashboard/parent.njk', {
                title: 'My Dashboard — Norstar',
                children: dashData.children || [],
                registrations: dashData.registrations || [],
                upcomingGames: dashData.upcomingGames || [],
                isImpersonating,
                realRole: user.role,
                viewAsRole: viewAsRole || null,
            });
        } else if (effectiveRole === 'coach') {
            res.render('dashboard/coach.njk', {
                title: 'Coach Dashboard — Norstar',
                teams: dashData.teams || [],
                pendingRegistrations: dashData.pendingRegistrations || [],
                games: dashData.upcomingGames || dashData.games || [],
                isImpersonating,
                realRole: user.role,
                viewAsRole: viewAsRole || null,
            });
        } else if (effectiveRole === 'admin') {
            res.render('dashboard/admin.njk', {
                title: 'Admin Dashboard — Norstar',
                userCounts: dashData.userCounts || {},
                teams: dashData.teams || [],
                teamCount: dashData.teamCount || 0,
                games: dashData.upcomingGames || dashData.games || [],
                reports: dashData.recentReports || dashData.reports || [],
                isImpersonating: false,
                realRole: user.role,
                viewAsRole: null,
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
            isImpersonating: false,
            realRole: user.role,
            viewAsRole: null,
        });
    }
});

export default router;
