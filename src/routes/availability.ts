import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { apiRequest } from '../utils/api';

const router = Router();

// All availability routes require authentication
router.use(requireAuth);

// ─── Interfaces ─────────────────────────────────────────────

interface Team {
    id: string;
    name: string;
    age_group: string;
}

interface AvailabilityRequest {
    id: string;
    team_id: string;
    team_name?: string;
    request_type: string;
    custom_request_type?: string;
    event_date: string;
    title: string;
    notes?: string;
    deadline?: string;
    created_at: string;
    response_summary?: {
        available: number;
        unavailable: number;
        tentative: number;
        pending: number;
    };
}

interface AvailabilityResponse {
    id: string;
    availability_request_id: string;
    child_id: string;
    child_name?: string;
    status: 'available' | 'unavailable' | 'tentative';
    responded_at: string;
    parent_name?: string;
}

interface PendingMember {
    child_id: string;
    child_name: string;
    parent_name?: string;
}

// ─── COACH/ADMIN: GET /dashboard/availability — list requests ──

router.get(
    '/',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const viewAsRole =
            req.session.user!.role === 'admin'
                ? req.session.viewAsRole
                : undefined;

        try {
            const result = await apiRequest<AvailabilityRequest[]>(
                '/api/availability-requests',
                { token, viewAsRole }
            );

            res.render('dashboard/availability/index.njk', {
                title: 'Availability Requests — Norstar',
                requests: result.data || [],
                isImpersonating:
                    req.session.user!.role === 'admin' && !!viewAsRole,
                realRole: req.session.user!.role,
                viewAsRole: viewAsRole || null,
            });
        } catch (error) {
            console.error('Availability list error:', error);
            res.render('dashboard/availability/index.njk', {
                title: 'Availability Requests — Norstar',
                requests: [],
                error: 'Unable to load availability requests.',
                isImpersonating: false,
                realRole: req.session.user!.role,
                viewAsRole: null,
            });
        }
    }
);

// ─── COACH/ADMIN: GET /dashboard/availability/create — show form ──

router.get(
    '/create',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const viewAsRole =
            req.session.user!.role === 'admin'
                ? req.session.viewAsRole
                : undefined;

        try {
            // Fetch coach's teams for the dropdown
            const teamsResult = await apiRequest<Team[]>('/api/teams', {
                token,
                viewAsRole,
            });

            res.render('dashboard/availability/create.njk', {
                title: 'Create Availability Request — Norstar',
                teams: teamsResult.data || [],
                error: null,
                values: {},
            });
        } catch (error) {
            console.error('Availability create form error:', error);
            res.render('dashboard/availability/create.njk', {
                title: 'Create Availability Request — Norstar',
                teams: [],
                error: 'Unable to load teams.',
                values: {},
            });
        }
    }
);

// ─── COACH/ADMIN: POST /dashboard/availability/create — submit ──

router.post(
    '/create',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const {
            team_id,
            request_type,
            custom_request_type,
            event_date,
            title,
            notes,
            deadline,
            website, // honeypot
        } = req.body;
        const token = req.session.accessToken!;
        const viewAsRole =
            req.session.user!.role === 'admin'
                ? req.session.viewAsRole
                : undefined;

        const values = {
            team_id,
            request_type,
            custom_request_type,
            event_date,
            title,
            notes,
            deadline,
        };

        // Honeypot check
        if (website) {
            res.redirect('/dashboard/availability');
            return;
        }

        // Server-side validation
        if (!team_id || !request_type || !event_date || !title) {
            const teamsResult = await apiRequest<Team[]>('/api/teams', {
                token,
                viewAsRole,
            });
            res.render('dashboard/availability/create.njk', {
                title: 'Create Availability Request — Norstar',
                teams: teamsResult.data || [],
                error: 'Please fill in all required fields.',
                values,
            });
            return;
        }

        if (request_type === 'other' && !custom_request_type) {
            const teamsResult = await apiRequest<Team[]>('/api/teams', {
                token,
                viewAsRole,
            });
            res.render('dashboard/availability/create.njk', {
                title: 'Create Availability Request — Norstar',
                teams: teamsResult.data || [],
                error: 'Please specify the event type.',
                values,
            });
            return;
        }

        try {
            const result = await apiRequest<AvailabilityRequest>(
                '/api/availability-requests',
                {
                    method: 'POST',
                    token,
                    viewAsRole,
                    body: {
                        team_id,
                        request_type,
                        custom_request_type:
                            request_type === 'other'
                                ? custom_request_type
                                : undefined,
                        event_date,
                        title,
                        notes: notes || undefined,
                        deadline: deadline || undefined,
                    },
                }
            );

            if (!result.success) {
                const teamsResult = await apiRequest<Team[]>('/api/teams', {
                    token,
                    viewAsRole,
                });
                res.render('dashboard/availability/create.njk', {
                    title: 'Create Availability Request — Norstar',
                    teams: teamsResult.data || [],
                    error:
                        result.error ||
                        'Failed to create availability request.',
                    values,
                });
                return;
            }

            res.redirect('/dashboard/availability');
        } catch (error) {
            console.error('Availability create error:', error);
            const teamsResult = await apiRequest<Team[]>('/api/teams', {
                token,
                viewAsRole,
            });
            res.render('dashboard/availability/create.njk', {
                title: 'Create Availability Request — Norstar',
                teams: teamsResult.data || [],
                error: 'An unexpected error occurred.',
                values,
            });
        }
    }
);

