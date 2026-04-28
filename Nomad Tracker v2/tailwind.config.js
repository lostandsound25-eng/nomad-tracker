/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        ios: {
          bg: '#F2F2F7',
          surface: '#FFFFFF',
          text: '#000000',
          muted: '#8E8E93',
          border: '#C6C6C8',
          blue: '#007AFF',
          red: '#FF3B30'
        }
      }
    },
  },
  plugins: [],
}
