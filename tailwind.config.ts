import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        emerald: {
          // Grayscale remap while preserving the emerald token name for compatibility
          "50": "#f9fafb",  // near white
          "100": "#f3f4f6",  // very light gray
          "200": "#e5e7eb",  // light gray
          "300": "#d1d5db",  // gray
          "400": "#9ca3af",  // medium gray
          "500": "#6b7280",  // base gray
          "600": "#4b5563",  // dark gray
          "700": "#374151",  // darker gray
          "800": "#1f2937",  // very dark gray
          "900": "#111827"   // near black
        },
        // TUC Layout Compatibility Tokens (Grayscale Mapped)
        "solar-green": "#1f2937",    // Mapped to emerald-800
        "solar-gold": "#9ca3af",     // Mapped to emerald-400
        "solar-gold-light": "#e5e7eb", // Mapped to emerald-200
        "solar-night": "#021210",    // Deep black (TUC original)
        "solar-accent": "#ffffff",   // White for high contrast accent
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
export default config;