import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14102B",
        surface: "#1E1840",
        surface2: "#241C4D",
        gold: "#F5B942",
        coral: "#FF4D6D",
        teal: "#2FD9C4",
        mist: "#A79FD1",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
