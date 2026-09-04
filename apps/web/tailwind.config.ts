import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bcdfff',
          300: '#8ecaff',
          400: '#59acff',
          500: '#2f7dff',
          600: '#1d5bf5',
          700: '#1a48d6',
          800: '#1c3cac',
          900: '#1c3688',
          950: '#152253',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e2',
          300: '#b1b8c6',
          // Was #8590a5 — failed WCAG 2 AA color-contrast (axe-core: 3.02-3.22:1
          // against white/#f7f8fa, needs 4.5:1) wherever used as text, which the
          // "text-ink-400" convention does across the app for muted/secondary
          // copy (breadcrumbs, empty states, timestamps, etc.). #647089 clears
          // 4.5:1 on both white and #f7f8fa; kept it close to the original hue
          // rather than jumping to ink-500 so it stays visually distinct from
          // the darker end of the scale as much as the contrast floor allows.
          400: '#647089',
          500: '#66718a',
          600: '#515b72',
          700: '#424a5d',
          800: '#2c3140',
          900: '#14161d',
          950: '#0b0c10',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        surface: '0 1px 2px 0 rgb(20 22 29 / 0.04), 0 1px 3px 0 rgb(20 22 29 / 0.06)',
        popover: '0 8px 24px -4px rgb(20 22 29 / 0.12), 0 2px 8px -2px rgb(20 22 29 / 0.08)',
        floating: '0 16px 48px -12px rgb(20 22 29 / 0.22), 0 4px 16px -4px rgb(20 22 29 / 0.12)',
        // Premium button elevation — soft, on-brand colored shadows.
        'button-primary': '0 4px 14px -2px rgb(29 91 245 / 0.28), 0 1px 3px 0 rgb(29 91 245 / 0.15)',
        'button-primary-hover': '0 8px 20px -4px rgb(29 91 245 / 0.35), 0 2px 6px -1px rgb(29 91 245 / 0.2)',
        'button-danger': '0 4px 14px -2px rgb(220 38 38 / 0.25), 0 1px 3px 0 rgb(220 38 38 / 0.12)',
        'button-danger-hover': '0 8px 20px -4px rgb(220 38 38 / 0.32), 0 2px 6px -1px rgb(220 38 38 / 0.18)',
      },
      borderRadius: {
        // Radius scale: sm controls ~8-10px, md controls ~10px, cards/panels
        // ~14-16px, modals/sheets ~20-24px. `xl2` kept for back-compat.
        xl2: '1.125rem',
        control: '0.625rem', // 10px — inputs, small buttons, chips
        surface: '0.875rem', // 14px — cards, panels
        panel: '1rem', // 16px — larger cards/panels
        sheet: '1.25rem', // 20px — dropdowns, popovers
        overlay: '1.5rem', // 24px — modals, dialogs
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.18s ease-out',
        'scale-in': 'scale-in 0.12s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
