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

// ─── POST /dashboard/registration — parent registration form submission ───
router.post(
    '/registration',
    async (req: Request, res: Response) => {
        const token = req.session.accessToken!;
        const {
            player_email,
            player_name,
            player_dob,
            nominated_person_email,
            nominated_person_name,
            nominated_person_relationship,
            nominated_person_address,
            nominated_person_phone,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship,
            ice_hockey_experience,
            gp,
            medical_conditions,
            dietary_requirements,
            allergies,
            photo_permission,
            inform_club_secretary,
            medical_permission,
            emergency_hospital_treatment,
            policies_ack,
            parental_consent,
            other_medical,
            website,
        } = req.body as Record<string, any>;

        // Honeypot check
        if (website) {
            res.redirect('/dashboard');
            return;
        }

        // Basic validation
        if (!player_email || !player_name || !player_dob) {
            res.render('dashboard/parent.njk', {
                title: 'My Dashboard — Norstar',
                error: 'Please fill in player name, email and date of birth.',
                children: [],
                registrations: [],
                upcomingGames: [],
                availabilityRequests: [],
                isImpersonating: false,
                realRole: req.session.user!.role,
                viewAsRole: null,
            });
            return;
        }

        const body = {
            player_email,
            player_name,
            player_dob,
            nominated_person_email,
            nominated_person_name,
            nominated_person_relationship,
            nominated_person_address,
            nominated_person_phone,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship,
            ice_hockey_experience,
            gp,
            medical_conditions,
            dietary_requirements,
            allergies,
            photo_permission,
            inform_club_secretary,
            medical_permission,
            emergency_hospital_treatment,
            policies_ack,
            parental_consent,
            other_medical,
        };

        const result = await apiRequest('/api/registrations', { method: 'POST', token, body });

        if (!result.success) {
            res.render('dashboard/parent.njk', {
                title: 'My Dashboard — Norstar',
                error: result.error || 'Failed to submit registration. Please try again.',
                children: [],
                registrations: [],
                upcomingGames: [],
                availabilityRequests: [],
                isImpersonating: false,
                realRole: req.session.user!.role,
                viewAsRole: null,
            });
            return;
        }

        res.redirect('/dashboard?registered=1');
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
            // Fetch pending availability requests for this parent
            let availabilityRequests: unknown[] = [];
            try {
                const availRes = await apiRequest<unknown[]>(
                    '/api/availability-requests/pending',
                    { token, viewAsRole }
                );
                availabilityRequests = availRes.data || [];
            } catch {
                // Non-critical — continue without availability data
            }

            // Merge parent's children into each availability request and
            // look up any existing responses so the template shows the
            // current status instead of fresh buttons.
            const parentChildren = (dashData.children || []) as Array<Record<string, unknown>>;
            if (parentChildren.length > 0) {
                const enriched: unknown[] = [];
                for (const rawReq of availabilityRequests as Array<Record<string, unknown>>) {
                    // If the API already supplied children with status, keep them
                    if (rawReq.children && Array.isArray(rawReq.children) && (rawReq.children as unknown[]).length > 0) {
                        enriched.push(rawReq);
                        continue;
                    }

                    // Fetch existing responses for this request
                    let existingResponses: Array<Record<string, unknown>> = [];
                    try {
                        const detailRes = await apiRequest<Record<string, unknown>>(
                            `/api/availability-requests/${rawReq.id}`,
                            { token, viewAsRole }
                        );
                        if (detailRes.success && detailRes.data) {
                            existingResponses = (detailRes.data.responses || []) as Array<Record<string, unknown>>;
                        }
                    } catch {
                        // Continue without response data
                    }

                    // Build a child_id → status map from existing responses
                    const statusByChildId = new Map<string, string>();
                    for (const resp of existingResponses) {
                        if (resp.child_id) {
                            statusByChildId.set(String(resp.child_id), String(resp.status));
                        }
                    }

                    // Only include children who haven't already responded
                    const pendingChildren = parentChildren
                        .filter((child) => !statusByChildId.has(String(child.id)))
                        .map((child) => ({
                            id: child.id,
                            first_name: child.first_name,
                            last_name: child.last_name,
                            current_status: null,
                        }));

                    // If every child has responded, skip this request entirely
                    if (pendingChildren.length === 0) {
                        continue;
                    }

                    enriched.push({ ...rawReq, children: pendingChildren });
                }
                availabilityRequests = enriched;
            }

            res.render('dashboard/parent.njk', {
                title: 'My Dashboard — Norstar',
                children: dashData.children || [],
                registrations: dashData.registrations || [],
                upcomingGames: dashData.upcomingGames || [],
                availabilityRequests,
                isImpersonating,
                realRole: user.role,
                viewAsRole: viewAsRole || null,
            });
        } else if (effectiveRole === 'coach') {
            // Fetch availability request count for the coach
            let availabilityCount = 0;
            try {
                const availRes = await apiRequest<unknown[]>(
                    '/api/availability-requests',
                    { token, viewAsRole }
                );
                availabilityCount = (availRes.data || []).length;
            } catch {
                // Non-critical
            }

            // Fetch the coach's own children (coaches may also be parents)
            let coachChildren: Array<Record<string, unknown>> = [];
            try {
                const childrenRes = await apiRequest<Array<Record<string, unknown>>>(
                    '/api/children',
                    { token }
                );
                coachChildren = (childrenRes.data as Array<Record<string, unknown>>) || [];
            } catch {
                // Non-critical — coach may have no children
            }

            // Fetch pending availability requests for the coach's children
            let childAvailabilityRequests: unknown[] = [];
            if (coachChildren.length > 0) {
                try {
                    const availRes = await apiRequest<unknown[]>(
                        '/api/availability-requests/pending',
                        { token }
                    );
                    const pendingRequests = availRes.data || [];

                    // Enrich each request with child data and existing response status
                    const enriched: unknown[] = [];
                    for (const rawReq of pendingRequests as Array<Record<string, unknown>>) {
                        if (rawReq.children && Array.isArray(rawReq.children) && (rawReq.children as unknown[]).length > 0) {
                            enriched.push(rawReq);
                            continue;
                        }

                        let existingResponses: Array<Record<string, unknown>> = [];
                        try {
                            const detailRes = await apiRequest<Record<string, unknown>>(
                                `/api/availability-requests/${rawReq.id}`,
                                { token }
                            );
                            if (detailRes.success && detailRes.data) {
                                existingResponses = (detailRes.data.responses || []) as Array<Record<string, unknown>>;
                            }
                        } catch {
                            // Continue without response data
                        }

                        const statusByChildId = new Map<string, string>();
                        for (const resp of existingResponses) {
                            if (resp.child_id) {
                                statusByChildId.set(String(resp.child_id), String(resp.status));
                            }
                        }

                        const pendingChildren = coachChildren
                            .filter((child) => !statusByChildId.has(String(child.id)))
                            .map((child) => ({
                                id: child.id,
                                first_name: child.first_name,
                                last_name: child.last_name,
                                current_status: null,
                            }));

                        if (pendingChildren.length === 0) {
                            continue;
                        }

                        enriched.push({ ...rawReq, children: pendingChildren });
                    }
                    childAvailabilityRequests = enriched;
                } catch {
                    // Non-critical
                }
            }

            res.render('dashboard/coach.njk', {
                title: 'Coach / Team Manager Dashboard — Norstar',
                teams: dashData.teams || [],
                pendingRegistrations: dashData.pendingRegistrations || [],
                games: dashData.upcomingGames || dashData.games || [],
                availabilityCount,
                children: coachChildren,
                childAvailabilityRequests,
                registrations: dashData.registrations || [],
                isImpersonating,
                realRole: user.role,
                viewAsRole: viewAsRole || null,
            });
        } else if (effectiveRole === 'admin') {
            // Fetch children separately since /api/dashboard doesn't return them
            let children: unknown[] = [];
            try {
                const childrenRes = await apiRequest<unknown[]>(
                    '/api/admin/children',
                    { token }
                );
                const childrenPayload = childrenRes.data;
                children = Array.isArray(childrenPayload)
                    ? childrenPayload
                    : childrenPayload && typeof childrenPayload === 'object'
                        ? ((childrenPayload as Record<string, unknown>).data as unknown[]) ||
                        ((childrenPayload as Record<string, unknown>).children as unknown[]) ||
                        ((childrenPayload as Record<string, unknown>).items as unknown[]) ||
                        ((childrenPayload as Record<string, unknown>).rows as unknown[]) ||
                        []
                        : [];
            } catch (err) {
                console.warn('[Admin Dashboard] Failed to fetch children:', err);
                // Continue without children — non-critical
            }

            const playerCount = Number(children.length || 0);

            res.render('dashboard/admin.njk', {
                title: 'Admin Dashboard — Norstar',
                userCounts: dashData.userCounts || {},
                teams: dashData.teams || [],
                teamCount: dashData.teamCount || 0,
                playerCount,
                players: children,
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
