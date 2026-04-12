import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#001F30",
        orange: {
          DEFAULT: "#FF6701",
          2: "#FF8C3A",
          light: "#FFF0E6",
        },
        cream: "#FBF7F3",
        gray: {
          1: "#EDE7E0",
          2: "#C4B8AE",
          3: "#7A6E68",
        },
        teal: {
          DEFAULT: "#0F6E56",
          light: "#D4EDE7",
          2: "#5DCAA5",
        },
        green: {
          DEFAULT: "#0F6E56",
          light: "#D4EDE7",
        },
        purpleL: "#EEEDFE",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-dm-serif)", "Georgia", "serif"],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        growBar: {
          from: { width: "0%" },
          to: { width: "var(--bar-pct, 23%)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.85)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.65s ease-out both",
        growBar: "growBar 1.4s ease-out forwards",
        pulseDot: "pulseDot 2s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
