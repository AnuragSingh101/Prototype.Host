/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#1e1e1e',
          header: '#2d3748',
          border: '#4a5568',
        }
      },
      fontFamily: {
        mono: ['Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      animation: {
        pulse: 'pulse 2s infinite',
      }
    },
  },
  plugins: [],
}
