/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Modern dark theme colors - balanced like Cursor/ChatGPT/Discord
        chatgpt: {
          dark: '#1e1e1e',        // VS Code/Cursor dark background
          darker: '#2d2d30',      // Card/panel background - slightly lighter
          darkest: '#181818',     // Deepest areas
          light: '#3e3e42',       // Hover states
          lighter: '#484848',     // Interactive elements
          border: '#454545',      // Visible but subtle borders
          text: '#cccccc',        // Comfortable white text
          textSecondary: '#969696', // Muted text - more readable
          accent: '#14b8a6',      // Beautiful teal for currency theme
          accentHover: '#0d9488', // Darker teal on hover
        }
      }
    },
  },
  plugins: [],
}
