import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sunset: {
          50: "#fff5ed",
          100: "#ffe8d4",
          200: "#ffcda8",
          300: "#ffa970",
          400: "#ff7a37",
          500: "#ff5610",
          600: "#f03d06",
          700: "#c72d07",
          800: "#9e250e",
          900: "#7f220f",
        },
        dusk: {
          700: "#3b2a5a",
          800: "#2b1f43",
          900: "#1d1530",
          950: "#120d20",
        },
        fairway: {
          400: "#4caf7d",
          500: "#2e9e64",
          600: "#217a4c",
          700: "#1b5e3b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "sunset-sky":
          "linear-gradient(135deg, #1d1530 0%, #3b2a5a 30%, #9e250e 70%, #ff7a37 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
