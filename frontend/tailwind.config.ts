import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Celo brand palette
        celo: {
          green: "#35D07F",
          gold: "#FBCC5C",
          purple: "#6C4FA0",
          dark: "#1E002B",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-fire": "bounce 0.8s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
