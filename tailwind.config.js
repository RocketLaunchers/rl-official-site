import plugin from 'tailwindcss/plugin';

/** Semantic color tokens backed by CSS variables (see src/index.css), so the
 *  whole site re-themes by flipping `data-theme` on <html>. The `<alpha-value>`
 *  placeholder keeps Tailwind's `/opacity` modifiers working (e.g. border-line/10). */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        canvas: token('--c-canvas'),       // page background (black / sky-blue); also glass + fallback
        surface: token('--c-surface'),     // raised card/panel fill
        'surface-2': token('--c-surface-2'),// card hover / elevated fill
        well: token('--c-well'),           // media well behind photos/video
        ink: token('--c-ink'),             // primary text (white / dark gray)
        'ink-soft': token('--c-ink-soft'), // body copy
        'ink-muted': token('--c-ink-muted'),// secondary text
        'ink-faint': token('--c-ink-faint'),// meta / muted
        line: token('--c-line'),           // hairline border base (used at low alpha)
        accent: token('--c-accent'),       // cyan accent
        solid: token('--c-solid'),         // inverted CTA surface
        'on-solid': token('--c-on-solid'), // text on the inverted CTA
      },
    },
  },
  plugins: [
    // `light:` applies only under the light theme — used for the few effects
    // (white glows, inverted CTAs) that must change when the background is light.
    plugin(({ addVariant }) => {
      addVariant('light', ':is([data-theme="light"]) &');
    }),
  ],
};
