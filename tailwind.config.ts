import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1D1D1F",
          soft: "#6E6E73",
          faint: "#86868B",
        },
        line: "#D2D2D7",
        paper: {
          DEFAULT: "#FFFFFF",
          tint: "#F5F5F7",
          card: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#0071E3",
          hover: "#0077ED",
          soft: "#E8F1FE",
          deep: "#0058B0",
        },
      },
      fontFamily: {
        display: ["var(--font-inter)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
        card: "0 1px 3px rgba(0,0,0,0.04)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
    },
  },
  plugins: [],
};

export default config;
