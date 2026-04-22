/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        body:    ['Noto Serif', 'Georgia', 'serif'],
        ui:      ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: 'oklch(44% 0.14 152)',
          light:   'oklch(55% 0.12 152)',
          muted:   'oklch(90% 0.06 152)',
          dim:     'oklch(82% 0.09 152)',
        },
      },
    },
  },
  plugins: [],
}