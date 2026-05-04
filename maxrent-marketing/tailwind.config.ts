import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#001F30",
        cream: "#FBF7F3",
        orange: {
          DEFAULT: "#FF6701",
          2: "#FF8C3A",
          light: "#FFF0E6",
        },
        "brand-cream": "#EDE0CC",
        gray: {
          1: "#EDE7E0",
          2: "#C4B8AE",
          3: "#7A6E68",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-dm-serif)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
