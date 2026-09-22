/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        chrome: "rgb(var(--chrome) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        risk: {
          normal: "rgb(var(--risk-normal) / <alpha-value>)",
          moderate: "rgb(var(--risk-moderate) / <alpha-value>)",
          severe: "rgb(var(--risk-severe) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(3, 8, 20, 0.35), 0 12px 32px -18px rgba(3, 8, 20, 0.8)",
        drawer: "-24px 0 64px -24px rgba(3, 8, 20, 0.7)",
      },
      keyframes: {
        "severe-pulse": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(var(--risk-severe), 0.55)" },
          "50%": { opacity: "0.9", boxShadow: "0 0 0 5px rgba(var(--risk-severe), 0)" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "drawer-in": {
          from: { transform: "translateX(24px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "severe-pulse": "severe-pulse 1.2s ease-in-out infinite",
        "soft-pulse": "soft-pulse 1.6s ease-in-out infinite",
        "drawer-in": "drawer-in 180ms ease-out",
        "fade-in": "fade-in 160ms ease-out",
      },
    },
  },
  plugins: [],
};
