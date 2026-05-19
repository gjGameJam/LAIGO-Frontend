/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html',
  ],
  // (src/legacy was deleted; the glob above is the active surface.)
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        LegoThick: ['LegoThick', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        Nunito: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brick: {
          yellow: '#FFD700',
          yellowLight: '#FFE866',
          yellowDark: '#E5BE00',
        },
        // Indigo Plum palette — hue ~252°, deeper and more indigo than
        // Tailwind's default violet. Pairs with LEGO yellow as a "gold +
        // royal plum" duo — premium / LEGO Architecture-line feel. Anchors:
        //   400 (dark-mode primary), 500 (glow base), 600 (light-mode primary)
        violet: {
          50:  '#F0EDFB',
          100: '#E2DCF7',
          200: '#C8BDEF',
          300: '#B5A5E8',
          400: '#9B85F0',
          500: '#6B55DC',
          600: '#5B3FBF',
          700: '#48319A',
          800: '#382678',
          900: '#281A55',
          950: '#170E33',
        },
      },
    },
  },
  plugins: [],
}
