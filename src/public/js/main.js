/**
 * Norstar Inline Hockey Club — Client-side JavaScript
 * Handles: scroll-reveal animations, counter animation, active nav highlighting
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initCounterAnimation();
    highlightActiveNav();
    initCookieBanner();
    initLoginModal();
    initInteractionGuards();
});

/* ═══════════════════════════════════════════
   Interaction Guards (CSP-safe replacements for inline handlers)
   - data-confirm="msg"      on a form/submit button → confirm() before submit
   - data-close-modal="id"   on a button → closes the <dialog id="id">
   ═══════════════════════════════════════════ */
function initInteractionGuards() {
    // Confirmation prompts on form submission.
    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!form || form.tagName !== 'FORM') return;
        var message =
            (e.submitter && e.submitter.getAttribute('data-confirm')) ||
            form.getAttribute('data-confirm');
        if (message && !window.confirm(message)) {
            e.preventDefault();
        }
    });

    // Close a <dialog> from a plain button.
    document.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-close-modal]');
        if (!trigger) return;
        var dialog = document.getElementById(trigger.getAttribute('data-close-modal'));
        if (dialog && typeof dialog.close === 'function') dialog.close();
    });
}

/* ═══════════════════════════════════════════
   Scroll Reveal — IntersectionObserver
   ═══════════════════════════════════════════ */
function initScrollReveal() {
    const elements = document.querySelectorAll('.scroll-reveal');

    if (!elements.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // Respect any inline animation-delay via the style attribute
                    const delay = entry.target.style.animationDelay || '0s';
                    entry.target.style.animationDelay = delay;
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target); // only animate once
                }
            });
        },
        {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px',
        }
    );

    elements.forEach((el) => observer.observe(el));
}

/* ═══════════════════════════════════════════
   Counter Animation
   ═══════════════════════════════════════════ */
function initCounterAnimation() {
    const counters = document.querySelectorAll('.counter');

    if (!counters.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.5 }
    );

    counters.forEach((counter) => observer.observe(counter));
}

function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-target') || '0', 10);
    const duration = 2000; // ms
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);

        el.textContent = current.toLocaleString() + (target >= 2000 ? '' : '+');

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = target.toLocaleString() + (target >= 2000 ? '' : '+');
        }
    }

    requestAnimationFrame(update);
}

/* ═══════════════════════════════════════════
   Active Nav Highlighting
   ═══════════════════════════════════════════ */
function highlightActiveNav() {
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar a[href]');

    navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http')) return;

        // Match exact path or root
        if (
            (path === '/' && href === '/') ||
            (path !== '/' && href !== '/' && path.startsWith(href))
        ) {
            link.classList.add('nav-active');
        }
    });
}

/* ═══════════════════════════════════════════
   Cookie Consent Banner
   ═══════════════════════════════════════════ */
function initCookieBanner() {
    var banner = document.getElementById('cookie-banner');
    var acceptBtn = document.getElementById('cookie-accept');

    if (!banner || !acceptBtn) return;

    // Slide the banner in after a short delay
    setTimeout(function () {
        banner.classList.remove('translate-y-full');
        banner.classList.add('translate-y-0');
    }, 1000);

    acceptBtn.addEventListener('click', function () {
        banner.classList.remove('translate-y-0');
        banner.classList.add('translate-y-full');

        // Remove from DOM after transition
        banner.addEventListener('transitionend', function () {
            banner.remove();
        }, { once: true });
    });
}

/* ═══════════════════════════════════════════
   Login Modal
   ═══════════════════════════════════════════ */
function initLoginModal() {
    var loginBtn = document.getElementById('login-btn');
    var loginModal = document.getElementById('login-modal');

    if (!loginModal) return;

    // Nav button opens modal
    if (loginBtn) {
        loginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            loginModal.showModal();
        });
    }

    // Also allow any element with data-open-login to trigger it
    var triggers = document.querySelectorAll('[data-open-login]');
    triggers.forEach(function (el) {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            loginModal.showModal();
        });
    });

    // Auto-show after a short delay
    setTimeout(function () {
        // Don't show if user is on /login or /signup page already
        var path = window.location.pathname;
        if (path === '/login' || path === '/signup') return;

        loginModal.showModal();
    }, 3000);

    // Close on Escape key (dialog handles this natively, but just in case)
    loginModal.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            loginModal.close();
        }
    });
}

