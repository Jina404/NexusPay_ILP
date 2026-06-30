import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        hero: {
          DEFAULT: 'var(--hero)',
          foreground: 'var(--hero-foreground)',
          muted: 'var(--hero-muted)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          warm: 'var(--accent-warm)'
        },
        border: 'var(--border)',
        ring: 'var(--ring)'
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px'
      },
      screens: {
        xs: '475px'
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #00b86b 0%, #4dd998 100%)'
      }
    }
  },
  plugins: []
}

export default config
