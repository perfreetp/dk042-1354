/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'mro-blue': '#1e3a5f',
        'mro-blue-light': '#2c5282',
        'mro-orange': '#d97706',
        'mro-red': '#dc2626',
        'mro-green': '#16a34a',
        'mro-yellow': '#ca8a04',
      },
    },
  },
  plugins: [],
}
