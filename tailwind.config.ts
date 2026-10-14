import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cherry: { 300: '#ffc2de', 400: '#ff8cc0', 500: '#ff5fa2', 600: '#ff3d8b', 700: '#c81e6c', 900: '#4a0f33' },
        night: { 950: '#0a0716', 900: '#130d26', 800: '#1d1438' },
      },
      fontFamily: {
        display: ['var(--font-display, ui-sans-serif)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body, ui-sans-serif)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: { glow: '0 0 60px rgba(255,95,162,.35)' },
    },
  },
  plugins: [],
};
export default config;
