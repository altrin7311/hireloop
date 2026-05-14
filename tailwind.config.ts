import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        hl: {
          bg: "#F5FFFE",
          surface: "#E0F9FA",
          "surface-raised": "#FFFFFF",
          border: "#B2EDEC",
          "border-subtle": "#D4F5F5",
          accent: "#00B8D9",
          "accent-hover": "#0097B2",
          "accent-light": "#E0F9FA",
          "text-primary": "#0C1A1C",
          "text-secondary": "#5A9EA8",
          "text-tertiary": "#8ABCC4",
          "warning-bg": "#FFF5E0",
          "warning-text": "#A05E00",
          "warning-border": "#FFDEA0",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
