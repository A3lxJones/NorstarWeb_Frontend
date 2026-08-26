import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { apiRequest } from '../utils/api';

const router = Router();

// All children routes require authentication
router.use(requireAuth);

// ─── ADMIN: GET /dashboard/children/all — list all children ─

interface ChildRecord {
    id: string;
    first_name: string;
    last_name: string;
    position?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    photo_consent?: boolean;
    created_at?: string;
    parent?: {
        id: string;
        full_name: string;
        email: string;
        phone?: string;
    };
}

router.get('/all', requireRole('admin'), async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const search = (req.query.search as string) || '';

    try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);

        const queryString = params.toString();
        const endpoint = `/api/admin/children${queryString ? `?${queryString}` : ''}`;

        const result = await apiRequest<
            ChildRecord[] |
            {
                data?: ChildRecord[];
                children?: ChildRecord[];
                items?: ChildRecord[];
                rows?: ChildRecord[];
            }
        >(endpoint, { token });

        const payload = result.data;
        const children = Array.isArray(payload)
            ? payload
            : payload?.data || payload?.children || payload?.items || payload?.rows || [];

        if (!Array.isArray(children)) {
            console.warn('Admin children payload was not an array-like shape:', payload);
        }

        res.render('dashboard/children/index.njk', {
            title: 'Registered Children — Norstar',
            children: Array.isArray(children) ? children : [],
            search,
        });
    } catch (error) {
        console.error('Admin children list error:', error);
        res.render('dashboard/children/index.njk', {
            title: 'Registered Children — Norstar',
            children: [],
            search,
            error: 'Failed to load children.',
        });
    }
});

// ─── ADMIN: GET /dashboard/children/all/:id — child detail ──

router.get('/all/:id', requireRole('admin'), async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const childId = req.params.id;

    try {
        const result = await apiRequest<ChildRecord>(
            `/api/admin/children/${childId}`,
            { token }
        );

        if (!result.success || !result.data) {
            res.status(404).render('404.njk', { title: 'Child Not Found' });
            return;
        }

        res.render('dashboard/children/view.njk', {
            title: `${result.data.first_name} ${result.data.last_name} — Norstar`,
            child: result.data,
            backUrl: '/dashboard/children/all',
            backLabel: 'Back to Children',
        });
    } catch (error) {
        console.error('Admin child detail error:', error);
        res.status(500).render('404.njk', { title: 'Error Loading Details' });
    }
});

// ─── COACH/ADMIN: GET /dashboard/children/roster — player info by team ─

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface TeamSummary {
    id: string;
    name: string;
    age_group: string;
}

interface RosterChild extends ChildRecord {
    emergency_contact_relationship?: string;
    medical_conditions?: string | null;
    allergies?: string | null;
}

router.get('/roster', requireRole('coach', 'admin'), async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const rawTeamId = (req.query.team as string) || '';
    const teamId = UUID_PATTERN.test(rawTeamId) ? rawTeamId : '';

    try {
        const [teamsResult, childrenResult] = await Promise.all([
            apiRequest<TeamSummary[]>('/api/teams', { token }),
            apiRequest<RosterChild[]>('/api/children', { token }),
        ]);

        const teams = teamsResult.data || [];
        let children = childrenResult.data || [];
        let selectedTeam: TeamSummary | undefined;

        if (teamId) {
            selectedTeam = teams.find((t) => t.id === teamId);

            const regsResult = await apiRequest<{ child?: { id: string } | null }[]>(
                `/api/teams/${teamId}/registrations?status=approved`,
                { token }
            );

            const memberIds = new Set(
                (regsResult.data || [])
                    .map((reg) => reg.child?.id)
                    .filter((id): id is string => Boolean(id))
            );

            children = children.filter((child) => memberIds.has(child.id));
        }

        res.render('dashboard/children/roster.njk', {
            title: 'Player Information — Norstar',
            teams,
            children,
            selectedTeamId: teamId,
            selectedTeam,
        });
    } catch (error) {
        console.error('Player roster error:', error);
        res.render('dashboard/children/roster.njk', {
            title: 'Player Information — Norstar',
            teams: [],
            children: [],
            selectedTeamId: '',
            error: 'Unable to load player information.',
        });
    }
});

