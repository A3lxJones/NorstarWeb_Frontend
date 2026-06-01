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
    items?: UserChild[];
    rows?: UserChild[];
    totalChildren?: number;
}

interface UserListPayload {
    data?: UserRecord[];
    items?: UserRecord[];
    rows?: UserRecord[];
}

// ─── GET /dashboard/users — list all users ──────────────────

router.get('/', async (req: Request, res: Response) => {
    const token = req.session.accessToken!;
    const roleFilter = (req.query.role as string) || ''; // Empty string = all roles
    const search = (req.query.search as string) || '';

    try {
        // Build query params for the API
        const params = new URLSearchParams();
        if (roleFilter) params.set('role', roleFilter);
        if (search) params.set('search', search);

        const queryString = params.toString();
        const endpoint = `/api/admin/users${queryString ? `?${queryString}` : ''}`;

        const result = await apiRequest<UserRecord[] | UserListPayload>(endpoint, { token });
        const payload = result.data;
        const rootUsers = Array.isArray(payload)
            ? payload
            : payload?.data || payload?.items || payload?.rows || [];

        const users = (Array.isArray(rootUsers) ? rootUsers : []).map((user) => {
            const normalizedChildren = user.children || user.items || user.rows || [];
            return {
                ...user,
                children: Array.isArray(normalizedChildren) ? normalizedChildren : [],
            };
        });

        const totalChildren = users.reduce(
            (sum, user) => sum + (typeof user.totalChildren === 'number' ? user.totalChildren : user.children.length),
            0
        );

        res.render('dashboard/users/index.njk', {
            title: 'Manage Users — Norstar',
            users,
            totalChildren,
            roleFilter,
            search,
        });
    } catch (error) {
        console.error('Users list error:', error);
        res.render('dashboard/users/index.njk', {
            title: 'Manage Users — Norstar',
            users: [],
            totalChildren: 0,
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
        const result = await apiRequest<UserRecord | { data?: UserRecord; item?: UserRecord; row?: UserRecord }>(
            `/api/admin/users/${userId}`,
            { token }
        );

        const payload = result.data;
        const member = (payload && 'id' in (payload as Record<string, unknown>))
            ? (payload as UserRecord)
            : ((payload as { data?: UserRecord; item?: UserRecord; row?: UserRecord })?.data ||
                (payload as { data?: UserRecord; item?: UserRecord; row?: UserRecord })?.item ||
                (payload as { data?: UserRecord; item?: UserRecord; row?: UserRecord })?.row);

        const normalizedChildren = member?.children || member?.items || member?.rows || [];
        const normalizedMember = member
            ? {
                ...member,
                children: Array.isArray(normalizedChildren) ? normalizedChildren : [],
                totalChildren:
                    typeof member.totalChildren === 'number'
                        ? member.totalChildren
                        : (Array.isArray(normalizedChildren) ? normalizedChildren.length : 0),
            }
            : null;

        if (!result.success || !normalizedMember) {
            res.status(404).render('404.njk', { title: 'User Not Found' });
            return;
        }

        res.render('dashboard/users/detail.njk', {
            title: `${normalizedMember.full_name} — Norstar`,
            member: normalizedMember,
            roleUpdated: req.query.roleUpdated === '1',
            roleError: (req.query.roleError as string) || null,
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
        res.redirect(`/dashboard/users/${userId}?roleError=Invalid+role+selected`);
        return;
    }

    const result = await apiRequest(`/api/admin/users/${userId}`, {
        method: 'PUT',
        token,
        body: { role },
    });

    if (!result.success) {
        const message = encodeURIComponent(result.error || 'Failed to update role. Please try again.');
        res.redirect(`/dashboard/users/${userId}?roleError=${message}`);
        return;
    }

    res.redirect(`/dashboard/users/${userId}?roleUpdated=1`);
});

export default router;
