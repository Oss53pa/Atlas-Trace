/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Dosis', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Grand Hotel"', 'cursive'],
      },
      colors: {
        // ——— Palette Atlas Studio « Vert Volt & Olive » ———
        ink: '#16170F', // Texte — encre principale
        muted: '#6A6B5F', // Texte secondaire

        // Neutres Atlas Studio : fonds, bordures, surfaces
        sand: {
          50: '#FBFBF6',
          100: '#F4F4ED', // Fond
          200: '#ECECE3', // Surface alt / pistes / puces
          300: '#E0E0D3', // Bordure
          400: '#C7C7B6',
        },

        // Olive — marque, validation, séries de données, écran de scan
        forest: {
          50: '#F0F2E1',
          100: '#E4E8C9', // Teinte olive (surface tint)
          200: '#CDD69F',
          300: '#AEBE6A', // Série claire
          400: '#7E9330', // Série médiane
          500: '#5C6B12', // Accent olive — marque & validation
          600: '#3E4A0C', // Accent foncé — survol / appui
          700: '#333D0A',
          800: '#282C20', // Ink — écran de scan / surface profonde
          900: '#282C20',
        },

        // Volt — signature électrique Atlas Studio (aplat + texte ink)
        volt: {
          DEFAULT: '#D2FF00',
          100: '#ECFF9E',
          600: '#7E9A00',
        },

        // Or — attente, action à traiter (couleur fonctionnelle, conservée)
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
