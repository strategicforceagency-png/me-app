/** @type {import('tailwindcss').Config} */
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: v("primary"), fg: v("primary-fg"), soft: v("gold-tint") },
        gold: { DEFAULT: v("gold"), tint: v("gold-tint") },
        ongold: v("on-gold"),
        burgundy: v("burgundy"),
        hero: v("hero"),
        herofg: v("hero-fg"),
        ink: v("fg"),
        muted: v("muted"),
        line: v("line"),
        bg: v("bg"),
        surface: v("surface"),
        card: v("subtle"),
        sidebar: { DEFAULT: v("sidebar"), active: v("sidebar-active") },
        danger: { DEFAULT: v("danger"), tint: v("danger-tint") },
      },
      fontFamily: {
        sans: ["Figtree", "Inter", "-apple-system", "system-ui", "sans-serif"],
        display: ["'Libre Caslon Display'", "'Libre Caslon Text'", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(20 16 10 / .04), 0 6px 20px -6px rgb(20 16 10 / .10)",
        pill: "0 8px 22px -8px rgb(var(--glow) / .55)",
        dock: "0 12px 32px -12px rgb(0 0 0 / .45)",
      },
    },
  },
  plugins: [],
};
