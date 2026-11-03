import type { Config } from 'tailwindcss';

// Tokens semánticos (ver app/globals.css para los valores y el por qué de
// cada uno). Nunca colores sueltos en componentes — siempre estas clases
// (bg-surface, text-muted, bg-accent, etc.), igual que en Vault.
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        subtle: 'var(--text-subtle)',
        // rgb(var(...) / <alpha-value>) habilita modificadores de opacidad
        // (bg-accent/10, hover:bg-accent/90) aunque el color venga de una
        // variable CSS.
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-soft': 'var(--accent-soft)',
        'accent-fg': 'var(--accent-fg)',
        positive: 'var(--positive)',
        'positive-soft': 'var(--positive-soft)',
        warning: 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
        'danger-soft': 'var(--danger-soft)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
    },
  },
  plugins: [],
};

export default config;
