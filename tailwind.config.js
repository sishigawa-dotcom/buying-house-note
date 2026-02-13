/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Cinzel', 'serif'],
        serif: ['Noto Serif SC', 'Songti SC', 'serif'],
        sans: ['Lato', 'PingFang SC', 'sans-serif'],
      }
    },
  },
  plugins: [],
}