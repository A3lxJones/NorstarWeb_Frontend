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
    const role = req.session.user!.role;

    try {
        const result = await apiRequest<Record<string, unknown>>(`/api/teams/${teamId}`, { token });

        if (!result.success || !result.data) {
            res.status(404).render('404.njk', { title: 'Team Not Found' });
            return;
        }

        // Fetch pending registrations for coach/admin
        let pendingRegistrations: unknown[] = [];
        if (['admin', 'coach'].includes(role)) {
            const pendingResult = await apiRequest<unknown[]>(
                `/api/teams/${teamId}/registrations?status=pending`,
                { token }
            );
            pendingRegistrations = pendingResult.data || [];
        }

        // For parents, fetch their children's registration statuses
        let myRegistrations: unknown[] = [];
        if (role === 'parent') {
            const regResult = await apiRequest<unknown[]>(
                `/api/teams/${teamId}/registrations/mine`,
                { token }
            );
            myRegistrations = regResult.data || [];
        }

        res.render('dashboard/teams/detail.njk', {
            title: `${(result.data as Record<string, unknown>).name} — Norstar`,
            team: result.data,
            canEdit: ['admin', 'coach'].includes(role),
            isParent: role === 'parent',
            pendingRegistrations,
            myRegistrations,
            success: req.query.success === 'approved' ? 'Registration approved successfully.'
                : req.query.success === 'rejected' ? 'Registration rejected.'
                    : null,
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

// ─── POST /dashboard/teams/:id/registrations/:regId/approve ─────────

router.post(
    '/:id/registrations/:regId/approve',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const { id: teamId, regId } = req.params;

        const result = await apiRequest<unknown>(
            `/api/teams/registrations/${regId}/approve`,
            { method: 'PATCH', token, body: { status: 'approved' } }
        );

        if (!result.success) {
            console.error('Approve registration error:', result.error);
        }

        res.redirect(`/dashboard/teams/${teamId}?success=approved`);
    }
);

// ─── POST /dashboard/teams/:id/registrations/:regId/reject ──────────

router.post(
    '/:id/registrations/:regId/reject',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const { id: teamId, regId } = req.params;

        const result = await apiRequest<unknown>(
            `/api/teams/registrations/${regId}/reject`,
            { method: 'PATCH', token, body: { status: 'rejected' } }
        );

        if (!result.success) {
            console.error('Reject registration error:', result.error);
        }

        res.redirect(`/dashboard/teams/${teamId}?success=rejected`);
    }
);

// ─── GET /dashboard/teams/:id/register — show register-child form ───

interface ChildSummary {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
}



router.get('/:id/register', requireAuth, async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const teamId = req.params.id;

    try {
        // Fetch team details and parent's children in parallel
        const [teamResult, childrenResult] = await Promise.all([
            apiRequest<Record<string, unknown>>(`/api/teams/${teamId}`, { token }),
            apiRequest<ChildSummary[]>('/api/children', { token }),
        ]);

        if (!teamResult.success || !teamResult.data) {
            res.status(404).render('404.njk', { title: 'Team Not Found' });
            return;
        }

        const children = childrenResult.data || [];

        // Find which children are already registered for this team
        const members = (teamResult.data as Record<string, unknown>).members as { child_id?: string; child?: { id: string } }[] || [];
        const registeredChildIds = new Set(
            members.map((m) => m.child?.id || m.child_id).filter(Boolean)
        );

        // Also check for pending registrations for this team
        // We need to check team_registrations — let's get all registrations for these children
        const availableChildren = children.filter((c) => !registeredChildIds.has(c.id));

        res.render('dashboard/teams/register.njk', {
            title: `Register for ${(teamResult.data as Record<string, unknown>).name} — Norstar`,
            team: teamResult.data,
            children: availableChildren,
            allChildren: children,
            registeredChildIds: Array.from(registeredChildIds),
            error: null,
            success: req.query.success === '1' ? 'Registration submitted successfully! It will be reviewed by the coach.' : null,
        });
    } catch (error) {
        console.error('Team register form error:', error);
        res.status(500).render('404.njk', { title: 'Error Loading Page' });
    }
});

// ─── POST /dashboard/teams/:id/register — submit registration ───

router.post('/:id/register', requireAuth, async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const teamId = req.params.id;
    const { child_id } = req.body;

    // Honeypot check
    if (req.body.website) {
        res.redirect('/dashboard');
        return;
    }

    if (!child_id) {
        // Re-render with error
        const [teamResult, childrenResult] = await Promise.all([
            apiRequest<Record<string, unknown>>(`/api/teams/${teamId}`, { token }),
            apiRequest<ChildSummary[]>('/api/children', { token }),
        ]);

        res.render('dashboard/teams/register.njk', {
            title: `Register for Team — Norstar`,
            team: teamResult.data || { id: teamId },
            children: childrenResult.data || [],
            allChildren: childrenResult.data || [],
            registeredChildIds: [],
            error: 'Please select a child to register.',
            success: null,
        });
        return;
    }

    const result = await apiRequest<unknown>(`/api/teams/${teamId}/register`, {
        method: 'POST',
        token,
        body: { child_id },
    });

    if (!result.success) {
        // Re-fetch and re-render with error
        const [teamResult, childrenResult] = await Promise.all([
            apiRequest<Record<string, unknown>>(`/api/teams/${teamId}`, { token }),
            apiRequest<ChildSummary[]>('/api/children', { token }),
        ]);

        const children = childrenResult.data || [];
        const members = ((teamResult.data as Record<string, unknown>)?.members as { child?: { id: string } }[]) || [];
        const registeredChildIds = new Set(members.map((m) => m.child?.id).filter(Boolean));
        const availableChildren = children.filter((c) => !registeredChildIds.has(c.id));

        res.render('dashboard/teams/register.njk', {
            title: `Register for Team — Norstar`,
            team: teamResult.data || { id: teamId },
            children: availableChildren,
            allChildren: children,
            registeredChildIds: Array.from(registeredChildIds),
            error: result.error || 'Failed to register. Please try again.',
            success: null,
        });
        return;
    }

    // Success — redirect back with success message (PRG pattern)
    res.redirect(`/dashboard/teams/${teamId}/register?success=1`);
});

export default router;
