/**
 * Norstar Inline Hockey Club — Theme Management
 * Handles light/dark mode switching with localStorage persistence
 * Respects prefers-color-scheme system setting
 */

const THEME_STORAGE_KEY = 'norstar-theme';
const DARK_THEME = 'norstar';
const LIGHT_THEME = 'norstar_light';

/**
 * Get the user's preferred theme
 * Priority:
 * 1. Stored preference in localStorage
 * 2. System preference via prefers-color-scheme
 * 3. Default to dark theme
 */
function getPreferredTheme() {
    // Check localStorage first
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === DARK_THEME || storedTheme === LIGHT_THEME) {
        return storedTheme;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return LIGHT_THEME;
    }

    // Default to dark theme
    return DARK_THEME;
}

/**
 * Apply theme to the document
 */
function applyTheme(theme) {
    const htmlElement = document.documentElement;
    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateThemeToggleUI(theme);
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    applyTheme(newTheme);
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
}

/**
 * Update the theme toggle button UI to reflect current theme
 */
function updateThemeToggleUI(theme) {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;

    const isDarkMode = theme === DARK_THEME;
    
    // Update ARIA label
    toggleBtn.setAttribute('aria-label', isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
    
    // Update button content (SVG icons)
    const svgContainer = toggleBtn.querySelector('svg') || toggleBtn;
    
    if (isDarkMode) {
        // Show moon icon for dark mode (click to switch to light)
        toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.64 15.95c-.18-.8-.46-1.58-.84-2.32.02-.04.07-.16.12-.28a5.5 5.5 0 0 0-6.72-6.72c-.12.05-.24.1-.28.12-.74-.38-1.52-.66-2.32-.84C13.05 2.35 14.47 1 16 1a9 9 0 0 1 0 18c-1.53 0-2.95-1.35-3.2-3.05zM9.5 13a3.5 3.5 0 0 1-3.5-3.5A3.5 3.5 0 0 1 9.5 6a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5z"/>
            </svg>
        `;
    } else {
        // Show sun icon for light mode (click to switch to dark)
        toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a1 1 0 011 1v4a1 1 0 11-2 0V3a1 1 0 011-1zm0 14a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1zm10-9a1 1 0 11-2 0v-4a1 1 0 012 0v4zM2 12a1 1 0 111 1H2a1 1 0 110-2zm5.64-7.64a1 1 0 011.41 0l2.83 2.83a1 1 0 11-1.41 1.41L6.22 5.78a1 1 0 010-1.41zm10 10a1 1 0 011.41 0l2.83 2.83a1 1 0 11-1.41 1.41l-2.83-2.83a1 1 0 010-1.41zM5.78 17.78a1 1 0 011.41 0l2.83 2.83a1 1 0 11-1.41 1.41L5.78 19.2a1 1 0 010-1.41zm10-10a1 1 0 011.41 0l2.83 2.83a1 1 0 11-1.41 1.41l-2.83-2.83a1 1 0 010-1.41zM12 6a6 6 0 100 12 6 6 0 000-12zm0 10a4 4 0 110-8 4 4 0 010 8z"/>
            </svg>
        `;
    }
}

/**
 * Listen for system theme preference changes
 */
function setupSystemThemeListener() {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    // Handle both old and new API
    const handleChange = (e) => {
        // Only apply if user hasn't explicitly set a preference
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
            const preferredTheme = e.matches ? LIGHT_THEME : DARK_THEME;
            applyTheme(preferredTheme);
        }
    };

    if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
        // Fallback for older browsers
        mediaQuery.addListener(handleChange);
    }
}

/**
 * Initialize theme on page load
 */
function initTheme() {
    const preferredTheme = getPreferredTheme();
    applyTheme(preferredTheme);
    setupSystemThemeListener();
    attachThemeToggleListener();
}

/**
 * Attach click listener to theme toggle button
 */
function attachThemeToggleListener() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}
