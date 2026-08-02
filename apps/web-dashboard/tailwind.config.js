/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19', // Deep slate/navy from reference
        surface: '#111827', // Slate 900
        surfaceHighlight: '#1F2937', // Slate 800
        primary: '#6366F1', // Indigo 500 (Anthropic style blurples)
        primaryHover: '#4F46E5', // Indigo 600
        success: '#10B981', // Emerald 500 for success states
        warning: '#F59E0B', // Amber
        danger: '#EF4444', // Red for Critical findings
        textMain: '#F8FAFC', // Ivory/Slate 50
        textMuted: '#94A3B8', // Slate 400
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
        serif: ['Merriweather', 'serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'grid-scroll': 'gridScroll 40s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        gridScroll: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(32px)' }, // exactly one grid cell size
        }
      }
    },
  },
  plugins: [],
}
