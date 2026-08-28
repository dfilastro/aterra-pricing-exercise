import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F3EEE6",
        paper: "#FBF8F3",
        ink: "#2A241C",
        muted: "#7A7166",
        line: "#E4D9C8",
        terracotta: "#B85C3A",
        "terracotta-deep": "#8E432E",
        sage: "#3F6B52",
        "sage-soft": "#E6F0EA",
        danger: "#A33B2C",
        "danger-soft": "#F6E4DE",
        warn: "#9A6B2F",
        "warn-soft": "#F4EBD8",
        sidebar: "#EDE6DA",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(42, 36, 28, 0.04), 0 8px 24px rgba(42, 36, 28, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
