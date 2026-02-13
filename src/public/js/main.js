/**
 * Norstar Inline Hockey Club — Client-side JavaScript
 * Handles: scroll-reveal animations, counter animation, active nav highlighting
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initCounterAnimation();
    highlightActiveNav();
    initLoginModal();
});

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
   Login Modal
   ═══════════════════════════════════════════ */
function initLoginModal() {
    var loginBtn = document.getElementById('login-btn');
    var loginModal = document.getElementById('login-modal');

    if (!loginBtn || !loginModal) return;

    loginBtn.addEventListener('click', function () {
        loginModal.showModal();
    });

    // Close on Escape key (dialog handles this natively, but just in case)
    loginModal.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            loginModal.close();
        }
    });
}
