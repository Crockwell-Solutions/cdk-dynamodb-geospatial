/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'temp-cold': '#3B82F6',
        'temp-cool': '#06B6D4',
        'temp-mild': '#10B981',
        'temp-warm': '#F59E0B',
        'temp-hot': '#EF4444',
      }
    },
  },
  plugins: [],
}