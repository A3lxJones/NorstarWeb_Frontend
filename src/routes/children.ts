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
    date_of_birth: string;
    skill_level?: string;
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

        const result = await apiRequest<ChildRecord[]>(endpoint, { token });

        res.render('dashboard/children/index.njk', {
            title: 'Registered Children — Norstar',
            children: result.data || [],
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
        });
    } catch (error) {
        console.error('Admin child detail error:', error);
        res.status(500).render('404.njk', { title: 'Error Loading Details' });
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
        date_of_birth,
        skill_level,
        position,
        emergency_contact_name,
        emergency_contact_phone,
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
        date_of_birth,
        skill_level,
        position,
        emergency_contact_name,
        emergency_contact_phone,
        medical_conditions,
        allergies,
        photo_consent,
    };

    // Validation
    if (!first_name || !last_name || !date_of_birth) {
        res.render('dashboard/children/add.njk', {
            title: 'Add Child — Norstar',
            error: 'First name, last name, and date of birth are required.',
            values,
        });
        return;
    }

    if (!emergency_contact_name || !emergency_contact_phone) {
        res.render('dashboard/children/add.njk', {
            title: 'Add Child — Norstar',
            error: 'Emergency contact details are required.',
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
            date_of_birth,
            skill_level: skill_level || undefined,
            position: position || undefined,
            emergency_contact_name: emergency_contact_name.trim(),
            emergency_contact_phone: emergency_contact_phone.trim(),
            medical_conditions: medical_conditions?.trim() || undefined,
            allergies: allergies?.trim() || undefined,
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
        const result = await apiRequest<Record<string, unknown>>(
            `/api/children/${childId}`,
            { token }
        );

        if (!result.success || !result.data) {
            res.status(404).render('404.njk', { title: 'Child Not Found' });
            return;
        }

        res.render('dashboard/children/detail.njk', {
            title: `${result.data.first_name} ${result.data.last_name} — Norstar`,
            child: result.data,
        });
    } catch (error) {
        console.error('Child detail error:', error);
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
        date_of_birth,
        skill_level,
        position,
        emergency_contact_name,
        emergency_contact_phone,
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
        date_of_birth,
        skill_level,
        position,
        emergency_contact_name,
        emergency_contact_phone,
        medical_conditions,
        allergies,
        photo_consent,
    };

    // Validation
    if (!first_name || !last_name || !date_of_birth) {
        res.render('dashboard/children/edit.njk', {
            title: 'Edit Child — Norstar',
            error: 'First name, last name, and date of birth are required.',
            child: { id: childId, ...childData },
        });
        return;
    }

    if (!emergency_contact_name || !emergency_contact_phone) {
        res.render('dashboard/children/edit.njk', {
            title: 'Edit Child — Norstar',
            error: 'Emergency contact details are required.',
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
            date_of_birth,
            skill_level: skill_level || undefined,
            position: position || undefined,
            emergency_contact_name: emergency_contact_name.trim(),
            emergency_contact_phone: emergency_contact_phone.trim(),
            medical_conditions: medical_conditions?.trim() || undefined,
            allergies: allergies?.trim() || undefined,
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
    status: 'available' | 'unavailable' | 'tentative';
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
