import type { Config } from 'tailwindcss';

// Calcado de la paleta actual de La Terraza (apps/web, rama main): colores de
// siempre con el acento naranja de Grupo Cesco, superficies sin borde con
// sombra difusa y radios amplios. No hay modo oscuro — La Terraza tampoco lo
// tiene en esta sección.
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#151912', // negro/verdoso oscuro principal (header, botón principal, cursor)
        bone: '#ededed', // claro neutro (fondo)
        ash: '#a6a6a6', // gris medio: líneas e íconos, nunca texto sobre claro
        accent: {
          DEFAULT: '#d68509', // barras, botones (texto en tinta), anillos de foco, pestañas
          light: '#f0a030', // texto o detalles sobre fondo oscuro
          ink: '#9c5a06', // texto sobre fondo claro (eyebrow, enlaces)
        },
        white: '#ffffff',
        'ash-ink': '#666666', // texto secundario sobre fondo claro
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-sans)'],
      },
      borderRadius: {
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 14px 30px rgba(21, 25, 18, 0.06)',
        'card-hover': '0 18px 40px rgba(21, 25, 18, 0.09)',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(.2,.7,.1,1)',
      },
    },
  },
  plugins: [],
};

export default config;
