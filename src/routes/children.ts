import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { apiRequest } from '../utils/api';

const router = Router();

// All children routes require authentication
router.use(requireAuth);

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

export default router;
