# Copilot Instructions — Norstar Inline Hockey Club

## Project Overview

This is the **Norstar Inline Hockey Club** website for a youth inline hockey club based in **Ballymena, Northern Ireland**. The site is built with Express.js, Nunjucks templates, TypeScript, and Tailwind CSS + DaisyUI.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Server     | Express.js v4 (TypeScript)          |
| Templates  | Nunjucks (autoescape enabled)       |
| Styling    | Tailwind CSS v3 + DaisyUI v4        |
| Build      | TypeScript compiler + Tailwind CLI  |
| Runtime    | Node.js                             |

---

## Security — Start as We Mean to Go On

Security is a **first-class concern** in this project. Every feature, route, and template must follow these rules:

### Server Security

- **Helmet** is configured with a strict Content Security Policy (CSP). All inline `<script>` tags must use the `nonce="{{ cspNonce }}"` attribute. Never add `'unsafe-inline'` to `scriptSrc`.
- **`'unsafe-inline'`** is only permitted for `styleSrc` because Tailwind/DaisyUI requires it. Do not add it anywhere else.
- **Rate limiting** is enforced globally (200 req/15min) and on form endpoints (15 req/15min). Any new POST route handling user input **must** have the form rate limiter applied.
- **Body parser limits** are set to 10kb. Do not increase without justification.
- **`x-powered-by`** header is disabled. Never re-enable it.
- **Trust proxy** is enabled in production for correct client IP detection behind reverse proxies.

### Template Security

- Nunjucks **autoescape is ON**. Never use the `| safe` filter on user-supplied data.
- Always use `{{ variable }}` — never `{{ variable | safe }}` unless the content is developer-controlled HTML.
- All forms must include:
  - `action` attribute pointing to a real route (never `#`)
  - `method="POST"`
  - `novalidate` (we validate server-side)
  - A **honeypot field**: `<input type="text" name="website" tabindex="-1" autocomplete="off" />` hidden with CSS
  - `maxlength` attributes on all text inputs
  - `autocomplete` attributes for browser autofill

### Input Validation

- **Never trust client-side validation alone.** All input must be validated and sanitised on the server.
- Email fields: `maxlength="254"`, `type="email"`, `autocomplete="email"`
- Password fields: `minlength="8"`, `autocomplete="current-password"` or `"new-password"`
- Message/textarea fields: `maxlength="2000"`
- Name fields: `maxlength="100"`

### Authentication (Future)

- Passwords must be hashed with **bcrypt** (minimum 12 salt rounds).
- Sessions must use **httpOnly**, **secure**, and **sameSite** cookie flags.
- Implement CSRF tokens on all state-changing forms when session management is added.
- Role-based access control (RBAC) for members vs coaches.

### Headers & Meta

- Base layout includes security meta tags: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `referrer: strict-origin-when-cross-origin`.
- `<meta name="robots">` is set per-page.
- CSP nonce is generated per-request using `crypto.randomBytes(16)`.

---

## Theme & Design System

### Brand Colours (DaisyUI "norstar" theme)

| Token       | Hex       | Usage                              |
|-------------|-----------|------------------------------------|
| `primary`   | `#3b1d8e` | Deep purple — headings, accents    |
| `secondary` | `#a855f7` | Bright purple — buttons, links, highlights |
| `accent`    | `#f59e0b` | Amber/gold — calls to action, badges |
| `base-100`  | `#13091f` | Darkest background                 |
| `base-200`  | `#1c1133` | Card backgrounds                   |
| `base-300`  | `#2a1a4e` | Borders, subtle surfaces           |
| `base-content` | `#e8dff5` | Primary text colour              |

### Typography

- **Headings**: `font-heading` → Oswald (Google Fonts), uppercase is optional, bold weight.
- **Body text**: `font-body` → Inter (Google Fonts), regular weight.
- Brand name rendering: `<span class="text-secondary">NOR</span>STAR` — always use this pattern.

### Design Patterns