// ─── GET /dashboard/children/add — show add-child form ──────

router.get('/add', (_req: Request, res: Response) => {
    res.render('dashboard/children/add.njk', {
        title: 'Add Child — Norstar',
        error: null,
        values: {},
    });
});

// ─── POST /dashboard/children/add — submit new child ────────

router.post('/add', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const {
        first_name,
        last_name,
        gender,
        position,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        medical_conditions,
        allergies,
        photo_consent,
    } = req.body;

    // Honeypot check
    if (req.body.website) {
        res.redirect('/dashboard');
        return;
    }

    const values = {
        first_name,
        last_name,
        gender,
        position,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        medical_conditions,
        allergies,
        photo_consent,
    };

    // Validation
    if (!first_name || !last_name) {
        res.render('dashboard/children/add.njk', {
            title: 'Add Child — Norstar',
            error: 'First name and last name are required.',
            values,
        });
        return;
    }

    if (!emergency_contact_name || !emergency_contact_phone || !emergency_contact_relationship) {
        res.render('dashboard/children/add.njk', {
            title: 'Add Child — Norstar',
            error: 'All emergency contact details are required (name, phone, and relationship).',
            values,
        });
        return;
    }

    if (!medical_conditions?.trim() || !allergies?.trim()) {
        res.render('dashboard/children/add.njk', {
            title: 'Add Child — Norstar',
            error: 'Medical conditions and allergies are required — enter "NA" if there are none.',
            values,
        });
        return;
    }

    const result = await apiRequest<{ id: string }>('/api/children', {
        method: 'POST',
        token,
        body: {
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            gender: gender || undefined,
            position: position || undefined,
            emergency_contact_name: emergency_contact_name.trim(),
            emergency_contact_phone: emergency_contact_phone.trim(),
            emergency_contact_relationship,
            medical_conditions: medical_conditions.trim(),
            allergies: allergies.trim(),
            photo_consent: photo_consent === 'on',
        },
    });

    if (!result.success) {
        res.render('dashboard/children/add.njk', {
            title: 'Add Child — Norstar',
            error: result.error || 'Failed to add child. Please try again.',
            values,
        });
        return;
    }

    res.redirect('/dashboard');
});

// ─── GET /dashboard/children/:id — view child detail ────────

router.get('/:id', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const childId = req.params.id;

    try {
        // Fetch child details and their team registrations in parallel
        const [result, regsResult, teamsResult] = await Promise.all([
            apiRequest<Record<string, unknown>>(
                `/api/children/${childId}`,
                { token }
            ),
            apiRequest<{ id: string; team_id: string; status: string; team: { id: string; name: string; age_group: string } }[]>(
                `/api/children/${childId}/registrations`,
                { token }
            ),
            apiRequest<{ id: string; name: string; age_group: string }[]>(
                '/api/teams',
                { token }
            ),
        ]);

        if (!result.success || !result.data) {
            res.status(404).render('404.njk', { title: 'Child Not Found' });
            return;
        }

        const registrations = regsResult.data || [];
        const registeredTeamIds = new Set(registrations.map((r) => r.team_id));
        const availableTeams = (teamsResult.data || []).filter((t) => !registeredTeamIds.has(t.id));

        res.render('dashboard/children/detail.njk', {
            title: `${result.data.first_name} ${result.data.last_name} — Norstar`,
            child: result.data,
            registrations,
            availableTeams,
        });
    } catch (error) {
        console.error('Child detail error:', error);
        res.status(500).render('404.njk', { title: 'Error Loading Details' });
    }
});

// ─── GET /dashboard/children/:id/info — read-only child info ───

