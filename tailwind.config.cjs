/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          base: '#0f766e',
          blue: '#2563eb',
          amber: '#f59f0b'
        }
      },
      fontFamily: {
        sans: ['"Geist"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Geist"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        card: '0 12px 28px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};