- **Cards**: Use `bg-base-200 border border-base-300` with `shadow-xl` or `shadow-2xl`. Cards often have a gradient top bar.
- **Buttons**: Primary actions use `btn btn-secondary`. Outline variants with `btn-outline btn-secondary`. Always add `hover:scale-[1.02]` or `hover:scale-105` for micro-interactions.
- **Gradient blobs**: Background decoration uses large blurred circles (`w-72 h-72 bg-secondary/5 rounded-full blur-3xl animate-float`).
- **Scroll reveal**: Add `scroll-reveal opacity-0` class to elements that should animate in on scroll. The `main.js` IntersectionObserver handles the rest.
- **Badges**: Use `badge-home` (secondary) and `badge-away` (accent) for fixture status.
- **Section structure**: Each page section uses `<section class="py-16 md:py-24">` with a container `max-w-7xl mx-auto px-4`.

### Icons

- Use **Heroicons** (outline style) via inline SVG. Standard size: `h-5 w-5` for buttons, `h-6 w-6` for standalone.
- No icon font libraries — inline SVGs only for CSP compliance.

---

## Code Architecture

### File Structure

```
src/
├── app.ts              # Express app setup, middleware, routes
├── server.ts           # Server entry point (listen)
├── routes/             # One file per route group
│   ├── index.ts        # GET / → home.njk
│   ├── fixtures.ts     # GET /fixtures → fixtures.njk
│   ├── news.ts         # GET /news → news.njk
│   ├── contact.ts      # GET /contact → contact.njk
│   └── login.ts        # GET /login → login.njk
├── views/
│   ├── layouts/
│   │   └── base.njk    # Master layout (all pages extend this)
│   ├── partials/
│   │   ├── navbar.njk  # Sticky top nav with mobile menu
│   │   └── footer.njk  # 4-column footer
│   ├── home.njk
│   ├── fixtures.njk
│   ├── news.njk
│   ├── contact.njk
│   ├── login.njk
│   └── 404.njk
└── public/
    ├── css/
    │   ├── input.css    # Tailwind source (custom layers)
    │   └── output.css   # Generated (do not edit)
    └── js/
        └── main.js      # Client-side JS (scroll-reveal, counters, nav)
```

### Route Conventions

- Each route file exports an Express `Router`.
- Route files render their Nunjucks template with a `title` variable at minimum.
- Data that will come from an API later is passed as hardcoded arrays/objects for now.
- All template variables are passed explicitly — never use `res.locals` for page data.

### TypeScript

- **Strict mode** is enabled. Do not disable any strict checks.
- Target: ES2020, Module: CommonJS
- Output directory: `./dist` (gitignored)
- Always type function parameters and return types explicitly.

### CSS

- **Never edit `output.css` directly** — it is generated by Tailwind CLI.
- Add custom styles to `input.css` using `@layer base`, `@layer components`, or `@layer utilities`.
- Prefer Tailwind utility classes in templates over custom CSS.
- Respect `prefers-reduced-motion` — a media query in `input.css` disables animations for users who prefer reduced motion.

### JavaScript (Client-Side)

- `main.js` runs in the browser. Keep it minimal — no frameworks.
- All `<script>` tags must include `nonce="{{ cspNonce }}"`.
- No inline event handlers (`onclick`, `onsubmit`, etc.) — they violate CSP.
- Use `addEventListener` exclusively.

---

## Build & Development

```bash
npm run dev         # Watch mode (TypeScript + Tailwind + nodemon)
npm run build       # Production build (CSS minify + TypeScript compile)
npm start           # Run compiled output from dist/
```

---

## Accessibility

- All images must have `alt` attributes (even placeholders: `alt=""`).
- Form inputs must have associated `<label>` elements with matching `for`/`id`.
- Interactive elements must be keyboard-accessible.
- Colour contrast follows WCAG AA against the dark theme background.
- Reduced motion is respected via `prefers-reduced-motion` media query.

---

## Content Tone

- The club serves **youth players** and families — keep language friendly, inclusive, and encouraging.
- Hockey-themed puns are welcome in informal contexts (404 page, loading states).
- Location references: **Ballymena**, **Northern Ireland**.
- Programmes: U13 Inline Hockey, Learn to Skate.

---

## Do Not

- Add any npm package without justification for security impact.
- Use `eval()`, `new Function()`, or `document.write()`.
- Store secrets in source code — use environment variables.
- Disable TypeScript strict mode or ESLint rules.
- Use `innerHTML` with user data — use `textContent` instead.
- Add external scripts from CDNs without adding their domain to the CSP.
