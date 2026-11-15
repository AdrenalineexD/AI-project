/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f2fcf5',
          100: '#e2faea',
          200: '#c5f2d3',
          300: '#96e5b0',
          400: '#5ecd85',
          500: '#38b261',
          600: '#27924c',
          700: '#21743f',
          800: '#1e5c35',
          900: '#1a4c2d',
          950: '#0b2a16',
        },
        charcoal: {
          50: '#f7f7f7',
          100: '#e3e3e3',
          200: '#c8c8c8',
          300: '#a4a4a4',
          400: '#818181',
          500: '#666666',
          600: '#515151',
          700: '#434343',
          800: '#282828',
          900: '#181818',
          950: '#0d0d0d',
        },
        risk: {
          low: '#3b82f6',      // Blue
          medium: '#eab308',   // Amber
          high: '#f97316',     // Orange
          critical: '#ef4444', // Red
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
