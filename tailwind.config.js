/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Urbanist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Grand Hotel"', 'cursive'],
      },
      colors: {
        // ——— Tokens de Jalon ———
        ink: '#12211D', // Encre — texte principal
        muted: '#6F7C75', // Texte secondaire

        // Neutres chauds : fonds, bordures, surfaces
        sand: {
          50: '#FFFDF8',
          100: '#FAF6EC', // Fond — crème
          200: '#F1EBDC', // pistes / puces
          300: '#EAE4D6', // Bordure
          400: '#D3CBB6',
        },

        // Vert pin — marque, validation, séries de données, écran de scan
        forest: {
          50: '#EAF3EF',
          100: '#DCEAE4', // Teinte verte (surface tint)
          200: '#BEDDD3',
          300: '#A7CEC3', // Série claire
          400: '#2E7C68', // Série médiane
          500: '#0F5044', // Vert pin — marque & validation
          600: '#0C4238', // survol / appui
          700: '#0A362E',
          800: '#0A2E28', // Vert profond — écran de scan
          900: '#0A2E28',
        },

        // Or — attente, action à traiter, accent
        amber: {
          50: '#FBEFCF', // Teinte or
          100: '#F8E4B0',
          200: '#F4D274',
          300: '#F2C14E', // Or
          400: '#E6B23C',
          500: '#D19E28', // remplissage bouton (texte blanc lisible)
          600: '#A87C1E',
          700: '#7E5D18',
        },

        // Rouge — refus
        danger: {
          50: '#F8E7E4',
          100: '#F1CEC8',
          400: '#D14E40',
          500: '#C0392B', // Refus
          600: '#9F2C20',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(18, 33, 29, 0.05)',
        soft: '0 1px 2px rgba(18, 33, 29, 0.04), 0 4px 14px -6px rgba(18, 33, 29, 0.10)',
        card: '0 1px 3px rgba(18, 33, 29, 0.04), 0 14px 32px -16px rgba(18, 33, 29, 0.16)',
        'card-lg': '0 10px 24px -12px rgba(18, 33, 29, 0.14), 0 32px 72px -28px rgba(18, 33, 29, 0.22)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