router.get('/:id/info', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const childId = req.params.id;

    try {
        const result = await apiRequest<Record<string, unknown>>(
            `/api/children/${childId}`,
            { token }
        );

        if (!result.success || !result.data) {
            res.status(404).render('404.njk', { title: 'Child Not Found' });
            return;
        }

        res.render('dashboard/children/view.njk', {
            title: `${result.data.first_name} ${result.data.last_name} — Norstar`,
            child: result.data,
        });
    } catch (error) {
        console.error('Child info error:', error);
        res.status(500).render('404.njk', { title: 'Error Loading Details' });
    }
});

// ─── GET /dashboard/children/:id/edit — show edit form ──────

router.get('/:id/edit', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const childId = req.params.id;

    try {
        const result = await apiRequest<Record<string, unknown>>(
            `/api/children/${childId}`,
            { token }
        );

        if (!result.success || !result.data) {
            res.status(404).render('404.njk', { title: 'Child Not Found' });
            return;
        }

        res.render('dashboard/children/edit.njk', {
            title: `Edit ${result.data.first_name} — Norstar`,
            error: null,
            child: result.data,
        });
    } catch (error) {
        console.error('Child edit form error:', error);
        res.status(500).render('404.njk', { title: 'Error Loading Details' });
    }
});

// ─── POST /dashboard/children/:id/edit — submit edits ───────

router.post('/:id/edit', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const childId = req.params.id;
    const {
        first_name,
        last_name,
        gender,
        position,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        medical_conditions,
        allergies,
        photo_consent,
    } = req.body;

    // Honeypot check
    if (req.body.website) {
        res.redirect('/dashboard');
        return;
    }

    const childData = {
        first_name,
        last_name,
        gender,
        position,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        medical_conditions,
        allergies,
        photo_consent,
    };

    // Validation
    if (!first_name || !last_name) {
        res.render('dashboard/children/edit.njk', {
            title: 'Edit Child — Norstar',
            error: 'First name and last name are required.',
            child: { id: childId, ...childData },
        });
        return;
    }

    if (!emergency_contact_name || !emergency_contact_phone || !emergency_contact_relationship) {
        res.render('dashboard/children/edit.njk', {
            title: 'Edit Child — Norstar',
            error: 'All emergency contact details are required (name, phone, and relationship).',
            child: { id: childId, ...childData },
        });
        return;
    }

    if (!medical_conditions?.trim() || !allergies?.trim()) {
        res.render('dashboard/children/edit.njk', {
            title: 'Edit Child — Norstar',
            error: 'Medical conditions and allergies are required — enter "NA" if there are none.',
            child: { id: childId, ...childData },
        });
        return;
    }

    const result = await apiRequest<unknown>(`/api/children/${childId}`, {
        method: 'PUT',
        token,
        body: {
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            gender: gender || undefined,
            position: position || undefined,
            emergency_contact_name: emergency_contact_name.trim(),
            emergency_contact_phone: emergency_contact_phone.trim(),
            emergency_contact_relationship,
            medical_conditions: medical_conditions.trim(),
            allergies: allergies.trim(),
            photo_consent: photo_consent === 'on',
        },
    });

    if (!result.success) {
        res.render('dashboard/children/edit.njk', {
            title: 'Edit Child — Norstar',
            error: result.error || 'Failed to update child details.',
            child: { id: childId, ...childData },
        });
        return;
    }

    res.redirect(`/dashboard/children/${childId}`);
});

// ─── POST /dashboard/children/:id/delete — remove child ─────

router.post('/:id/delete', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const childId = req.params.id;

    // Honeypot check
    if (req.body.website) {
        res.redirect('/dashboard');
        return;
    }

    await apiRequest(`/api/children/${childId}`, {
        method: 'DELETE',
        token,
    });

    res.redirect('/dashboard');
});

// ─── GET /dashboard/children/:id/availability — view & form ─

interface AvailabilityRecord {
    id: string;
    child_id: string;
    game_id: string | null;
    availability_type: 'match' | 'training';
    event_date: string;
    status: 'available' | 'unavailable';
    reason: string | null;
    created_at?: string;
}

