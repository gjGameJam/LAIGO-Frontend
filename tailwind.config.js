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
      },
    },
  },
  plugins: [],
}
