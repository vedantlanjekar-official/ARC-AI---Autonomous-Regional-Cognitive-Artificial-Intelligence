/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6', // Lighter blue (blue-500)
        'steel-blue': '#4682B4', // Steel Blue for cards
        danger: '#f85149',
        success: '#3fb950',
        warning: '#d29922',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}


