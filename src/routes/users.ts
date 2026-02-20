import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { apiRequest } from '../utils/api';

const router = Router();

// All user management routes require admin role
router.use(requireAuth);
router.use(requireRole('admin'));

// ─── Interfaces ─────────────────────────────────────────────

interface UserChild {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    skill_level?: string;
    position?: string;
}

interface UserRecord {
    id: string;
    email: string;
    full_name: string;
    role: string;
    phone?: string;
    created_at?: string;
    children?: UserChild[];
}

// ─── GET /dashboard/users — list all users ──────────────────

router.get('/', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const roleFilter = (req.query.role as string) || '';
    const search = (req.query.search as string) || '';

    try {
        // Build query params for the API
        const params = new URLSearchParams();
        if (roleFilter) params.set('role', roleFilter);
        if (search) params.set('search', search);

        const queryString = params.toString();
        const endpoint = `/api/admin/users${queryString ? `?${queryString}` : ''}`;

        const result = await apiRequest<UserRecord[]>(endpoint, { token });

        res.render('dashboard/users/index.njk', {
            title: 'Manage Users — Norstar',
            users: result.data || [],
            roleFilter,
            search,
        });
    } catch (error) {
        console.error('Users list error:', error);
        res.render('dashboard/users/index.njk', {
            title: 'Manage Users — Norstar',
            users: [],
            error: 'Unable to load users.',
            roleFilter: '',
            search: '',
        });
    }
});

// ─── GET /dashboard/users/:id — user detail (with children) ─

router.get('/:id', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const userId = req.params.id;

    try {
        const result = await apiRequest<UserRecord>(
            `/api/admin/users/${userId}`,
            { token }
        );

        if (!result.success || !result.data) {
            res.status(404).render('404.njk', { title: 'User Not Found' });
            return;
        }

        res.render('dashboard/users/detail.njk', {
            title: `${result.data.full_name} — Norstar`,
            member: result.data,
        });
    } catch (error) {
        console.error('User detail error:', error);
        res.status(500).render('404.njk', { title: 'Error Loading User' });
    }
});

// ─── POST /dashboard/users/:id/role — change user role ──────

router.post('/:id/role', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const userId = req.params.id;
    const { role } = req.body;

    // Honeypot check
    if (req.body.website) {
        res.redirect('/dashboard/users');
        return;
    }

    if (!role || !['parent', 'coach', 'admin'].includes(role)) {
        res.redirect(`/dashboard/users/${userId}`);
        return;
    }

    await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        token,
        body: { role },
    });

    res.redirect(`/dashboard/users/${userId}`);
});

export default router;
