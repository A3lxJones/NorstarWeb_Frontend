import { Router, Request, Response } from 'express';
import { SITE_URL, PUBLIC_PAGES } from '../middleware/seo';

const router = Router();

router.get('/robots.txt', (_req: Request, res: Response) => {
    const body = [
        'User-agent: *',
        'Allow: /',
        'Disallow: /dashboard',
        'Disallow: /login',
        'Disallow: /signup',
        'Disallow: /logout',
        'Disallow: /forgot-password',
        'Disallow: /reset-password',
        'Disallow: /fixtures',
        'Disallow: /api',
        '',
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        '',
    ].join('\n');

    res.type('text/plain').send(body);
});

router.get('/sitemap.xml', (_req: Request, res: Response) => {
    const lastmod = new Date().toISOString().split('T')[0];

    const urls = PUBLIC_PAGES.map(
        (page) =>
            `  <url>\n` +
            `    <loc>${SITE_URL}${page.path === '/' ? '/' : page.path}</loc>\n` +
            `    <lastmod>${lastmod}</lastmod>\n` +
            `    <changefreq>${page.changefreq}</changefreq>\n` +
            `    <priority>${page.priority}</priority>\n` +
            `  </url>`
    ).join('\n');

    const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

    res.type('application/xml').send(xml);
});

export default router;
