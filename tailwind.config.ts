import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#F7F5F7',
          100: '#EFECEF',
          200: '#E1DBE3',
          300: '#C8BFCC',
          400: '#998F9F',
          500: '#786D7E',
          600: '#635769',
          700: '#504356',
          800: '#403146',
          900: '#322438',
          950: '#24182A',
        },
        atelier: {
          canvas: '#F7F6F2',
          surface: '#FFFEFB',
          subtle: '#EEECE7',
          obsidian: '#322438',
          ink: '#322438',
          muted: '#746D76',
          border: '#E1DDD8',
          vermilion: '#6A496B',
          cobalt: '#76618B',
          jade: '#526645',
          amber: '#95603D',
          citron: '#D9EDAA',
          lilac: '#EAE3EF',
        },
        gauth: {
          red: '#6A496B',
          coral: '#946F89',
          dark: '#322438',
          surface: '#F7F6F2',
          border: '#E1DDD8',
          blue: '#76618B',
          emerald: '#526645',
          amber: '#95603D',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(2.35rem, 4vw, 3.5rem)', { lineHeight: '1.08', letterSpacing: '-0.035em', fontWeight: '700' }],
        'h1': ['clamp(2rem, 3.5vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.045em', fontWeight: '600' }],
        'h2': ['clamp(1.3rem, 1.8vw, 1.65rem)', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h3': ['1.0625rem', { lineHeight: '1.4', letterSpacing: '-0.012em', fontWeight: '600' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.7' }],
        'body': ['1rem', { lineHeight: '1.7' }],
        'caption': ['0.8125rem', { lineHeight: '1.5' }],
        'micro': ['0.725rem', { lineHeight: '1.4', letterSpacing: '0.06em' }],
      },
      boxShadow: {
        'elevation-1': '0 2px 4px rgba(50, 36, 56, 0.025)',
        'elevation-2': '0 8px 24px -12px rgba(50, 36, 56, 0.10)',
        'elevation-3': '0 20px 48px -24px rgba(50, 36, 56, 0.16)',
        studio: '0 4px 20px -12px rgba(50, 36, 56, 0.10)',
        'studio-lg': '0 20px 48px -24px rgba(50, 36, 56, 0.16)',
        'studio-accent': '0 4px 12px -6px rgba(50, 36, 56, 0.2)',
      },
    },
  },
  plugins: [],
};
export default config;
