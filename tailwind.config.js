/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: "#1E5EFF", soft: "#E8EFFF" }, ink: "#111113", muted: "#8A8A8E", line: "#ECECEF", bg: "#F5F5F7", card: "#F2F2F4" },
      fontFamily: { sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "SF Pro Display", "system-ui", "sans-serif"] },
      boxShadow: { soft: "0 1px 2px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.05)", pill: "0 6px 18px rgba(30,94,255,.35)" },
    },
  },
  plugins: [],
};
