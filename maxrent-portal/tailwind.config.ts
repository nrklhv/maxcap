import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /** Portal broker / evaluación crédito — paleta corporativa (navy, azul #2563eb, grises). */
        broker: {
          navy: "#0e1428",
          accent: "#2563eb",
          "accent-hover": "#1d4ed8",
          "accent-soft": "#eef2ff",
          canvas: "#f8f9fa",
          muted: "#4b5563",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-dm-serif)", "serif"],
      },
      keyframes: {
        catalogFadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "catalog-fade-up": "catalogFadeUp 0.35s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
