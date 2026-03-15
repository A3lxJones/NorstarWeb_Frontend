/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/views/**/*.njk", "./src/public/js/**/*.js"],
    theme: {
        extend: {
            fontFamily: {
                heading: ['"Oswald"', 'sans-serif'],
                body: ['"Inter"', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.6s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
                'fade-in-left': 'fadeInLeft 0.6s ease-out forwards',
                'fade-in-right': 'fadeInRight 0.6s ease-out forwards',
                'slide-down': 'slideDown 0.4s ease-out forwards',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-30px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                fadeInRight: {
                    '0%': { opacity: '0', transform: 'translateX(30px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(168, 85, 247, 0.4)' },
                    '50%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.8)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
        },
    },
    plugins: [require("daisyui")],
    daisyui: {
        themes: [
            {
                norstar: {
                    "primary": "#3b1d8e",
                    "primary-content": "#f0e6ff",
                    "secondary": "#a855f7",
                    "secondary-content": "#1a0533",
                    "accent": "#f59e0b",
                    "accent-content": "#1a0533",
                    "neutral": "#2e1065",
                    "neutral-content": "#d4bfff",
                    "base-100": "#13091f",
                    "base-200": "#1c1133",
                    "base-300": "#2a1a4e",
                    "base-content": "#e8dff5",
                    "info": "#a78bfa",
                    "success": "#22c55e",
                    "warning": "#f59e0b",
                    "error": "#ef4444",
                },
            },
            {
                norstar_light: {
                    "primary": "#3b1d8e",
                    "primary-content": "#f0e6ff",
                    "secondary": "#7c3aed",
                    "secondary-content": "#faf5ff",
                    "accent": "#f59e0b",
                    "accent-content": "#1a0533",
                    "neutral": "#6366f1",
                    "neutral-content": "#f3f4f6",
                    "base-100": "#ffffff",
                    "base-200": "#f3f4f6",
                    "base-300": "#e5e7eb",
                    "base-content": "#1f2937",
                    "info": "#818cf8",
                    "success": "#16a34a",
                    "warning": "#ea580c",
                    "error": "#dc2626",
                },
            },
        ],
    },
};
