import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          lime: 'var(--accent)',
          950: '#090b09',
        },
        canvas: 'var(--background)',
        surface: 'var(--surface)',
        raised: 'var(--surface-raised)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        line: 'var(--line)',
      },
      boxShadow: {
        glow: '0 0 36px rgba(198, 255, 61, 0.16)',
        'glow-strong': '0 0 42px rgba(198, 255, 61, 0.3)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.065em',
      },
      borderRadius: {
        panel: '1.5rem',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 32s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
