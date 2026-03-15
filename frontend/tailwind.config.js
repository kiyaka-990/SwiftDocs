/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          500: "#0071E3",
          600: "#0058b0",
          700: "#003d7a",
          900: "#001a33",
        },
        dark: {
          900: "#0a0a0f",
          800: "#111118",
          700: "#1d1d1f",
          600: "#2d2d30",
          500: "#3d3d42",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease-in-out",
        "slide-up":   "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 },              to: { opacity: 1 } },
        slideUp: { from: { transform: "translateY(16px)", opacity: 0 },
                   to:   { transform: "translateY(0)",    opacity: 1 } },
      },
    },
  },
  plugins: [],
}
