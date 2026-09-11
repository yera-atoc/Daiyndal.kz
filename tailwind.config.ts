import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        board: {
          DEFAULT: '#1F3D34',
          light: '#2C5044',
          dark: '#152B24',
        },
        paper: '#EFF3EA',
        card: '#F8F7F0',
        ink: '#16241F',
        mustard: '#E7A94C',
        coral: '#D65F4C',
        sky: '#5B93A3',
      },
      fontFamily: {
        serif: ['var(--font-pt-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        hand: ['var(--font-caveat)', 'cursive'],
      },
      backgroundImage: {
        chalk: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.04), transparent 40%)',
      },
    },
  },
  plugins: [],
}
export default config
