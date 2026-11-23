import type { Config } from "tailwindcss";

// Palette per DESIGN.md. Legacy scale names (momo/slate/emerald/red/amber) are remapped onto the
// TrustLoop tokens so existing components adopt the design system without touching every class.
// Every shade used for text on light surfaces was measured >= 4.5:1 (see DESIGN.md).
// shortcut: legacy names kept as aliases, rename to semantic names (navy/seafoam/signal) when components are next touched.
const shiftBlueScale = {
  50: "#eef3fd",
  100: "#dde7fb",
  200: "#bccff7",
  300: "#8fb0f0",
  400: "#4d82e6",
  500: "#0b57d0",
  600: "#111a4a",
  700: "#0d1438",
  800: "#0a1029",
  900: "#070b1d",
};

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // DESIGN.md: minimum text size anywhere is 13px (Tailwind default xs is 12px).
      fontSize: { xs: ["0.8125rem", { lineHeight: "1.125rem" }] },
      colors: {
        // Brand: navy for structure, Shift Blue (from ShiftGen logo) for interactive emphasis.
        momo: { ...shiftBlueScale, primary: "#111a4a", accent: "#0b57d0" },
        // Info/pending badges (sky, indigo) share the brand blue scale.
        sky: shiftBlueScale,
        indigo: shiftBlueScale,
        // Neutrals: canvas, hairlines, Steel 600 muted text, Slate Ink body, navy headings.
        slate: {
          50: "#f6f6f8",
          100: "#eef0f3",
          200: "#e3e4e8",
          300: "#c4c6cd",
          400: "#9a9ea8",
          500: "#5b5e68",
          600: "#4a4d56",
          700: "#3b3e47",
          800: "#23262f",
          900: "#161a24",
          950: "#0c0f16",
        },
        // Safe / verified / data.
        emerald: {
          50: "#e8f6f1",
          100: "#d1eee3",
          200: "#a7dcc8",
          300: "#6fc3a6",
          400: "#44b48b",
          500: "#167e6c",
          600: "#13705f",
          700: "#0f5c4e",
          800: "#0c4a3f",
          900: "#083830",
          950: "#04211c",
        },
        // Signal: hold / high risk — from the ShiftGen arrow.
        signal: {
          50: "#fdf0e9",
          100: "#fbe0d3",
          200: "#f7c3a8",
          300: "#f2a07a",
          400: "#ec652b",
          500: "#c2410c",
          600: "#b93c13",
          700: "#9a3412",
          800: "#7c2d12",
          900: "#5c210d",
          950: "#341307",
        },
        // Errors only (form/API failures) — never for risk or hold state (that is `signal`).
        red: {
          50: "#fef3f2",
          100: "#fee4e2",
          200: "#fecdca",
          300: "#fda29b",
          400: "#f97066",
          500: "#c4261a",
          600: "#b42318",
          700: "#912018",
          800: "#7a271a",
          900: "#55160c",
          950: "#2b0a05",
        },
        amber: {
          50: "#fdf6e3",
          100: "#fbeec4",
          200: "#f6dc8c",
          300: "#f0c75a",
          400: "#f8b858",
          500: "#9c6600",
          600: "#8a5a00",
          700: "#6f4800",
          800: "#573800",
          900: "#3f2800",
          950: "#241700",
        },
        shift: { blue: "#0b57d0", cyan: "#00d8f8" },
        canvas: "#f6f6f8",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
