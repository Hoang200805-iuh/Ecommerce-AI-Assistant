/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6366f1', dark: '#4f46e5', light: '#818cf8' },
        secondary: '#10b981',
        accent: '#f59e0b',
        danger: '#ef4444',
        surface: { DEFAULT: '#1a1a2e', 2: '#16213e', 3: '#0d0d1a' },
        border: 'rgba(99,102,241,0.2)',
      },
      fontFamily: { inter: ['Inter', 'system-ui', 'sans-serif'] },
      fontSize: {
        'xs':   ['0.8rem',  { lineHeight: '1.25rem' }],
        'sm':   ['0.925rem', { lineHeight: '1.5rem' }],
        'base': ['1rem',    { lineHeight: '1.6rem' }],
        'lg':   ['1.15rem', { lineHeight: '1.75rem' }],
        'xl':   ['1.3rem',  { lineHeight: '1.85rem' }],
        '2xl':  ['1.6rem',  { lineHeight: '2rem' }],
        '3xl':  ['2rem',    { lineHeight: '2.25rem' }],
        '4xl':  ['2.5rem',  { lineHeight: '2.75rem' }],
        '5xl':  ['3.1rem',  { lineHeight: '1' }],
        '6xl':  ['3.75rem', { lineHeight: '1' }],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6366f1, #a855f7)',
        'gradient-hero': 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      },
    },
  },
  plugins: [],
}