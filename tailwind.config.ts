import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        camp: {
          forest: "#0f3d2e",
          moss: "#4f7a5c",
          sand: "#f4e8c1",
          ember: "#d26a39",
          sky: "#d9edf6"
        }
      },
      boxShadow: {
        panel: "0 18px 60px rgba(15, 61, 46, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
