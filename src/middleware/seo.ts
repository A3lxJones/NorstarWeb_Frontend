import { Request, Response, NextFunction } from 'express';

/** Absolute origin used for canonical URLs, sitemap entries and Open Graph tags. */
export const SITE_URL = (process.env.SITE_URL || 'https://www.norstarinline.com').replace(/\/+$/, '');

/** Default social sharing image (must be an absolute URL for OG/Twitter). */
export const DEFAULT_OG_IMAGE = '/images/NorstarTeams.png';

/** Site-wide fallback description used when a route does not supply one. */
export const DEFAULT_DESCRIPTION =
    "Norstar Inline Hockey Club in Ballymena, Co. Antrim. Junior U12/U14 inline hockey teams and Learn to Skate sessions for children across Northern Ireland.";

/**
 * Route prefixes that must never appear in search results — the member area,
 * authentication flows and anything behind a login.
 */
const NOINDEX_PREFIXES = [
    '/dashboard',
    '/login',
    '/signup',
    '/logout',
    '/forgot-password',
    '/reset-password',
    '/fixtures',
    '/api',
];

/** Public pages included in sitemap.xml, with relative crawl priority. */
export const PUBLIC_PAGES: { path: string; changefreq: string; priority: string }[] = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/learn-to-skate', changefreq: 'monthly', priority: '0.9' },
    { path: '/news', changefreq: 'weekly', priority: '0.8' },
    { path: '/contact', changefreq: 'monthly', priority: '0.8' },
    { path: '/sponsors', changefreq: 'monthly', priority: '0.6' },
    { path: '/shop', changefreq: 'monthly', priority: '0.5' },
    { path: '/privacy-policy', changefreq: 'yearly', priority: '0.3' },
];

function isNoIndex(pathname: string): boolean {
    return NOINDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Turn a URL segment such as "learn-to-skate" into "Learn To Skate". */
function humanise(segment: string): string {
    return segment
        .replace(/[^a-zA-Z0-9-]/g, '')
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function buildBreadcrumbs(pathname: string): { name: string; url: string }[] {
    const crumbs = [{ name: 'Home', url: `${SITE_URL}/` }];
    if (pathname === '/') {
        return crumbs;
    }

    let accumulated = '';
    for (const segment of pathname.split('/').filter(Boolean)) {
        accumulated += `/${segment}`;
        crumbs.push({ name: humanise(segment), url: `${SITE_URL}${accumulated}` });
    }
    return crumbs;
}

/**
 * Injects canonical URL, robots directive and social-sharing defaults into every
 * rendered template. Individual routes may override `description`, `ogImage` and
 * `ogType` by passing them to res.render.
 */
export function injectSeo(req: Request, res: Response, next: NextFunction): void {
    const pathname = req.path.replace(/\/+$/, '') || '/';

    res.locals.siteUrl = SITE_URL;
    res.locals.canonicalUrl = `${SITE_URL}${pathname}`;
    res.locals.robots = isNoIndex(pathname) ? 'noindex, nofollow' : 'index, follow';
    res.locals.defaultDescription = DEFAULT_DESCRIPTION;
    // Relative — templates prefix it with siteUrl to build the absolute OG URL.
    res.locals.defaultOgImage = DEFAULT_OG_IMAGE;
    res.locals.breadcrumbs = buildBreadcrumbs(pathname);

    next();
}