interface GameRecord {
    id: string;
    game_date: string;
    game_type: string;
    opponent?: string;
    home_team?: { id: string; name: string };
    away_team?: { id: string; name: string };
}

router.get('/:id/availability', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const childId = req.params.id;
    const showSuccess = req.query.success === '1';

    try {
        // Fetch child, availability records, and upcoming games in parallel
        const [childResult, availResult, gamesResult] = await Promise.all([
            apiRequest<Record<string, unknown>>(`/api/children/${childId}`, { token }),
            apiRequest<AvailabilityRecord[]>(`/api/availability?child_id=${childId}`, { token }),
            apiRequest<GameRecord[]>('/api/games', { token }),
        ]);

        if (!childResult.success || !childResult.data) {
            res.status(404).render('404.njk', { title: 'Child Not Found' });
            return;
        }

        res.render('dashboard/children/availability.njk', {
            title: `${childResult.data.first_name}'s Availability — Norstar`,
            child: childResult.data,
            records: availResult.data || [],
            games: gamesResult.data || [],
            values: {},
            success: showSuccess ? 'Availability submitted successfully.' : null,
        });
    } catch (error) {
        console.error('Availability page error:', error);
        res.status(500).render('404.njk', { title: 'Error Loading Availability' });
    }
});

// ─── POST /dashboard/children/:id/availability — submit ─────

router.post('/:id/availability', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const childId = req.params.id;

    // Honeypot check
    if (req.body.website) {
        res.redirect('/dashboard');
        return;
    }

    const { availability_type, event_date, status, game_id, reason } = req.body;
    const values = { availability_type, event_date, status, game_id, reason };

    // Basic validation
    if (!availability_type || !event_date || !status) {
        // Re-fetch context to re-render the page
        const [childResult, availResult, gamesResult] = await Promise.all([
            apiRequest<Record<string, unknown>>(`/api/children/${childId}`, { token }),
            apiRequest<AvailabilityRecord[]>(`/api/availability?child_id=${childId}`, { token }),
            apiRequest<GameRecord[]>('/api/games', { token }),
        ]);

        res.render('dashboard/children/availability.njk', {
            title: `Availability — Norstar`,
            child: childResult.data || { id: childId },
            records: availResult.data || [],
            games: gamesResult.data || [],
            values,
            error: 'Type, date, and status are required.',
        });
        return;
    }

    const result = await apiRequest<unknown>('/api/availability', {
        method: 'POST',
        token,
        body: {
            child_id: childId,
            availability_type,
            event_date,
            status,
            game_id: game_id || undefined,
            reason: reason?.trim() || undefined,
        },
    });

    if (!result.success) {
        // Re-fetch context on error
        const [childResult, availResult, gamesResult] = await Promise.all([
            apiRequest<Record<string, unknown>>(`/api/children/${childId}`, { token }),
            apiRequest<AvailabilityRecord[]>(`/api/availability?child_id=${childId}`, { token }),
            apiRequest<GameRecord[]>('/api/games', { token }),
        ]);

        res.render('dashboard/children/availability.njk', {
            title: `Availability — Norstar`,
            child: childResult.data || { id: childId },
            records: availResult.data || [],
            games: gamesResult.data || [],
            values,
            error: result.error || 'Failed to submit availability.',
        });
        return;
    }

    // Success — redirect back (PRG pattern)
    res.redirect(`/dashboard/children/${childId}/availability?success=1`);
});

// ─── POST /dashboard/children/:id/availability/:recordId/delete ─

router.post('/:id/availability/:recordId/delete', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const { id: childId, recordId } = req.params;

    // Honeypot check
    if (req.body.website) {
        res.redirect('/dashboard');
        return;
    }

    await apiRequest(`/api/availability/${recordId}`, {
        method: 'DELETE',
        token,
    });

    res.redirect(`/dashboard/children/${childId}/availability`);
});

export default router;
