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
        // ChatGPT-inspired dark theme colors
        chatgpt: {
          dark: '#343541',
          darker: '#202123',
          darkest: '#1a1a1a',
          light: '#444654',
          lighter: '#565869',
          border: '#565869',
          text: '#ececf1',
          textSecondary: '#8e8ea0',
          accent: '#10a37f',
          accentHover: '#0d8c6d',
        }
      }
    },
  },
  plugins: [],
}