// ─── COACH/ADMIN: GET /dashboard/availability/:id — view responses ──

router.get(
    '/:id',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const requestId = req.params.id;
        const viewAsRole =
            req.session.user!.role === 'admin'
                ? req.session.viewAsRole
                : undefined;

        try {
            const result = await apiRequest<
                AvailabilityRequest & {
                    team?: { id: string; name: string; age_group: string };
                    responses: AvailabilityResponse[];
                    pending_members?: PendingMember[];
                }
            >(`/api/availability-requests/${requestId}`, {
                token,
                viewAsRole,
            });

            if (!result.success || !result.data) {
                console.error(
                    'Availability detail — API returned:',
                    result.error || 'no data'
                );
                res.status(404).render('404.njk', {
                    title: 'Request Not Found',
                });
                return;
            }

            // The API returns a flat object: request fields + responses + pending_members
            const {
                responses: rawResponses,
                pending_members: rawPending,
                team,
                ...requestData
            } = result.data;

            const responses = rawResponses || [];
            const pendingMembers = rawPending || [];

            // Normalise team_name from the joined team relation
            const request = {
                ...requestData,
                team_name:
                    (team as { name?: string } | undefined)?.name ||
                    requestData.team_name,
                // Compute response summary since the detail endpoint doesn't include it
                response_summary: {
                    available: responses.filter(
                        (r: AvailabilityResponse) => r.status === 'available'
                    ).length,
                    unavailable: responses.filter(
                        (r: AvailabilityResponse) => r.status === 'unavailable'
                    ).length,
                    tentative: responses.filter(
                        (r: AvailabilityResponse) => r.status === 'tentative'
                    ).length,
                    pending: pendingMembers.length,
                },
            };

            // Normalise response child names for the template
            const normalisedResponses = responses.map((r: any) => ({
                ...r,
                child_name: r.child
                    ? `${r.child.first_name} ${r.child.last_name}`
                    : r.child_name || 'Unknown',
                parent_name: r.parent_name || '—',
            }));

            // Normalise pending member names
            const normalisedPending = pendingMembers.map((m: any) => ({
                ...m,
                child_name: m.first_name
                    ? `${m.first_name} ${m.last_name}`
                    : m.child_name || 'Unknown',
            }));

            res.render('dashboard/availability/detail.njk', {
                title: `${request.title} — Norstar`,
                request,
                responses: normalisedResponses,
                pendingMembers: normalisedPending,
                isImpersonating:
                    req.session.user!.role === 'admin' && !!viewAsRole,
                realRole: req.session.user!.role,
                viewAsRole: viewAsRole || null,
            });
        } catch (error) {
            console.error('Availability detail error:', error);
            res.status(500).render('404.njk', {
                title: 'Error Loading Request',
            });
        }
    }
);

// ─── COACH/ADMIN: POST /dashboard/availability/:id/delete — remove ──

router.post(
    '/:id/delete',
    requireRole('admin', 'coach'),
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const requestId = req.params.id;
        const viewAsRole =
            req.session.user!.role === 'admin'
                ? req.session.viewAsRole
                : undefined;

        await apiRequest<unknown>(`/api/availability-requests/${requestId}`, {
            method: 'DELETE',
            token,
            viewAsRole,
        });

        res.redirect('/dashboard/availability');
    }
);

// ─── PARENT: POST /dashboard/availability/:id/respond — submit response ──

router.post(
    '/:id/respond',
    async (req: Request, res: Response) => {
        const { child_id, status, website } = req.body;
        const token = req.session.accessToken!;
        const requestId = req.params.id;

        // Honeypot check
        if (website) {
            res.redirect('/dashboard');
            return;
        }

        if (
            !child_id ||
            !status ||
            !['available', 'unavailable', 'tentative'].includes(status)
        ) {
            res.redirect('/dashboard');
            return;
        }

        try {
            await apiRequest<unknown>(
                `/api/availability-requests/${requestId}/respond`,
                {
                    method: 'POST',
                    token,
                    body: { child_id, status },
                }
            );
        } catch (error) {
            console.error('Availability respond error:', error);
        }

        res.redirect('/dashboard');
    }
);

export default router;
