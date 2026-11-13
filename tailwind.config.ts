import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette KARANG-DULAA
        forest: { DEFAULT: "#126B4B", 50: "#E8F3EE", 100: "#CFE7DC", 200: "#9FCFB9", 300: "#6CB594", 400: "#3A9A70", 500: "#126B4B", 600: "#0F5A3F", 700: "#0C4832", 800: "#093626", 900: "#06241A" },
        gold: { DEFAULT: "#D6A84B", 50: "#FBF5E8", 100: "#F5E7C7", 200: "#EDD497", 300: "#E3BF6B", 400: "#D6A84B", 500: "#B98B30", 600: "#936E25", 700: "#6E521C" },
        sand: { DEFAULT: "#F7F3E9", 100: "#FBF9F3", 200: "#F7F3E9", 300: "#EDE5D2", 400: "#DCCFB2" },
        ink: { DEFAULT: "#202A26", 600: "#3A4641", 500: "#55625C", 400: "#77847E" },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Noto Sans", "Ubuntu", "Helvetica Neue", "Arial", "sans-serif"],
        serif: ["Georgia", "Cambria", "Noto Serif", "Times New Roman", "serif"],
      },
      backgroundImage: {
        // motif géométrique mandingue discret (losanges)
        "kd-pattern":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M16 2 30 16 16 30 2 16Z' fill='none' stroke='%23D6A84B' stroke-opacity='.18' stroke-width='1.2'/%3E%3Cpath d='M16 10 22 16 16 22 10 16Z' fill='%23D6A84B' fill-opacity='.10'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [typography],
} satisfies Config;
