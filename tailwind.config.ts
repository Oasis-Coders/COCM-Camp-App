import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'DM Serif Display'", 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', "'Segoe UI'", 'sans-serif'],
      },
      colors: {
        camp: {
          cream: '#faf6ee',
          forest: '#0f3d2e',
          'forest-light': '#1a5c43',
          moss: '#4f7a5c',
          sand: '#f4e8c1',
          ember: '#d26a39',
          'ember-dark': '#b8532b',
          'ember-light': '#f9e0d0',
          sky: '#d9edf6',
        },
      },
      boxShadow: {
        card: 'rgba(15,61,46,0.03) 0px 0px 0px 1px, rgba(15,61,46,0.05) 0px 2px 8px, rgba(15,61,46,0.10) 0px 8px 24px',
        'card-hover': 'rgba(15,61,46,0.08) 0px 4px 16px',
        panel: '0 18px 60px rgba(15, 61, 46, 0.14)',
        'ember-glow': '0 2px 8px rgba(210,106,57,0.25)',
      },
      borderRadius: {
        card: '20px',
        panel: '28px',
      },
    },
  },
  plugins: [],
};

export default config;
