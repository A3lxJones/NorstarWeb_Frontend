import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { apiRequest } from '../utils/api';

const router = Router();

// All team management routes require auth
router.use(requireAuth);

// ─── GET /dashboard/teams — list all teams ──────────────────

router.get('/', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const user = req.session.user!;
    const viewAsRole = user.role === 'admin' ? req.session.viewAsRole : undefined;

    try {
        const result = await apiRequest<unknown[]>('/api/teams', { token, viewAsRole });

        res.render('dashboard/teams/index.njk', {
            title: 'Teams — Norstar',
            teams: result.data || [],
            canCreate: ['admin', 'coach'].includes(user.role),
            isImpersonating: user.role === 'admin' && !!viewAsRole,
            viewAsRole: viewAsRole || null,
            realRole: user.role,
        });
    } catch (error) {
        console.error('Teams list error:', error);
        res.render('dashboard/teams/index.njk', {
            title: 'Teams — Norstar',
            teams: [],
            error: 'Unable to load teams.',
            canCreate: false,
            isImpersonating: false,
            viewAsRole: null,
            realRole: user.role,
        });
    }
});

// ─── GET /dashboard/teams/create — show create form ─────────

router.get(
    '/create',
    requireRole('admin', 'coach'),
    (_req: Request, res: Response) => {
        res.render('dashboard/teams/create.njk', {
            title: 'Create Team — Norstar',
            error: null,
            values: {},
        });
    }
);

// ─── POST /dashboard/teams/create — submit new team ─────────

router.post(
    '/create',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const { name, age_group, max_players } = req.body;
        const token = req.session.accessToken!;
        const values = { name, age_group, max_players };

        if (!name || !age_group) {
            res.render('dashboard/teams/create.njk', {
                title: 'Create Team — Norstar',
                error: 'Team name and age group are required.',
                values,
            });
            return;
        }

        const result = await apiRequest<unknown>('/api/teams', {
            method: 'POST',
            token,
            body: {
                name,
                age_group,
                ...(max_players ? { max_players: parseInt(max_players, 10) } : {}),
            },
        });

        if (!result.success) {
            res.render('dashboard/teams/create.njk', {
                title: 'Create Team — Norstar',
                error: result.error || 'Failed to create team.',
                values,
            });
            return;
        }

        res.redirect('/dashboard/teams');
    }
);

// ─── GET /dashboard/teams/:id — team detail ─────────────────

router.get('/:id', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const teamId = req.params.id;

    try {
        const result = await apiRequest<Record<string, unknown>>(`/api/teams/${teamId}`, { token });

        if (!result.success || !result.data) {
            res.status(404).render('404.njk', { title: 'Team Not Found' });
            return;
        }

        // Fetch pending registrations if coach/admin
        let pendingRegistrations: unknown[] = [];
        if (['admin', 'coach'].includes(req.session.user!.role)) {
            // The members list from the backend only includes approved ones.
            // For pending registrations we'd need a separate query — for now
            // we pass what the backend gives us.
        }

        res.render('dashboard/teams/detail.njk', {
            title: `${(result.data as Record<string, unknown>).name} — Norstar`,
            team: result.data,
            canEdit: ['admin', 'coach'].includes(req.session.user!.role),
            pendingRegistrations,
        });
    } catch (error) {
        console.error('Team detail error:', error);
        res.status(500).render('404.njk', { title: 'Error Loading Team' });
    }
});

// ─── GET /dashboard/teams/:id/edit — show edit form ─────────

router.get(
    '/:id/edit',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const teamId = req.params.id;

        const result = await apiRequest<Record<string, unknown>>(`/api/teams/${teamId}`, { token });

        if (!result.success || !result.data) {
            res.status(404).render('404.njk', { title: 'Team Not Found' });
            return;
        }

        res.render('dashboard/teams/edit.njk', {
            title: `Edit ${(result.data as Record<string, unknown>).name} — Norstar`,
            error: null,
            values: result.data,
            teamId,
        });
    }
);

// ─── POST /dashboard/teams/:id/edit — update team ───────────

router.post(
    '/:id/edit',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const { name, age_group, max_players } = req.body;
        const token = req.session.accessToken!;
        const teamId = req.params.id;
        const values = { name, age_group, max_players };

        if (!name || !age_group) {
            res.render('dashboard/teams/edit.njk', {
                title: 'Edit Team — Norstar',
                error: 'Team name and age group are required.',
                values,
                teamId,
            });
            return;
        }

        const result = await apiRequest<unknown>(`/api/teams/${teamId}`, {
            method: 'PUT',
            token,
            body: {
                name,
                age_group,
                ...(max_players ? { max_players: parseInt(max_players, 10) } : {}),
            },
        });

        if (!result.success) {
            res.render('dashboard/teams/edit.njk', {
                title: 'Edit Team — Norstar',
                error: result.error || 'Failed to update team.',
                values,
                teamId,
            });
            return;
        }

        res.redirect(`/dashboard/teams/${teamId}`);
    }
);

// ─── POST /dashboard/teams/:id/delete — delete team ─────────

router.post(
    '/:id/delete',
    requireRole('admin'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const teamId = req.params.id;

        await apiRequest<unknown>(`/api/teams/${teamId}`, {
            method: 'DELETE',
            token,
        });

        res.redirect('/dashboard/teams');
    }
);

export default router;
