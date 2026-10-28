/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        auf: {
          dark: '#0B132B',
          navy: '#1C2541',
          surface: '#1E293B',
          accent: '#3A86FF',
          danger: '#E63946',
          warning: '#F59E0B',
          success: '#10B981',
          gold: '#FFD166',
        },
        miramar: {
          black: '#121212',
          white: '#FFFFFF',
          accent: '#475569',
        }
      }
    },
  },
  plugins: [],
}
