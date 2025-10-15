/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRITICAL: This content array must list all directories that contain your Tailwind classes
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", 
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
