import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        momo: {
          50: "#FDF2F8",
          100: "#FCE7F3",
          200: "#FBCFE8",
          300: "#F9A8D4",
          400: "#F472B6",
          500: "#D82D8B",
          600: "#A50064",
          700: "#83004F",
          800: "#63003B",
          900: "#4A002B",
          primary: "#A50064",
          accent: "#D82D8B",
        },
      },
      fontFamily: {
        sans: ["var(--font-be-vietnam)", "Be Vietnam Pro", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
