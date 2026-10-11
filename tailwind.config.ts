import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cherry: { 300: '#ffc2cd', 400: '#ff7a93', 500: '#ff5c7c', 600: '#e11d48', 700: '#be123c', 900: '#4c0519' },
        wine: { 950: '#0e050a', 900: '#160910', 800: '#21101a' },
      },
      fontFamily: {
        display: ['var(--font-display, ui-sans-serif)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body, ui-sans-serif)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: { glow: '0 0 60px rgba(255,92,124,.28)' },
    },
  },
  plugins: [],
};
export default config;
