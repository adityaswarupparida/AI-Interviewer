import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        mono:    ['"IBM Plex Mono"', "Menlo", "monospace"],
      },
      colors: {
        void: "#07080d",
        ink:  { DEFAULT: "#0d1018", 2: "#111620" },
      },
    },
  },
  plugins: [],
};

export default config;
