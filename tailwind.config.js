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
        // ——— Tokens de repère Atlas Trace ———
        ink: '#1A241D', // Encre — texte principal
        muted: '#6B7A6E', // Texte secondaire

        // Neutres chauds : fonds, bordures, surfaces
        sand: {
          50: '#FBFCFA',
          100: '#F4F6F1', // Fond
          200: '#E9EDE5', // pistes / puces
          300: '#DDE4D9', // Bordure
          400: '#C3CCBD',
        },

        // Vert — marque, validation, ET séries de données (300/400)
        forest: {
          50: '#EDF4EC',
          100: '#E4EFE2', // Teinte de surface
          200: '#C9E3CC',
          300: '#A9D3AE', // Série claire
          400: '#6FB07C', // Série médiane
          500: '#2F6B45', // Vert profond — marque & validation
          600: '#265838', // survol / appui
          700: '#1E462C',
          800: '#183A25',
          900: '#16281B',
        },

        // Ambre — attente, action à traiter, accent
        amber: {
          50: '#FCF4E4',
          100: '#F8E6C4',
          200: '#F2CE8E',
          300: '#EEBB63',
          400: '#E8A33D', // Ambre — attente & action à traiter
          500: '#D08C29',
          600: '#AC711F',
          700: '#83571A',
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
        card: '0 1px 2px rgba(26, 36, 29, 0.04), 0 8px 24px rgba(26, 36, 29, 0.06)',
        'card-lg': '0 4px 8px rgba(26, 36, 29, 0.05), 0 16px 40px rgba(26, 36, 29, 0.08)',
      },
    },
  },
  plugins: [],
};
